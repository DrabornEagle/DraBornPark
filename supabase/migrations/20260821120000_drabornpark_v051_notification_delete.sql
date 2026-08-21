create or replace function public.drabornpark_delete_report(drabornpark_report_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  drabornpark_uid uuid := auth.uid();
  drabornpark_deleted integer := 0;
begin
  if drabornpark_uid is null then
    raise exception 'authentication_required';
  end if;

  delete from public.drabornpark_reports
  where id = drabornpark_report_id
    and owner_user_id = drabornpark_uid;

  get diagnostics drabornpark_deleted = row_count;
  return drabornpark_deleted > 0;
end;
$$;

revoke all on function public.drabornpark_delete_report(uuid) from public;
grant execute on function public.drabornpark_delete_report(uuid) to authenticated;
