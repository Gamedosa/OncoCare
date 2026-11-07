create table public.diary_audio_deletion_queue (
  entry_id uuid primary key,
  patient_id uuid not null references public.patient_profiles(user_id) on delete cascade,
  audio_path text not null,
  created_at timestamptz not null default now()
);

alter table public.diary_audio_deletion_queue enable row level security;
revoke all on public.diary_audio_deletion_queue from public, anon, authenticated;
grant select on public.diary_audio_deletion_queue to authenticated;
create policy diary_audio_deletion_queue_select_own
on public.diary_audio_deletion_queue for select to authenticated
using (patient_id = (select auth.uid()) and app_private.has_role('patient'::public.app_role));

create function public.delete_own_diary_entry(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.diary_entries%rowtype;
begin
  if not app_private.has_role('patient'::public.app_role) then
    raise exception 'entry_unavailable' using errcode = 'P0002';
  end if;

  select * into target from public.diary_entries
  where id = p_entry_id and patient_id = (select auth.uid()) for update;
  if not found then
    raise exception 'entry_unavailable' using errcode = 'P0002';
  end if;
  if target.audio_path is not null then
    insert into public.diary_audio_deletion_queue (entry_id, patient_id, audio_path)
    values (target.id, target.patient_id, target.audio_path);
  end if;
  delete from public.diary_entries where id = target.id;
end;
$$;

create function public.finish_diary_audio_deletion(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.diary_audio_deletion_queue as queued
  where queued.entry_id = p_entry_id
    and queued.patient_id = (select auth.uid())
    and app_private.has_role('patient'::public.app_role)
    and not exists (
      select 1 from storage.objects as object
      where object.bucket_id = 'diary-audio' and object.name = queued.audio_path
    );
  if not found then
    raise exception 'cleanup_unavailable' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_own_diary_entry(uuid) from public, anon;
revoke all on function public.finish_diary_audio_deletion(uuid) from public, anon;
grant execute on function public.delete_own_diary_entry(uuid) to authenticated;
grant execute on function public.finish_diary_audio_deletion(uuid) to authenticated;
