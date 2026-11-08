create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('invitation', 'link', 'diary', 'announcement')),
  title text not null check (length(btrim(title)) between 1 and 120),
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc, id desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
create policy notifications_select_own on public.notifications for select to authenticated
using (user_id = (select auth.uid()) and exists (
  select 1 from public.profiles where id = user_id and app_private.has_role(role)
));

create function public.mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.notifications set read_at = coalesce(read_at, now())
  where id = p_notification_id and user_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = user_id and app_private.has_role(role));
  if not found then
    raise exception 'notification_unavailable' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create function app_private.notify_account(p_user_id uuid, p_kind text, p_title text, p_body text)
returns void language sql security definer set search_path = ''
as $$
  insert into public.notifications (user_id, kind, title, body)
  select id, p_kind, p_title, p_body from public.profiles
  where id = p_user_id and deletion_requested_at is null;
$$;
revoke all on function app_private.notify_account(uuid, text, text, text) from public, anon, authenticated;

create function public.publish_announcement(p_title text, p_body text, p_role public.app_role default null)
returns integer language plpgsql security definer set search_path = ''
as $$
declare affected integer;
begin
  if p_title is null or length(btrim(p_title)) not between 1 and 120
    or p_body is null or length(btrim(p_body)) not between 1 and 2000 then
    raise exception 'invalid_announcement' using errcode = '22023';
  end if;
  insert into public.notifications (user_id, kind, title, body)
  select id, 'announcement', btrim(p_title), btrim(p_body) from public.profiles
  where deletion_requested_at is null and (p_role is null or role = p_role);
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.publish_announcement(text, text, public.app_role) from public, anon, authenticated;
grant execute on function public.publish_announcement(text, text, public.app_role) to service_role;

create function app_private.notify_invitation_event()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or (new.status = 'pending' and new.expires_at is distinct from old.expires_at) then
    perform app_private.notify_account(new.patient_id, 'invitation', 'Convite de acompanhamento',
      'Você recebeu um convite de um psicólogo. Consulte Convites para aceitar ou recusar e revisar o compartilhamento dos seus relatos.');
  elsif new.status is distinct from old.status then
    if new.status in ('accepted', 'declined') then
      perform app_private.notify_account(new.psychologist_id, 'invitation', 'Resposta ao convite',
        case when new.status = 'accepted'
          then 'Uma paciente aceitou seu convite. Consulte a lista de pacientes vinculadas.'
          else 'Uma paciente recusou seu convite. O convite não concede acesso aos relatos.' end);
    elsif new.status = 'revoked' then
      perform app_private.notify_account(new.patient_id, 'invitation', 'Convite cancelado',
        'Um convite de acompanhamento foi cancelado pelo psicólogo. Seus relatos continuam disponíveis para você.');
    end if;
  end if;
  return new;
end;
$$;
create trigger invitation_notifications after insert or update on public.patient_invitations
for each row execute function app_private.notify_invitation_event();

create function app_private.notify_link_event()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.psychologist_id is not null then
      perform app_private.notify_account(old.psychologist_id, 'link', 'Acompanhamento encerrado',
        'Uma conta de paciente foi excluída. Seus relatos não estão mais disponíveis.');
    end if;
    return old;
  end if;
  if old.psychologist_id is not distinct from new.psychologist_id then return new; end if;
  if old.psychologist_id is not null then
    perform app_private.notify_account(old.psychologist_id, 'link', 'Vínculo encerrado',
      'Um vínculo de acompanhamento foi encerrado. Você não tem mais acesso aos relatos dessa paciente.');
  end if;
  if new.psychologist_id is null then
    perform app_private.notify_account(new.user_id, 'link', 'Sem vínculo com psicólogo',
      case when not exists (select 1 from public.profiles
        where id = old.psychologist_id and deletion_requested_at is null)
        then 'A conta do seu psicólogo foi excluída. Seus relatos foram preservados e você pode continuar usando seu diário.'
        else 'Seu vínculo foi encerrado. O psicólogo não tem mais acesso aos seus relatos. Você pode continuar usando seu diário.' end);
  else
    perform app_private.notify_account(new.user_id, 'link', 'Vínculo de acompanhamento ativo',
      'O psicólogo vinculado pode consultar seus relatos e áudios anteriores e futuros enquanto o vínculo existir.');
  end if;
  return new;
end;
$$;
create trigger link_notifications after update or delete on public.patient_profiles
for each row execute function app_private.notify_link_event();

create function app_private.notify_new_diary_entry()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform app_private.notify_account(patient.psychologist_id, 'diary', 'Novo relato disponível',
    'Uma paciente vinculada criou um relato. Consulte a lista de pacientes para acompanhar.')
  from public.patient_profiles as patient where patient.user_id = new.patient_id;
  return new;
end;
$$;
create trigger new_diary_notification after insert on public.diary_entries
for each row execute function app_private.notify_new_diary_entry();
revoke all on function app_private.notify_invitation_event() from public, anon, authenticated;
revoke all on function app_private.notify_link_event() from public, anon, authenticated;
revoke all on function app_private.notify_new_diary_entry() from public, anon, authenticated;
