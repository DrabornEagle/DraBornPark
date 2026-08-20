-- DraBornPark-only hardening. Existing DraBornGarage objects are intentionally untouched.

revoke execute on function public.drabornpark_activate_tag(text,text,uuid) from public, anon;
revoke execute on function public.drabornpark_factory_create_tag(text) from public, anon;
revoke execute on function public.drabornpark_is_admin() from public, anon;
revoke execute on function public.drabornpark_set_updated_at() from public, anon, authenticated;

grant execute on function public.drabornpark_activate_tag(text,text,uuid) to authenticated;
grant execute on function public.drabornpark_factory_create_tag(text) to authenticated;
grant execute on function public.drabornpark_is_admin() to authenticated;

-- The public tag snapshot is intentionally anonymous: it exposes only explicitly public vehicle fields.
revoke execute on function public.drabornpark_public_tag_snapshot(text) from public;
grant execute on function public.drabornpark_public_tag_snapshot(text) to anon, authenticated;

create policy drabornpark_scan_events_admin_select
on public.drabornpark_scan_events
for select to authenticated
using (public.drabornpark_is_admin());

create policy drabornpark_abuse_limits_admin_select
on public.drabornpark_abuse_limits
for select to authenticated
using (public.drabornpark_is_admin());
