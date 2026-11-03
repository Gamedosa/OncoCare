insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diary-audio',
  'diary-audio',
  false,
  10485760,
  array[
    'audio/mp4', 'audio/x-m4a', 'audio/mpeg',
    'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm'
  ]
);

alter table public.diary_entries
  alter column content drop not null,
  add column audio_object_id uuid unique
    references storage.objects(id) on delete no action,
  add column audio_path text,
  add constraint diary_entries_require_content_or_audio
    check (content is not null or audio_object_id is not null),
  add constraint diary_entries_audio_path_matches_object
    check ((audio_object_id is null) = (audio_path is null));

create function app_private.is_own_diary_audio(object_name text, object_owner_id text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select app_private.has_role('patient'::public.app_role)
    and object_owner_id = (select auth.uid())::text
    and object_name ~ (
      '^' || (select auth.uid())::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](m4a|mp3|wav|ogg|webm)$'
    );
$$;

revoke all on function app_private.is_own_diary_audio(text, text) from public, anon;
grant execute on function app_private.is_own_diary_audio(text, text) to authenticated;

create function app_private.validate_diary_audio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.audio_object_id is null then
    new.audio_path = null;
    return new;
  end if;

  select object.name into new.audio_path
  from storage.objects as object
  where object.id = new.audio_object_id
    and object.bucket_id = 'diary-audio'
    and object.owner_id = new.patient_id::text
    and object.name ~ (
      '^' || new.patient_id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](m4a|mp3|wav|ogg|webm)$'
    );

  if not found then
    raise exception 'Audio must be an uploaded file belonging to this patient'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function app_private.validate_diary_audio() from public, anon, authenticated;

create trigger diary_entries_validate_audio
before insert or update on public.diary_entries
for each row execute function app_private.validate_diary_audio();

grant insert (audio_object_id) on public.diary_entries to authenticated;
grant update (audio_object_id) on public.diary_entries to authenticated;

create policy diary_audio_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'diary-audio'
  and app_private.is_own_diary_audio(name, owner_id)
);

create policy diary_audio_select_own_or_assigned
on storage.objects for select to authenticated
using (
  bucket_id = 'diary-audio'
  and (
    app_private.is_own_diary_audio(name, owner_id)
    or exists (
      select 1
      from public.diary_entries as entry
      where entry.audio_object_id = objects.id
        and app_private.is_assigned_psychologist(entry.patient_id)
    )
  )
);

create policy diary_audio_delete_own_unattached
on storage.objects for delete to authenticated
using (
  bucket_id = 'diary-audio'
  and app_private.is_own_diary_audio(name, owner_id)
  and not exists (
    select 1
    from public.diary_entries as entry
    where entry.audio_object_id = objects.id
  )
);

-- No UPDATE policy: replacement uses a new file, never overwrite/move.
