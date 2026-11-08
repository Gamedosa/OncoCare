-- Only run on an isolated local database with synthetic Storage metadata.
begin;
create schema delete_test;
grant usage on schema delete_test to anon, authenticated;
create function delete_test.assert_true(condition boolean, message text) returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'Assertion failed: %', message; end if;
end;
$$;
create function delete_test.expect_error(statement text, expected_state text) returns void language plpgsql as $$
begin
  execute statement;
  raise exception 'Expected SQLSTATE %, but succeeded', expected_state;
exception when others then
  if sqlstate <> expected_state then raise; end if;
end;
$$;
grant execute on all functions in schema delete_test to anon, authenticated;

insert into public.profiles (id, role) values
 ('e1000000-0000-4000-8000-000000000001', 'patient'),
 ('e1000000-0000-4000-8000-000000000002', 'patient'),
 ('e1000000-0000-4000-8000-000000000003', 'psychologist');
insert into public.psychologist_profiles (user_id) values ('e1000000-0000-4000-8000-000000000003');
insert into public.patient_profiles (user_id, psychologist_id) values
 ('e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000003'),
 ('e1000000-0000-4000-8000-000000000002', null);
insert into storage.objects (id, bucket_id, name, owner_id) values
 ('e2000000-0000-4000-8000-000000000001', 'diary-audio',
  'e1000000-0000-4000-8000-000000000001/e2000000-0000-4000-8000-000000000001.m4a',
  'e1000000-0000-4000-8000-000000000001');
insert into public.diary_entries (id, patient_id, content, audio_object_id) values
 ('e3000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'Ficticio', 'e2000000-0000-4000-8000-000000000001'),
 ('e3000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000002', 'Ficticio', null);

set local role anon;
select delete_test.expect_error($$select public.delete_own_diary_entry('e3000000-0000-4000-8000-000000000001')$$, '42501');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000003', true);
select delete_test.expect_error($$select public.delete_own_diary_entry('e3000000-0000-4000-8000-000000000001')$$, 'P0002');
select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000002', true);
select delete_test.expect_error($$select public.delete_own_diary_entry('e3000000-0000-4000-8000-000000000001')$$, 'P0002');
select public.delete_own_diary_entry('e3000000-0000-4000-8000-000000000002');
select delete_test.assert_true((select count(*) = 0 from public.diary_audio_deletion_queue), 'text-only deletion creates no cleanup');
select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000001', true);
select public.delete_own_diary_entry('e3000000-0000-4000-8000-000000000001');
select delete_test.assert_true((select count(*) = 0 from public.diary_entries), 'entry is deleted');
select delete_test.assert_true((select count(*) = 1 from public.diary_audio_deletion_queue), 'audio deletion remains pending');
select delete_test.expect_error($$select public.finish_diary_audio_deletion('e3000000-0000-4000-8000-000000000001')$$, 'P0002');
select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000003', true);
select delete_test.assert_true((select count(*) = 0 from public.diary_entries), 'psychologist cannot read deleted entry');
select delete_test.assert_true((select count(*) = 0 from storage.objects where bucket_id = 'diary-audio'), 'psychologist cannot read queued audio');
select delete_test.assert_true((select count(*) = 0 from public.diary_audio_deletion_queue), 'queue hidden from psychologist');
select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000001', true);
delete from storage.objects where id = 'e2000000-0000-4000-8000-000000000001';
select public.finish_diary_audio_deletion('e3000000-0000-4000-8000-000000000001');
select delete_test.assert_true((select count(*) = 0 from public.diary_audio_deletion_queue), 'queue removed only after audio');
reset role;
rollback;
