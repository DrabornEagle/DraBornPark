revoke all on function public.drabornpark_delete_report(uuid) from public;
revoke all on function public.drabornpark_delete_report(uuid) from anon;
grant execute on function public.drabornpark_delete_report(uuid) to authenticated;
