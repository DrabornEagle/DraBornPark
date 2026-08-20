-- Keep public vehicle snapshot behind the DraBornPark Edge Function only.
-- Existing DraBornGarage objects are intentionally untouched.

revoke execute on function public.drabornpark_public_tag_snapshot(text) from public, anon, authenticated;
grant execute on function public.drabornpark_public_tag_snapshot(text) to service_role;
