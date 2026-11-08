-- Isolated database only: Storage removal here simulates the external Storage API.
begin;
create schema account_test;
create function account_test.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'Assertion failed: %', message; end if;
end;
$$;
create function account_test.expect_error(statement text, expected_state text)
returns void language plpgsql as $$
begin
  execute statement;
  raise exception 'Expected SQLSTATE %, but succeeded', expected_state;
exception when others then
  if sqlstate <> expected_state then raise; end if;
end;
$$;
grant usage on schema account_test to anon, authenticated, service_role;
grant execute on all functions in schema account_test to anon, authenticated, service_role;

insert into auth.users (id) values
 ('a1000000-0000-4000-8000-000000000001'),
 ('a1000000-0000-4000-8000-000000000002'),
 ('a1000000-0000-4000-8000-000000000003'),
 ('a1000000-0000-4000-8000-000000000004');
insert into public.profiles (id, role) values
 ('a1000000-0000-4000-8000-000000000001', 'patient'),
 ('a1000000-0000-4000-8000-000000000002', 'patient'),
 ('a1000000-0000-4000-8000-000000000003', 'psychologist'),
 ('a1000000-0000-4000-8000-000000000004', 'psychologist');
insert into public.psychologist_profiles (user_id) values
 ('a1000000-0000-4000-8000-000000000003'),
 ('a1000000-0000-4000-8000-000000000004');
insert into public.patient_profiles (user_id, psychologist_id) values
 ('a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003'),
 ('a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003');
insert into storage.objects (id, bucket_id, name, owner_id) values
 ('a2000000-0000-4000-8000-000000000001', 'diary-audio',
  'a1000000-0000-4000-8000-000000000001/a2000000-0000-4000-8000-000000000001.m4a',
  'a1000000-0000-4000-8000-000000000001'),
 ('a2000000-0000-4000-8000-000000000002', 'diary-audio',
  'a1000000-0000-4000-8000-000000000002/a2000000-0000-4000-8000-000000000002.m4a',
  'a1000000-0000-4000-8000-000000000002'),
 ('a2000000-0000-4000-8000-000000000003', 'diary-audio',
  'a1000000-0000-4000-8000-000000000001/a2000000-0000-4000-8000-000000000003.m4a',
  'a1000000-0000-4000-8000-000000000001');
insert into public.diary_entries (id, patient_id, content, audio_object_id) values
 ('a3000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Ficticio',
  'a2000000-0000-4000-8000-000000000001'),
 ('a3000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'Ficticio',
  'a2000000-0000-4000-8000-000000000002');
select account_test.assert_true((select count(*) = 2 from public.notifications where kind = 'diary'
  and user_id = 'a1000000-0000-4000-8000-000000000003'), 'new entries notify only assigned psychologist');
select public.create_patient_invitation('a1000000-0000-4000-8000-000000000004',
 'a1000000-0000-4000-8000-000000000001', 'synthetic@example.test', 'Ficticio');
select account_test.assert_true((select count(*) = 1 from public.notifications where kind = 'invitation'
  and user_id = 'a1000000-0000-4000-8000-000000000001'), 'invitation notification created');
select account_test.assert_true(public.publish_announcement('Atualizacao', 'Mensagem ficticia', 'patient') = 2,
  'role-targeted admin announcements');

set local role anon;
select account_test.expect_error('select * from public.notifications', '42501');
select account_test.expect_error($$select public.begin_account_deletion('a1000000-0000-4000-8000-000000000001')$$, '42501');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select account_test.assert_true((select count(*) = 0 from public.notifications
 where user_id <> 'a1000000-0000-4000-8000-000000000001'), 'notifications isolated per user');
select public.mark_notification_read((select id from public.notifications limit 1));
select account_test.assert_true((select count(*) = 1 from public.notifications where read_at is not null), 'read persists');
select account_test.expect_error($$insert into public.notifications(user_id, kind, title, body)
 values ('a1000000-0000-4000-8000-000000000001', 'announcement', 'Fake', 'Fake')$$, '42501');
select account_test.expect_error($$select public.publish_announcement('Fake', 'Fake', null)$$, '42501');
select account_test.expect_error($$select public.begin_account_deletion('a1000000-0000-4000-8000-000000000003')$$, '42501');
select account_test.expect_error($$select * from public.list_account_deletion_objects('a1000000-0000-4000-8000-000000000002')$$, '42501');
select public.decline_patient_invitation((select id from public.list_my_patient_invitations() limit 1));
reset role;
select account_test.assert_true((select count(*) = 1 from public.notifications
 where user_id = 'a1000000-0000-4000-8000-000000000004' and title = 'Resposta ao convite'), 'response notification');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);
select account_test.expect_error($$select public.mark_notification_read((select id from public.notifications
 where user_id = 'a1000000-0000-4000-8000-000000000001' limit 1))$$, 'P0002');
reset role;

-- Administrator deletes psychologist: neither patient nor diary/audio is deleted.
delete from auth.users where id = 'a1000000-0000-4000-8000-000000000003';
select account_test.assert_true((select count(*) = 2 from public.patient_profiles where psychologist_id is null),
  'psychologist removal only clears links');
select account_test.assert_true((select count(*) = 2 from public.diary_entries), 'patient entries preserved');
select account_test.assert_true((select count(*) = 3 from storage.objects), 'patient audio preserved');
select account_test.assert_true((select count(*) = 2 from public.notifications
 where title = 'Sem vínculo com psicólogo' and body like 'A conta do seu psicólogo%'), 'patients notified');
select account_test.assert_true(not exists (select 1 from public.profiles
 where id = 'a1000000-0000-4000-8000-000000000003'), 'Auth deletion removes public profile');

-- Patient data is removed before Storage cleanup; retries remain possible.
select account_test.expect_error($$delete from auth.users where id = 'a1000000-0000-4000-8000-000000000001'$$, '23503');
set local role service_role;
select public.begin_account_deletion('a1000000-0000-4000-8000-000000000001');
select public.begin_account_deletion('a1000000-0000-4000-8000-000000000001');
select account_test.assert_true((select count(*) = 2 from public.list_account_deletion_objects(
 'a1000000-0000-4000-8000-000000000001')), 'attached and orphan audio listed, no other patient files');
reset role;
select account_test.assert_true((select count(*) = 1 from public.diary_entries), 'only deleted patient entries removed');
select account_test.assert_true((select count(*) = 0 from public.patient_invitations), 'deleted patient invitations removed');
select account_test.expect_error($$insert into public.patient_profiles(user_id)
 values ('a1000000-0000-4000-8000-000000000001')$$, 'P0002');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select account_test.assert_true(not app_private.has_role('patient'), 'deleting user cannot access patient actions');
select account_test.assert_true((select count(*) = 0 from storage.objects), 'pending deletion files hidden from old tokens');
reset role;
delete from storage.objects where owner_id = 'a1000000-0000-4000-8000-000000000001';
delete from auth.users where id = 'a1000000-0000-4000-8000-000000000001';
select account_test.assert_true(not exists (select 1 from public.profiles
 where id = 'a1000000-0000-4000-8000-000000000001'), 'profile removed on completion');
select account_test.assert_true(not exists (select 1 from public.notifications
 where user_id = 'a1000000-0000-4000-8000-000000000001'), 'notifications removed on completion');
select account_test.assert_true((select count(*) = 0 from app_private.account_deletions), 'persistent job cleared');
select account_test.assert_true((select count(*) = 1 from public.diary_entries), 'other patient entry retained');
select account_test.assert_true((select count(*) = 1 from storage.objects), 'other patient audio retained');
rollback;
