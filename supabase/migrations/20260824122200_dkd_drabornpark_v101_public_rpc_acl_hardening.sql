revoke all on function public.dkd_drabornpark_activate_public_token_v101(uuid,text,uuid) from public, anon;
grant execute on function public.dkd_drabornpark_activate_public_token_v101(uuid,text,uuid) to authenticated, service_role;

revoke all on function public.dkd_drabornpark_activation_from_token_v101(text) from public, anon;
grant execute on function public.dkd_drabornpark_activation_from_token_v101(text) to authenticated, service_role;

revoke all on function public.dkd_drabornpark_public_tag_snapshot_v101(text) from public, anon, authenticated;
grant execute on function public.dkd_drabornpark_public_tag_snapshot_v101(text) to service_role;

revoke all on function public.dkd_drabornpark_sync_public_tag_url_v101() from public, anon, authenticated;
grant execute on function public.dkd_drabornpark_sync_public_tag_url_v101() to service_role;

revoke all on function public.drabornpark_public_tag_snapshot(text) from public, anon, authenticated;
grant execute on function public.drabornpark_public_tag_snapshot(text) to service_role;
