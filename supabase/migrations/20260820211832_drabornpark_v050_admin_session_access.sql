-- DraBornPark v0.5.0 — production-panel administrator access.

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('drabornpark_role','admin')
where lower(email) = 'draborneagle@gmail.com';

create or replace function public.drabornpark_is_admin()
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select
    coalesce((auth.jwt() -> 'app_metadata' ->> 'drabornpark_role') = 'admin', false)
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'draborneagle@gmail.com';
$function$;
