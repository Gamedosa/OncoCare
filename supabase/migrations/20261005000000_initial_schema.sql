create type public.app_role as enum ('patient', 'psychologist');

create table public.profiles (
  id uuid primary key,
  role public.app_role not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.psychologist_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.patient_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  psychologist_id uuid references public.psychologist_profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patient_profiles(user_id) on delete cascade,
  content text not null check (length(btrim(content)) > 0),
  mood_score smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patient_profiles_psychologist_id_idx
  on public.patient_profiles (psychologist_id)
  where psychologist_id is not null;

create index diary_entries_patient_created_at_idx
  on public.diary_entries (patient_id, created_at desc);

create schema app_private;

revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;

create function app_private.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.role = required_role
  );
$$;

create function app_private.is_assigned_psychologist(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.patient_profiles as patient
    join public.profiles as patient_user on patient_user.id = patient.user_id
    join public.psychologist_profiles as psychologist on psychologist.user_id = patient.psychologist_id
    join public.profiles as psychologist_user on psychologist_user.id = psychologist.user_id
    where patient.user_id = target_patient_id
      and patient_user.role = 'patient'
      and psychologist.user_id = (select auth.uid())
      and psychologist_user.role = 'psychologist'
  );
$$;

create function app_private.is_linked_psychologist(target_psychologist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.patient_profiles as patient
    join public.profiles as patient_user on patient_user.id = patient.user_id
    join public.psychologist_profiles as psychologist on psychologist.user_id = patient.psychologist_id
    join public.profiles as psychologist_user on psychologist_user.id = psychologist.user_id
    where patient.user_id = (select auth.uid())
      and patient_user.role = 'patient'
      and psychologist.user_id = target_psychologist_id
      and psychologist_user.role = 'psychologist'
  );
$$;

revoke all on function app_private.has_role(public.app_role) from public, anon;
revoke all on function app_private.is_assigned_psychologist(uuid) from public, anon;
revoke all on function app_private.is_linked_psychologist(uuid) from public, anon;
grant execute on function app_private.has_role(public.app_role) to authenticated;
grant execute on function app_private.is_assigned_psychologist(uuid) to authenticated;
grant execute on function app_private.is_linked_psychologist(uuid) to authenticated;

create function public.set_diary_entry_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_diary_entry_updated_at() from public, anon, authenticated;

create trigger diary_entries_set_updated_at
before update on public.diary_entries
for each row execute function public.set_diary_entry_updated_at();

alter table public.profiles enable row level security;
alter table public.psychologist_profiles enable row level security;
alter table public.patient_profiles enable row level security;
alter table public.diary_entries enable row level security;

create policy profiles_select_self_or_linked
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or app_private.is_assigned_psychologist(id)
  or app_private.is_linked_psychologist(id)
);

create policy profiles_update_self
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy psychologist_profiles_select_self
on public.psychologist_profiles for select to authenticated
using (user_id = (select auth.uid()));

create policy patient_profiles_select_self_or_assigned_psychologist
on public.patient_profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or app_private.is_assigned_psychologist(user_id)
);

create policy diary_entries_select_own_or_assigned
on public.diary_entries for select to authenticated
using (
  (
    patient_id = (select auth.uid())
    and app_private.has_role('patient'::public.app_role)
  )
  or app_private.is_assigned_psychologist(patient_id)
);

create policy diary_entries_insert_own
on public.diary_entries for insert to authenticated
with check (
  patient_id = (select auth.uid())
  and app_private.has_role('patient'::public.app_role)
);

create policy diary_entries_update_own
on public.diary_entries for update to authenticated
using (
  patient_id = (select auth.uid())
  and app_private.has_role('patient'::public.app_role)
)
with check (
  patient_id = (select auth.uid())
  and app_private.has_role('patient'::public.app_role)
);

grant usage on schema public to authenticated;
revoke all on public.profiles, public.psychologist_profiles, public.patient_profiles, public.diary_entries
  from anon, authenticated;

grant select on public.profiles, public.psychologist_profiles, public.patient_profiles, public.diary_entries
  to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert (patient_id, content, mood_score) on public.diary_entries to authenticated;
grant update (content, mood_score) on public.diary_entries to authenticated;