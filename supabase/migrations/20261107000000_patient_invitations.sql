-- Psychologist-initiated patient invitations.
-- Creating invitations requires the Auth admin API, so only the invite-patient Edge Function
-- (service_role) may call the creation helpers. A link to a psychologist is only activated
-- when the patient herself accepts; pending invitations grant no access to diary data.

create type public.invitation_status as enum ('pending', 'accepted', 'declined', 'revoked');

create table public.patient_invitations (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologist_profiles(user_id) on delete cascade,
  patient_id uuid not null references public.patient_profiles(user_id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and length(email) between 3 and 320),
  patient_name text not null check (patient_name = btrim(patient_name) and length(patient_name) between 1 and 120),
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check ((status = 'pending') = (closed_at is null)),
  check (psychologist_id <> patient_id)
);

create unique index patient_invitations_one_pending_idx
  on public.patient_invitations (psychologist_id, patient_id)
  where status = 'pending';

create index patient_invitations_patient_pending_idx
  on public.patient_invitations (patient_id)
  where status = 'pending';

alter table public.patient_invitations enable row level security;

create policy patient_invitations_select_own_sent
on public.patient_invitations for select to authenticated
using (
  psychologist_id = (select auth.uid())
  and app_private.has_role('psychologist'::public.app_role)
);

revoke all on public.patient_invitations from anon, authenticated;
grant select on public.patient_invitations to authenticated;

-- Patient-facing listing: exposes only the inviting psychologist's display name.
create function public.list_my_patient_invitations()
returns table (id uuid, psychologist_name text, expires_at timestamptz, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select invitation.id, psychologist.display_name, invitation.expires_at, invitation.created_at
  from public.patient_invitations as invitation
  join public.profiles as psychologist
    on psychologist.id = invitation.psychologist_id and psychologist.role = 'psychologist'
  where invitation.patient_id = (select auth.uid())
    and app_private.has_role('patient'::public.app_role)
    and invitation.status = 'pending'
    and invitation.expires_at > now()
  order by invitation.created_at desc;
$$;

-- Accepting replaces any previous link: the former psychologist loses access immediately through RLS.
create function public.accept_patient_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.patient_invitations%rowtype;
begin
  select * into invitation
  from public.patient_invitations
  where id = p_invitation_id and patient_id = (select auth.uid())
  for update;

  if not found
    or invitation.status <> 'pending'
    or invitation.expires_at <= now()
    or not app_private.has_role('patient'::public.app_role)
    or not exists (
      select 1 from public.profiles
      where id = invitation.psychologist_id and role = 'psychologist'
    )
  then
    raise exception 'invitation_unavailable' using errcode = 'P0002';
  end if;

  update public.patient_profiles
  set psychologist_id = invitation.psychologist_id
  where user_id = invitation.patient_id;

  update public.patient_invitations
  set status = 'accepted', closed_at = now()
  where id = invitation.id;
end;
$$;

create function public.decline_patient_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.patient_invitations
  set status = 'declined', closed_at = now()
  where id = p_invitation_id
    and patient_id = (select auth.uid())
    and status = 'pending'
    and app_private.has_role('patient'::public.app_role);
  if not found then
    raise exception 'invitation_unavailable' using errcode = 'P0002';
  end if;
end;
$$;

create function public.revoke_patient_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.patient_invitations
  set status = 'revoked', closed_at = now()
  where id = p_invitation_id
    and psychologist_id = (select auth.uid())
    and status = 'pending'
    and app_private.has_role('psychologist'::public.app_role);
  if not found then
    raise exception 'invitation_unavailable' using errcode = 'P0002';
  end if;
end;
$$;

-- Service-only: resolves an e-mail to an existing account without exposing auth.users to clients.
create function public.find_invitation_target(p_email text)
returns table (user_id uuid, confirmed boolean, role public.app_role)
language sql
stable
security definer
set search_path = ''
as $$
  select account.id, account.email_confirmed_at is not null, profile.role
  from auth.users as account
  left join public.profiles as profile on profile.id = account.id
  where lower(account.email) = lower(btrim(p_email))
  limit 1;
$$;

-- Service-only: creates the patient profile for new accounts (keeping existing patients' own names)
-- and creates or refreshes the single pending invitation for this psychologist/patient pair.
create function public.create_patient_invitation(
  p_psychologist_id uuid,
  p_patient_id uuid,
  p_email text,
  p_patient_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  patient_role public.app_role;
  current_psychologist uuid;
  invitation_id uuid;
begin
  if not exists (
    select 1
    from public.profiles as profile
    join public.psychologist_profiles as psychologist on psychologist.user_id = profile.id
    where profile.id = p_psychologist_id and profile.role = 'psychologist'
  ) then
    raise exception 'not_psychologist' using errcode = 'P0001';
  end if;

  if p_patient_id = p_psychologist_id then
    raise exception 'invitation_unavailable' using errcode = 'P0002';
  end if;

  select role into patient_role from public.profiles where id = p_patient_id;
  if not found then
    insert into public.profiles (id, role, display_name)
    values (p_patient_id, 'patient', btrim(p_patient_name));
  elsif patient_role <> 'patient' then
    raise exception 'invitation_unavailable' using errcode = 'P0002';
  end if;

  insert into public.patient_profiles (user_id)
  values (p_patient_id)
  on conflict (user_id) do nothing;

  select psychologist_id into current_psychologist
  from public.patient_profiles
  where user_id = p_patient_id;
  if current_psychologist = p_psychologist_id then
    raise exception 'already_linked' using errcode = 'P0003';
  end if;

  insert into public.patient_invitations (psychologist_id, patient_id, email, patient_name)
  values (p_psychologist_id, p_patient_id, lower(btrim(p_email)), btrim(p_patient_name))
  on conflict (psychologist_id, patient_id) where status = 'pending'
  do update set
    email = excluded.email,
    patient_name = excluded.patient_name,
    expires_at = now() + interval '7 days'
  returning id into invitation_id;

  return invitation_id;
end;
$$;

revoke all on function public.list_my_patient_invitations() from public, anon;
revoke all on function public.accept_patient_invitation(uuid) from public, anon;
revoke all on function public.decline_patient_invitation(uuid) from public, anon;
revoke all on function public.revoke_patient_invitation(uuid) from public, anon;
grant execute on function public.list_my_patient_invitations() to authenticated;
grant execute on function public.accept_patient_invitation(uuid) to authenticated;
grant execute on function public.decline_patient_invitation(uuid) to authenticated;
grant execute on function public.revoke_patient_invitation(uuid) to authenticated;

revoke all on function public.find_invitation_target(text) from public, anon, authenticated;
revoke all on function public.create_patient_invitation(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.find_invitation_target(text) to service_role;
grant execute on function public.create_patient_invitation(uuid, uuid, text, text) to service_role;
