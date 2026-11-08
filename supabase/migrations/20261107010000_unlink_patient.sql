-- Both parties may end only the link they confirmed, without changing diary data.
create function public.unlink_patient(p_patient_id uuid, p_psychologist_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    ((select auth.uid()) = p_patient_id and app_private.has_role('patient'::public.app_role))
    or ((select auth.uid()) = p_psychologist_id and app_private.has_role('psychologist'::public.app_role))
  ) then
    raise exception 'link_unavailable' using errcode = 'P0002';
  end if;

  update public.patient_profiles
  set psychologist_id = null
  where user_id = p_patient_id and psychologist_id = p_psychologist_id;

  if not found then
    raise exception 'link_unavailable' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.unlink_patient(uuid, uuid) from public, anon;
grant execute on function public.unlink_patient(uuid, uuid) to authenticated;
