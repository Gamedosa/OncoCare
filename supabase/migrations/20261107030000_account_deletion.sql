alter table public.profiles add column deletion_requested_at timestamptz;

create table app_private.account_deletions (
  user_id uuid primary key,
  requested_at timestamptz not null default now()
);
revoke all on app_private.account_deletions from public, anon, authenticated;

create or replace function app_private.has_role(required_role public.app_role)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = required_role and deletion_requested_at is null
  );
$$;

create or replace function app_private.is_assigned_psychologist(target_patient_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.patient_profiles as patient
    join public.profiles as patient_user on patient_user.id = patient.user_id
    join public.psychologist_profiles as psychologist on psychologist.user_id = patient.psychologist_id
    join public.profiles as psychologist_user on psychologist_user.id = psychologist.user_id
    where patient.user_id = target_patient_id and patient_user.role = 'patient'
      and patient_user.deletion_requested_at is null
      and psychologist.user_id = (select auth.uid()) and psychologist_user.role = 'psychologist'
      and psychologist_user.deletion_requested_at is null
  );
$$;

create or replace function app_private.is_linked_psychologist(target_psychologist_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.patient_profiles as patient
    join public.profiles as patient_user on patient_user.id = patient.user_id
    join public.psychologist_profiles as psychologist on psychologist.user_id = patient.psychologist_id
    join public.profiles as psychologist_user on psychologist_user.id = psychologist.user_id
    where patient.user_id = (select auth.uid()) and patient_user.role = 'patient'
      and patient_user.deletion_requested_at is null
      and psychologist.user_id = target_psychologist_id and psychologist_user.role = 'psychologist'
      and psychologist_user.deletion_requested_at is null
  );
$$;

alter policy profiles_update_self on public.profiles
using (id = (select auth.uid()) and app_private.has_role(role))
with check (id = (select auth.uid()) and app_private.has_role(role));

create function app_private.prevent_deleted_profile_recreation()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.profiles
  where id = new.user_id and deletion_requested_at is null for key share;
  if not found then
    raise exception 'account_unavailable' using errcode = 'P0002';
  end if;
  return new;
end;
$$;
create trigger patient_profile_active before insert on public.patient_profiles
for each row execute function app_private.prevent_deleted_profile_recreation();
create trigger psychologist_profile_active before insert on public.psychologist_profiles
for each row execute function app_private.prevent_deleted_profile_recreation();
revoke all on function app_private.prevent_deleted_profile_recreation() from public, anon, authenticated;

-- Serialize authenticated uploads with deletion so an in-flight upload cannot leave a late orphan.
create function app_private.lock_audio_upload_account()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.bucket_id = 'diary-audio' and (select auth.uid()) is not null then
    perform 1 from public.profiles
    where id = (select auth.uid()) and role = 'patient' and deletion_requested_at is null
    for key share;
    if not found then
      raise exception 'account_unavailable' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger diary_audio_active_account before insert on storage.objects
for each row execute function app_private.lock_audio_upload_account();
revoke all on function app_private.lock_audio_upload_account() from public, anon, authenticated;

-- The profile remains available for retrying a failed Storage/Auth cleanup.
-- Removing the role-specific row also prevents concurrent writes through its foreign keys.
create function public.begin_account_deletion(p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.profiles where id = p_user_id for update;
  if not found and not exists (
    select 1 from app_private.account_deletions where user_id = p_user_id
  ) then
    raise exception 'account_unavailable' using errcode = 'P0002';
  end if;

  insert into app_private.account_deletions (user_id) values (p_user_id)
  on conflict (user_id) do nothing;
  update public.profiles set deletion_requested_at = coalesce(deletion_requested_at, now())
  where id = p_user_id;
  delete from public.patient_profiles where user_id = p_user_id;
  delete from public.psychologist_profiles where user_id = p_user_id;
end;
$$;

create function public.list_account_deletion_objects(p_user_id uuid)
returns table (bucket_id text, name text)
language sql stable security definer set search_path = ''
as $$
  select object.bucket_id, object.name from storage.objects as object
  where exists (select 1 from app_private.account_deletions where user_id = p_user_id)
    and (object.owner_id = p_user_id::text
      or (object.bucket_id = 'diary-audio' and split_part(object.name, '/', 1) = p_user_id::text))
  order by object.bucket_id, object.name
  limit 100;
$$;

-- Covers administrator deletion from Auth as well, but never deletes Storage metadata with SQL.
create function app_private.cleanup_deleted_auth_account()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.profiles where id = old.id for update;
  if exists (
    select 1 from storage.objects
    where owner_id = old.id::text
      or (bucket_id = 'diary-audio' and split_part(name, '/', 1) = old.id::text)
  ) then
    raise exception 'Remove files through delete-account before deleting this Auth account'
      using errcode = '23503';
  end if;
  update public.profiles set deletion_requested_at = coalesce(deletion_requested_at, now())
  where id = old.id;
  delete from public.profiles where id = old.id;
  delete from app_private.account_deletions where user_id = old.id;
  return old;
end;
$$;

create trigger auth_account_cleanup before delete on auth.users
for each row execute function app_private.cleanup_deleted_auth_account();

revoke all on function public.begin_account_deletion(uuid) from public, anon, authenticated;
revoke all on function public.list_account_deletion_objects(uuid) from public, anon, authenticated;
revoke all on function app_private.cleanup_deleted_auth_account() from public, anon, authenticated;
grant execute on function public.begin_account_deletion(uuid) to service_role;
grant execute on function public.list_account_deletion_objects(uuid) to service_role;
