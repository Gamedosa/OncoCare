create function public.list_diary_days(p_patient_id uuid, p_before date default null)
returns table (day date, entry_count bigint, has_audio boolean)
language sql stable security invoker set search_path = ''
as $$
  select (entry.created_at at time zone 'America/Sao_Paulo')::date as day,
    count(*) as entry_count, bool_or(entry.audio_object_id is not null) as has_audio
  from public.diary_entries as entry
  where entry.patient_id = p_patient_id
    and (p_before is null or entry.created_at < (p_before::timestamp at time zone 'America/Sao_Paulo'))
  group by (entry.created_at at time zone 'America/Sao_Paulo')::date
  order by day desc
  limit 21;
$$;

create function public.list_diary_day_entries(p_patient_id uuid, p_day date, p_page integer default 0)
returns setof public.diary_entries
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if p_day is null or p_page is null or p_page < 0 then
    raise exception 'invalid_diary_day' using errcode = '22023';
  end if;
  return query select entry.* from public.diary_entries as entry
  where entry.patient_id = p_patient_id
    and entry.created_at >= (p_day::timestamp at time zone 'America/Sao_Paulo')
    and entry.created_at < ((p_day + 1)::timestamp at time zone 'America/Sao_Paulo')
  order by entry.created_at desc, entry.id desc
  limit 21 offset (p_page::bigint * 20);
end;
$$;

revoke all on function public.list_diary_days(uuid, date) from public, anon;
revoke all on function public.list_diary_day_entries(uuid, date, integer) from public, anon;
grant execute on function public.list_diary_days(uuid, date) to authenticated;
grant execute on function public.list_diary_day_entries(uuid, date, integer) to authenticated;
