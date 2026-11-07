-- Run only against an isolated local database with synthetic Storage metadata.
begin;

create schema unlink_test;
grant usage on schema unlink_test to anon, authenticated;
create function unlink_test.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'Assertion failed: %', message; end if;
end;
$$;
create function unlink_test.expect_error(statement text, expected_state text)
returns void language plpgsql as $$
begin
  execute statement;
  raise exception 'Expected SQLSTATE %, but statement succeeded', expected_state;
exception when others then
  if sqlstate <> expected_state then raise; end if;
end;
$$;
grant execute on all functions in schema unlink_test to anon, authenticated;

insert into public.profiles (id, role) values
  ('d1000000-0000-4000-8000-000000000001', 'patient'),
  ('d1000000-0000-4000-8000-000000000002', 'patient'),
  ('d1000000-0000-4000-8000-000000000003', 'psychologist'),
  ('d1000000-0000-4000-8000-000000000004', 'psychologist');
insert into public.psychologist_profiles (user_id) values
  ('d1000000-0000-4000-8000-000000000003'),
  ('d1000000-0000-4000-8000-000000000004');
insert into public.patient_profiles (user_id, psychologist_id) values
  ('d1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003'),
  ('d1000000-0000-4000-8000-000000000002', null);
insert into storage.objects (id, bucket_id, name, owner_id) values
  ('d2000000-0000-4000-8000-000000000001', 'diary-audio',
   'd1000000-0000-4000-8000-000000000001/d2000000-0000-4000-8000-000000000001.m4a',
   'd1000000-0000-4000-8000-000000000001');
insert into public.diary_entries (patient_id, content, audio_object_id) values
  ('d1000000-0000-4000-8000-000000000001', 'Relato ficticio',
   'd2000000-0000-4000-8000-000000000001');

set local role anon;
select unlink_test.expect_error(
  $$select public.unlink_patient('d1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003')$$, '42501');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000004', true);
select unlink_test.expect_error(
  $$select public.unlink_patient('d1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003')$$, 'P0002');
select unlink_test.expect_error(
  $$select public.unlink_patient('d1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004')$$, 'P0002');
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);
select unlink_test.expect_error(
  $$select public.unlink_patient('d1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003')$$, 'P0002');

-- A patient ends her link, then continues creating and reading entries and audio.
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select public.unlink_patient('d1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003');
select unlink_test.expect_error(
  $$select public.unlink_patient('d1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003')$$, 'P0002');
insert into public.diary_entries (patient_id, content)
values ('d1000000-0000-4000-8000-000000000001', 'Relato sem vinculo');
update public.diary_entries set content = 'Relato atualizado sem vinculo'
where patient_id = 'd1000000-0000-4000-8000-000000000001' and content = 'Relato sem vinculo';
select unlink_test.assert_true((select count(*) = 2 from public.diary_entries), 'patient retains and creates entries');
select unlink_test.assert_true((select count(*) = 1 from public.diary_entries where content = 'Relato atualizado sem vinculo'), 'patient can edit entries without a link');
select unlink_test.assert_true((select count(*) = 1 from storage.objects where bucket_id = 'diary-audio'), 'patient retains audio');

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000003', true);
select unlink_test.assert_true((select count(*) = 0 from public.diary_entries), 'old psychologist loses entries');
select unlink_test.assert_true((select count(*) = 0 from storage.objects where bucket_id = 'diary-audio'), 'old psychologist loses audio');
reset role;

-- Accepting a new invitation grants access to historical entries and audio.
insert into public.patient_invitations (id, patient_id, psychologist_id, email, patient_name) values
  ('d3000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
   'd1000000-0000-4000-8000-000000000004', 'patient@example.test', 'Paciente ficticia');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select public.accept_patient_invitation('d3000000-0000-4000-8000-000000000001');
select unlink_test.expect_error(
  $$select public.unlink_patient('d1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003')$$, 'P0002');
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000004', true);
select unlink_test.assert_true((select count(*) = 2 from public.diary_entries), 'new psychologist sees historical entries');
select unlink_test.assert_true((select count(*) = 1 from storage.objects where bucket_id = 'diary-audio'), 'new psychologist sees historical audio');
select public.unlink_patient('d1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004');
select unlink_test.assert_true((select count(*) = 0 from public.diary_entries), 'psychologist unlink revokes entries');
select unlink_test.assert_true((select count(*) = 0 from storage.objects where bucket_id = 'diary-audio'), 'psychologist unlink revokes audio');
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select unlink_test.assert_true((select count(*) = 2 from public.diary_entries), 'psychologist unlink preserves entries');
select unlink_test.assert_true((select count(*) = 1 from storage.objects where bucket_id = 'diary-audio'), 'psychologist unlink preserves audio');
reset role;
rollback;
