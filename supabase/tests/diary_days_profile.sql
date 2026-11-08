-- Run only on an isolated test database with synthetic entries and Storage metadata.
begin;
create schema day_test;
create function day_test.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'Assertion failed: %', message; end if;
end;
$$;
create function day_test.expect_error(statement text, expected_state text)
returns void language plpgsql as $$
begin
  execute statement;
  raise exception 'Expected SQLSTATE %, but succeeded', expected_state;
exception when others then
  if sqlstate <> expected_state then raise; end if;
end;
$$;
grant usage on schema day_test to anon, authenticated;
grant execute on all functions in schema day_test to anon, authenticated;
insert into public.profiles (id, role, display_name) values
 ('d1000000-0000-4000-8000-000000000001', 'patient', 'Ficticio'),
 ('d1000000-0000-4000-8000-000000000002', 'patient', 'Ficticio'),
 ('d1000000-0000-4000-8000-000000000003', 'psychologist', 'Ficticio'),
 ('d1000000-0000-4000-8000-000000000004', 'psychologist', 'Ficticio');
insert into public.psychologist_profiles (user_id) values
 ('d1000000-0000-4000-8000-000000000003'), ('d1000000-0000-4000-8000-000000000004');
insert into public.patient_profiles (user_id, psychologist_id) values
 ('d1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003'),
 ('d1000000-0000-4000-8000-000000000002', null);
insert into public.diary_entries (patient_id, content, created_at)
select 'd1000000-0000-4000-8000-000000000001', 'Ficticio', '2026-11-07T15:00:00Z'::timestamptz
from generate_series(1, 24);
insert into public.diary_entries (patient_id, content, created_at) values
 ('d1000000-0000-4000-8000-000000000001', 'Antes da meia noite', '2026-11-07T02:59:59Z'),
 ('d1000000-0000-4000-8000-000000000001', 'Fim do dia', '2026-11-08T02:59:59Z'),
 ('d1000000-0000-4000-8000-000000000001', 'Proximo dia', '2026-11-08T03:00:00Z'),
 ('d1000000-0000-4000-8000-000000000002', 'Outra paciente', '2026-11-07T15:00:00Z');
insert into storage.objects (id, bucket_id, name, owner_id) values
 ('d2000000-0000-4000-8000-000000000001', 'diary-audio',
 'd1000000-0000-4000-8000-000000000001/d2000000-0000-4000-8000-000000000001.m4a',
 'd1000000-0000-4000-8000-000000000001');
update public.diary_entries set audio_object_id = 'd2000000-0000-4000-8000-000000000001'
where content = 'Fim do dia';

set local role anon;
select day_test.expect_error($$select * from public.list_diary_days('d1000000-0000-4000-8000-000000000001')$$, '42501');
select day_test.expect_error($$select * from public.list_diary_day_entries('d1000000-0000-4000-8000-000000000001', '2026-11-07')$$, '42501');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select day_test.assert_true((select count(*) = 3 from public.list_diary_days('d1000000-0000-4000-8000-000000000001')),
 'exactly one box per Brasilia day');
select day_test.assert_true((select entry_count = 25 and has_audio from public.list_diary_days(
 'd1000000-0000-4000-8000-000000000001') where day = '2026-11-07'), 'full count beyond a page and audio indicator');
select day_test.assert_true((select count(*) = 21 from public.list_diary_day_entries(
 'd1000000-0000-4000-8000-000000000001', '2026-11-07', 0)), 'first page plus lookahead');
select day_test.assert_true((select count(*) = 5 from public.list_diary_day_entries(
 'd1000000-0000-4000-8000-000000000001', '2026-11-07', 1)), 'remaining day records accessible');
select day_test.assert_true((select count(*) = 1 from public.list_diary_day_entries(
 'd1000000-0000-4000-8000-000000000001', '2026-11-06')), 'UTC midnight stays previous Brasilia day');
select day_test.assert_true((select count(*) = 1 from public.list_diary_day_entries(
 'd1000000-0000-4000-8000-000000000001', '2026-11-08')), 'exclusive next-day boundary');
select day_test.assert_true((select count(*) = 0 from public.list_diary_days('d1000000-0000-4000-8000-000000000002')),
 'other patient counts hidden');
select day_test.expect_error($$select * from public.list_diary_day_entries('d1000000-0000-4000-8000-000000000001', '2026-11-07', -1)$$, '22023');
update public.profiles set display_name = 'Novo nome ficticio' where id = 'd1000000-0000-4000-8000-000000000001';
select day_test.assert_true((select display_name = 'Novo nome ficticio' from public.profiles
 where id = 'd1000000-0000-4000-8000-000000000001'), 'self profile editable');
select day_test.expect_error($$update public.profiles set role = 'psychologist'
 where id = 'd1000000-0000-4000-8000-000000000001'$$, '42501');
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000003', true);
select day_test.assert_true((select entry_count = 25 from public.list_diary_days(
 'd1000000-0000-4000-8000-000000000001') where day = '2026-11-07'), 'linked psychologist same full count');
select day_test.assert_true((select count(*) = 5 from public.list_diary_day_entries(
 'd1000000-0000-4000-8000-000000000001', '2026-11-07', 1)), 'linked psychologist day pagination');
update public.profiles set display_name = 'Nao autorizado' where id = 'd1000000-0000-4000-8000-000000000001';
select day_test.assert_true((select display_name = 'Novo nome ficticio' from public.profiles
 where id = 'd1000000-0000-4000-8000-000000000001'), 'psychologist cannot edit patient profile');
select public.unlink_patient('d1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003');
select day_test.assert_true((select count(*) = 0 from public.list_diary_days('d1000000-0000-4000-8000-000000000001')),
 'unlink hides day summaries on server');
select day_test.assert_true((select count(*) = 0 from public.list_diary_day_entries(
 'd1000000-0000-4000-8000-000000000001', '2026-11-07')), 'unlink hides day records on server');
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
reset role;
insert into public.diary_entries (patient_id, content, created_at)
select 'd1000000-0000-4000-8000-000000000001', 'Mais dias ficticios',
 ('2026-10-01T15:00:00Z'::timestamptz + (n || ' days')::interval)
from generate_series(0, 24) as n;
set local role authenticated;
select day_test.assert_true((select count(*) = 21 from public.list_diary_days(
 'd1000000-0000-4000-8000-000000000001')), 'day pagination limit and lookahead');
select day_test.assert_true((select max(day) = '2026-10-25' from public.list_diary_days(
 'd1000000-0000-4000-8000-000000000001', '2026-11-06')), 'day cursor exclusive and stable');
select public.delete_own_diary_entry((select id from public.diary_entries where content = 'Fim do dia'));
select day_test.assert_true((select entry_count = 24 and not has_audio from public.list_diary_days(
 'd1000000-0000-4000-8000-000000000001') where day = '2026-11-07'), 'delete updates totals and audio flag');
reset role;
rollback;
