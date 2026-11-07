-- Run only against an isolated local database, never a hosted Storage project.
-- These synthetic Storage metadata rows do not represent real uploaded files.
begin;

create schema audio_test;
grant usage on schema audio_test to authenticated, anon;

create function audio_test.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$;

create function audio_test.expect_error(statement text, expected_state text)
returns void language plpgsql as $$
begin
  execute statement;
  raise exception 'Expected SQLSTATE %, but statement succeeded', expected_state;
exception when others then
  if sqlstate <> expected_state then
    raise;
  end if;
end;
$$;

select audio_test.assert_true(
  (select not public and file_size_limit = 10485760
    and allowed_mime_types = array[
      'audio/mp4', 'audio/x-m4a', 'audio/mpeg',
      'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm'
    ]
   from storage.buckets where id = 'diary-audio'),
  'private bucket, exact 10 MiB limit and audio MIME allowlist'
);

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
  ('a1000000-0000-4000-8000-000000000002', null);

insert into storage.buckets (id, name, public)
values ('audio-test-other-bucket', 'audio-test-other-bucket', false);
insert into storage.objects (id, bucket_id, name, owner_id) values
  ('b1000000-0000-4000-8000-000000000090', 'audio-test-other-bucket',
   'a1000000-0000-4000-8000-000000000001/b1000000-0000-4000-8000-000000000090.m4a',
   'a1000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000091', 'diary-audio', 'invalid-path.m4a',
   'a1000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000092', 'diary-audio',
   'a1000000-0000-4000-8000-000000000001/b1000000-0000-4000-8000-000000000092.m4a',
   'a1000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);

insert into storage.objects (id, bucket_id, name, owner_id) values
  ('b1000000-0000-4000-8000-000000000001', 'diary-audio',
   'a1000000-0000-4000-8000-000000000001/b1000000-0000-4000-8000-000000000001.m4a',
   'a1000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000002', 'diary-audio',
   'a1000000-0000-4000-8000-000000000001/b1000000-0000-4000-8000-000000000002.webm',
   'a1000000-0000-4000-8000-000000000001');

select audio_test.assert_true(
  (select count(*) = 2 from storage.objects where bucket_id = 'diary-audio'),
  'patient can upload and read own unattached audio'
);
select audio_test.expect_error($sql$
  insert into storage.objects (bucket_id, name, owner_id) values
    ('diary-audio', 'a1000000-0000-4000-8000-000000000002/b1000000-0000-4000-8000-000000000003.m4a',
     'a1000000-0000-4000-8000-000000000001')
$sql$, '42501');
select audio_test.expect_error($sql$
  insert into storage.objects (bucket_id, name, owner_id) values
    ('diary-audio', 'a1000000-0000-4000-8000-000000000001/real-name.m4a',
     'a1000000-0000-4000-8000-000000000001')
$sql$, '42501');
select audio_test.expect_error($sql$
  insert into storage.objects (bucket_id, name, owner_id) values
    ('diary-audio', 'a1000000-0000-4000-8000-000000000001/b1000000-0000-4000-8000-000000000003.mp3',
     'a1000000-0000-4000-8000-000000000002')
$sql$, '42501');

insert into public.diary_entries (patient_id, content) values
  ('a1000000-0000-4000-8000-000000000001', 'Synthetic text-only entry');
insert into public.diary_entries (patient_id, audio_object_id) values
  ('a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001');
select audio_test.assert_true(
  (select content is null and audio_path =
    'a1000000-0000-4000-8000-000000000001/b1000000-0000-4000-8000-000000000001.m4a'
   from public.diary_entries where audio_object_id = 'b1000000-0000-4000-8000-000000000001'),
  'audio-only entry with server-derived path'
);
select audio_test.expect_error($sql$
  insert into public.diary_entries (patient_id) values
    ('a1000000-0000-4000-8000-000000000001')
$sql$, '23514');
select audio_test.expect_error($sql$
  insert into public.diary_entries (patient_id, content) values
    ('a1000000-0000-4000-8000-000000000001', '   ')
$sql$, '23514');
select audio_test.expect_error($sql$
  insert into public.diary_entries (patient_id, audio_object_id) values
    ('a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000099')
$sql$, '23514');
select audio_test.expect_error($sql$
  insert into public.diary_entries (patient_id, audio_object_id) values
    ('a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000090')
$sql$, '23514');
select audio_test.expect_error($sql$
  insert into public.diary_entries (patient_id, audio_object_id) values
    ('a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000091')
$sql$, '23514');
select audio_test.expect_error($sql$
  insert into public.diary_entries (patient_id, audio_object_id) values
    ('a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000092')
$sql$, '23514');
select audio_test.expect_error($sql$
  insert into public.diary_entries (patient_id, audio_object_id) values
    ('a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001')
$sql$, '23505');
select audio_test.expect_error($sql$
  update public.diary_entries set audio_path = 'forged'
  where audio_object_id = 'b1000000-0000-4000-8000-000000000001'
$sql$, '42501');
select audio_test.expect_error($sql$
  update public.diary_entries set audio_object_id = null
  where audio_object_id = 'b1000000-0000-4000-8000-000000000001'
$sql$, '23514');

with changed as (
  update storage.objects set name = 'renamed.m4a'
  where bucket_id = 'diary-audio' returning id
)
select audio_test.assert_true((select count(*) = 0 from changed), 'no overwrite or move');
with removed as (
  delete from storage.objects where id = 'b1000000-0000-4000-8000-000000000001' returning id
)
select audio_test.assert_true((select count(*) = 0 from removed), 'attached audio cannot be deleted');

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);
select audio_test.assert_true(
  (select count(*) = 0 from storage.objects where bucket_id = 'diary-audio'),
  'other patient cannot read audio'
);
select audio_test.expect_error($sql$
  insert into public.diary_entries (patient_id, audio_object_id) values
    ('a1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001')
$sql$, '23514');
select audio_test.expect_error($sql$
  insert into public.diary_entries (patient_id, audio_object_id) values
    ('a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000002')
$sql$, '42501');
with removed as (
  delete from storage.objects where bucket_id = 'diary-audio' returning id
)
select audio_test.assert_true((select count(*) = 0 from removed), 'other patient cannot delete audio');

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000003', true);
select audio_test.assert_true(
  (select count(*) = 1 from storage.objects where bucket_id = 'diary-audio'),
  'assigned psychologist sees attached audio only'
);
select audio_test.assert_true(
  (select count(*) = 2 from public.diary_entries
   where patient_id = 'a1000000-0000-4000-8000-000000000001'),
  'assigned psychologist still reads text and audio entries'
);
select audio_test.expect_error($sql$
  insert into storage.objects (bucket_id, name, owner_id) values
    ('diary-audio', 'a1000000-0000-4000-8000-000000000003/b1000000-0000-4000-8000-000000000003.m4a',
     'a1000000-0000-4000-8000-000000000003')
$sql$, '42501');
with changed as (
  update public.diary_entries set content = 'Forbidden' returning id
)
select audio_test.assert_true((select count(*) = 0 from changed), 'psychologist remains read-only');
with removed as (
  delete from storage.objects where bucket_id = 'diary-audio' returning id
)
select audio_test.assert_true((select count(*) = 0 from removed), 'psychologist cannot delete audio');

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000004', true);
select audio_test.assert_true(
  (select count(*) = 0 from storage.objects where bucket_id = 'diary-audio'),
  'unassigned psychologist cannot read audio'
);

reset role;
update public.patient_profiles set psychologist_id = null
where user_id = 'a1000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000003', true);
select audio_test.assert_true(
  (select count(*) = 0 from storage.objects where bucket_id = 'diary-audio'),
  'unlinking immediately revokes authenticated audio access'
);

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
update public.diary_entries
set content = 'Synthetic text with audio', audio_object_id = 'b1000000-0000-4000-8000-000000000002'
where audio_object_id = 'b1000000-0000-4000-8000-000000000001';
select audio_test.assert_true(
  (select content = 'Synthetic text with audio' and audio_path like '%.webm'
   from public.diary_entries where audio_object_id = 'b1000000-0000-4000-8000-000000000002'),
  'patient can replace audio and keep text'
);
with removed as (
  delete from storage.objects where id = 'b1000000-0000-4000-8000-000000000001' returning id
)
select audio_test.assert_true((select count(*) = 1 from removed), 'patient can delete replaced file');
reset role;
select audio_test.expect_error($sql$
  delete from storage.objects where id = 'b1000000-0000-4000-8000-000000000002'
$sql$, '23503');
set local role authenticated;
update public.diary_entries set audio_object_id = null
where audio_object_id = 'b1000000-0000-4000-8000-000000000002';
select audio_test.assert_true(
  (select count(*) = 2 from public.diary_entries
   where patient_id = 'a1000000-0000-4000-8000-000000000001'
     and audio_object_id is null and audio_path is null and content is not null),
  'removing audio preserves text and clears derived path'
);
with removed as (
  delete from storage.objects where id = 'b1000000-0000-4000-8000-000000000002' returning id
)
select audio_test.assert_true((select count(*) = 1 from removed), 'patient can delete detached audio');

-- Keep an object present when testing anonymous access.
insert into storage.objects (bucket_id, name, owner_id) values
  ('diary-audio', 'a1000000-0000-4000-8000-000000000001/b1000000-0000-4000-8000-000000000003.mp3',
   'a1000000-0000-4000-8000-000000000001');
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select audio_test.assert_true(
  (select count(*) = 0 from storage.objects where bucket_id = 'diary-audio'),
  'anonymous users cannot read audio'
);
select audio_test.expect_error($sql$
  insert into storage.objects (bucket_id, name, owner_id) values
    ('diary-audio', 'a1000000-0000-4000-8000-000000000001/b1000000-0000-4000-8000-000000000004.mp3',
     'a1000000-0000-4000-8000-000000000001')
$sql$, '42501');

rollback;
