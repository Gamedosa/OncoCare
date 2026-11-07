-- Run only against an isolated local database. Uses synthetic accounts and e-mails.
begin;

create schema invitation_test;
grant usage on schema invitation_test to authenticated, anon, service_role;

create function invitation_test.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$;

create function invitation_test.expect_error(statement text, expected_message text)
returns void language plpgsql as $$
begin
  execute statement;
  raise exception 'Expected error %, but statement succeeded', expected_message;
exception when others then
  if sqlerrm <> expected_message then
    raise;
  end if;
end;
$$;

grant execute on all functions in schema invitation_test to authenticated, anon, service_role;

-- c...01/02 psychologists, c...03 existing patient linked to 01, c...04 new invited account,
-- c...05 another existing patient.
insert into auth.users (id, email, email_confirmed_at) values
  ('c1000000-0000-4000-8000-000000000001', 'psi1@example.test', now()),
  ('c1000000-0000-4000-8000-000000000002', 'psi2@example.test', now()),
  ('c1000000-0000-4000-8000-000000000003', 'paciente3@example.test', now()),
  ('c1000000-0000-4000-8000-000000000004', 'nova4@example.test', null),
  ('c1000000-0000-4000-8000-000000000005', 'paciente5@example.test', now());
insert into public.profiles (id, role, display_name) values
  ('c1000000-0000-4000-8000-000000000001', 'psychologist', 'Psi Um'),
  ('c1000000-0000-4000-8000-000000000002', 'psychologist', 'Psi Dois'),
  ('c1000000-0000-4000-8000-000000000003', 'patient', 'Nome escolhido pela paciente'),
  ('c1000000-0000-4000-8000-000000000005', 'patient', null);
insert into public.psychologist_profiles (user_id) values
  ('c1000000-0000-4000-8000-000000000001'),
  ('c1000000-0000-4000-8000-000000000002');
insert into public.patient_profiles (user_id, psychologist_id) values
  ('c1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000001'),
  ('c1000000-0000-4000-8000-000000000005', null);
insert into public.diary_entries (patient_id, content) values
  ('c1000000-0000-4000-8000-000000000003', 'Relato ficticio');

-- Clients can never call the service-only helpers.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select invitation_test.expect_error(
  $$select public.find_invitation_target('paciente3@example.test')$$,
  'permission denied for function find_invitation_target');
select invitation_test.expect_error(
  $$select public.create_patient_invitation('c1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000005', 'paciente5@example.test', 'X')$$,
  'permission denied for function create_patient_invitation');
select invitation_test.expect_error(
  $$insert into public.patient_invitations (psychologist_id, patient_id, email, patient_name)
    values ('c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000005', 'x@example.test', 'X')$$,
  'permission denied for table patient_invitations');
select invitation_test.expect_error(
  $$update public.patient_profiles set psychologist_id = 'c1000000-0000-4000-8000-000000000001'
    where user_id = 'c1000000-0000-4000-8000-000000000005'$$,
  'permission denied for table patient_profiles');
reset role;

set local role anon;
select invitation_test.expect_error(
  $$select * from public.list_my_patient_invitations()$$,
  'permission denied for function list_my_patient_invitations');
reset role;

-- Service role: lookup and creation rules.
set local role service_role;
select invitation_test.assert_true(
  (select user_id = 'c1000000-0000-4000-8000-000000000003' and confirmed and role = 'patient'
   from public.find_invitation_target('  PACIENTE3@example.test ')),
  'lookup is case-insensitive and reports confirmation and role');
select invitation_test.assert_true(
  (select role is null and not confirmed from public.find_invitation_target('nova4@example.test')),
  'new invited account has no profile yet');
select invitation_test.assert_true(
  not exists (select 1 from public.find_invitation_target('ninguem@example.test')),
  'unknown e-mail returns no row');

select invitation_test.expect_error(
  $$select public.create_patient_invitation('c1000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-000000000005', 'paciente5@example.test', 'X')$$,
  'not_psychologist');
select invitation_test.expect_error(
  $$select public.create_patient_invitation('c1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000002', 'psi2@example.test', 'X')$$,
  'invitation_unavailable');
select invitation_test.expect_error(
  $$select public.create_patient_invitation('c1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001', 'psi1@example.test', 'X')$$,
  'invitation_unavailable');
select invitation_test.expect_error(
  $$select public.create_patient_invitation('c1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000003', 'paciente3@example.test', 'X')$$,
  'already_linked');

-- New account: profile created with the psychologist-provided name, no link yet.
select public.create_patient_invitation('c1000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000004', ' Nova4@Example.test ', ' Nova Paciente ');
reset role;
select invitation_test.assert_true(
  (select role = 'patient' and display_name = 'Nova Paciente'
   from public.profiles where id = 'c1000000-0000-4000-8000-000000000004'),
  'new patient profile uses the trimmed psychologist-provided name');
select invitation_test.assert_true(
  (select psychologist_id is null from public.patient_profiles
   where user_id = 'c1000000-0000-4000-8000-000000000004'),
  'pending invitation does not link the patient');
select invitation_test.assert_true(
  (select email = 'nova4@example.test' and status = 'pending'
     and expires_at between now() + interval '6 days 23 hours' and now() + interval '7 days 1 minute'
   from public.patient_invitations where patient_id = 'c1000000-0000-4000-8000-000000000004'),
  'invitation stores normalized e-mail and 7-day expiry');

-- Resending refreshes the single pending invitation instead of duplicating it.
update public.patient_invitations set expires_at = now() + interval '1 hour'
where patient_id = 'c1000000-0000-4000-8000-000000000004';
set local role service_role;
select public.create_patient_invitation('c1000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000004', 'nova4@example.test', 'Nome Corrigido');
-- Existing patient linked to psi1 invited by psi2 keeps her own profile name.
select public.create_patient_invitation('c1000000-0000-4000-8000-000000000002',
  'c1000000-0000-4000-8000-000000000003', 'paciente3@example.test', 'Nome do psicologo');
reset role;
select invitation_test.assert_true(
  (select count(*) = 1 and min(expires_at) > now() + interval '6 days' and min(patient_name) = 'Nome Corrigido'
   from public.patient_invitations where patient_id = 'c1000000-0000-4000-8000-000000000004'),
  'resend refreshes the pending invitation');
select invitation_test.assert_true(
  (select display_name = 'Nome escolhido pela paciente' from public.profiles
   where id = 'c1000000-0000-4000-8000-000000000003'),
  'existing patient name is not overwritten');

-- Psychologists only see invitations they sent.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select invitation_test.assert_true(
  (select count(*) = 1 and bool_and(psychologist_id = 'c1000000-0000-4000-8000-000000000001')
   from public.patient_invitations),
  'psi1 sees only own invitation');
select invitation_test.assert_true(
  not exists (select 1 from public.list_my_patient_invitations()),
  'psychologists get no patient invitation listing');
select invitation_test.expect_error(
  $$select public.accept_patient_invitation(
    (select id from public.patient_invitations where patient_id = 'c1000000-0000-4000-8000-000000000004'))$$,
  'invitation_unavailable');

-- psi2 cannot see diary entries of paciente3 while the invitation is pending.
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select invitation_test.assert_true(
  not exists (select 1 from public.diary_entries where patient_id = 'c1000000-0000-4000-8000-000000000003'),
  'pending invitation grants no diary access');
select invitation_test.assert_true(
  not exists (select 1 from public.profiles where id = 'c1000000-0000-4000-8000-000000000003'),
  'pending invitation grants no profile access');

-- Other patients cannot see, accept or decline someone else's invitation.
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000005', true);
select invitation_test.assert_true(
  not exists (select 1 from public.list_my_patient_invitations()),
  'patient 5 has no invitations');
select invitation_test.assert_true(
  not exists (select 1 from public.patient_invitations),
  'patients cannot read the invitation table directly');
reset role;
create temporary table psi2_invitation on commit drop as
  select id from public.patient_invitations
  where psychologist_id = 'c1000000-0000-4000-8000-000000000002';
grant select on psi2_invitation to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000005', true);
select invitation_test.expect_error(
  $$select public.accept_patient_invitation((select id from psi2_invitation))$$,
  'invitation_unavailable');
select invitation_test.expect_error(
  $$select public.decline_patient_invitation((select id from psi2_invitation))$$,
  'invitation_unavailable');

-- Psychologist 1 cannot revoke psychologist 2's invitation.
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select invitation_test.expect_error(
  $$select public.revoke_patient_invitation((select id from psi2_invitation))$$,
  'invitation_unavailable');

-- Patient 3 sees the invitation with only the psychologist's name, then accepts: link transfers.
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000003', true);
select invitation_test.assert_true(
  (select count(*) = 1 and min(psychologist_name) = 'Psi Dois' from public.list_my_patient_invitations()),
  'patient sees pending invitation with psychologist name');
select public.accept_patient_invitation((select id from psi2_invitation));
select invitation_test.assert_true(
  (select psychologist_id = 'c1000000-0000-4000-8000-000000000002' from public.patient_profiles
   where user_id = 'c1000000-0000-4000-8000-000000000003'),
  'accepting transfers the link');
select invitation_test.expect_error(
  $$select public.accept_patient_invitation((select id from psi2_invitation))$$,
  'invitation_unavailable');

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select invitation_test.assert_true(
  exists (select 1 from public.diary_entries where patient_id = 'c1000000-0000-4000-8000-000000000003'),
  'new psychologist can read after acceptance');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select invitation_test.assert_true(
  not exists (select 1 from public.diary_entries where patient_id = 'c1000000-0000-4000-8000-000000000003'),
  'former psychologist loses access after transfer');

-- Expired invitations cannot be accepted and are hidden from the patient.
reset role;
update public.patient_invitations set expires_at = now() - interval '1 second'
where patient_id = 'c1000000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000004', true);
select invitation_test.assert_true(
  not exists (select 1 from public.list_my_patient_invitations()),
  'expired invitation is hidden');
reset role;
create temporary table new_invitation on commit drop as
  select id from public.patient_invitations
  where patient_id = 'c1000000-0000-4000-8000-000000000004';
grant select on new_invitation to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000004', true);
select invitation_test.expect_error(
  $$select public.accept_patient_invitation((select id from new_invitation))$$,
  'invitation_unavailable');

-- Declining keeps the account without a link.
reset role;
update public.patient_invitations set expires_at = now() + interval '1 day'
where patient_id = 'c1000000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000004', true);
select public.decline_patient_invitation((select id from new_invitation));
reset role;
select invitation_test.assert_true(
  (select status = 'declined' and closed_at is not null from public.patient_invitations
   where id = (select id from new_invitation)),
  'decline closes the invitation');
select invitation_test.assert_true(
  (select psychologist_id is null from public.patient_profiles
   where user_id = 'c1000000-0000-4000-8000-000000000004'),
  'decline keeps the account unlinked');

-- Revoking: psi1 re-invites patient 4, then revokes; patient can no longer accept.
set local role service_role;
select public.create_patient_invitation('c1000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000004', 'nova4@example.test', 'Nova Paciente');
reset role;
create temporary table revoked_invitation on commit drop as
  select id from public.patient_invitations
  where patient_id = 'c1000000-0000-4000-8000-000000000004' and status = 'pending';
grant select on revoked_invitation to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select public.revoke_patient_invitation((select id from revoked_invitation));
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000004', true);
select invitation_test.expect_error(
  $$select public.accept_patient_invitation((select id from revoked_invitation))$$,
  'invitation_unavailable');
reset role;

rollback;
