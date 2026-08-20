-- DraBornPark v0.5.0 release hardening.

alter table public.drabornpark_profiles
  drop constraint if exists drabornpark_profiles_username_format_chk;

alter table public.drabornpark_profiles
  add constraint drabornpark_profiles_username_format_chk
  check (
    username is null or (
      length(username) between 3 and 24
      and username = lower(username)
      and username ~ '^[a-z0-9._-]+$'
    )
  ) not valid;

alter table public.drabornpark_profiles
  validate constraint drabornpark_profiles_username_format_chk;

revoke all on function public.drabornpark_bootstrap_user(text,text,text) from public, anon;
grant execute on function public.drabornpark_bootstrap_user(text,text,text) to authenticated, service_role;

revoke all on function public.drabornpark_update_profile(text,text) from public, anon;
grant execute on function public.drabornpark_update_profile(text,text) to authenticated, service_role;

revoke all on function public.drabornpark_username_available(text) from public;
grant execute on function public.drabornpark_username_available(text) to anon, authenticated, service_role;

revoke all on function public.drabornpark_is_admin() from public, anon;
grant execute on function public.drabornpark_is_admin() to authenticated, service_role;

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('drabornpark_role','admin')
where lower(email) = 'draborneagle@gmail.com';
