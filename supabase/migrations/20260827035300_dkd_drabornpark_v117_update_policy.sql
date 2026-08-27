insert into public.dkd_drabornpark_app_config(dkd_key,dkd_value,dkd_updated_at,dkd_updated_by)
values (
  'update_policy',
  jsonb_build_object(
    'force_update_enabled', false,
    'latest_version', '1.0.17',
    'latest_version_code', 17,
    'minimum_version_code', 16
  ),
  now(),
  null
)
on conflict (dkd_key) do update set
  dkd_value = excluded.dkd_value,
  dkd_updated_at = excluded.dkd_updated_at,
  dkd_updated_by = excluded.dkd_updated_by;

create or replace function public.dkd_drabornpark_get_update_policy()
returns jsonb
language sql
security definer
set search_path to 'public'
as $function$
  select coalesce(
    (select dkd_value from public.dkd_drabornpark_app_config where dkd_key='update_policy'),
    jsonb_build_object(
      'force_update_enabled', false,
      'latest_version', '1.0.17',
      'latest_version_code', 17,
      'minimum_version_code', 16
    )
  );
$function$;

create or replace function public.dkd_drabornpark_set_force_update(dkd_enabled boolean, dkd_latest_version_code integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  dkd_uid uuid := auth.uid();
  dkd_allowed boolean := false;
  dkd_current jsonb;
  dkd_current_latest_code integer;
  dkd_current_latest_version text;
  dkd_previous_code integer;
  dkd_result jsonb;
begin
  if dkd_uid is null then
    raise exception 'authentication_required';
  end if;
  select coalesce(public.drabornpark_is_admin(), false) into dkd_allowed;
  if not dkd_allowed then
    raise exception 'admin_required';
  end if;

  select dkd_value into dkd_current
  from public.dkd_drabornpark_app_config
  where dkd_key='update_policy';

  dkd_current_latest_code := coalesce(nullif((dkd_current->>'latest_version_code')::integer,0), dkd_latest_version_code, 17);
  if dkd_current_latest_code < 1 then
    raise exception 'invalid_version_code';
  end if;
  dkd_current_latest_version := coalesce(nullif(dkd_current->>'latest_version',''), '1.0.' || dkd_current_latest_code::text);
  dkd_previous_code := greatest(1, dkd_current_latest_code - 1);

  insert into public.dkd_drabornpark_app_config(dkd_key,dkd_value,dkd_updated_at,dkd_updated_by)
  values (
    'update_policy',
    jsonb_build_object(
      'force_update_enabled', dkd_enabled,
      'latest_version', dkd_current_latest_version,
      'latest_version_code', dkd_current_latest_code,
      'minimum_version_code', dkd_previous_code
    ),
    now(),
    dkd_uid
  )
  on conflict (dkd_key) do update set
    dkd_value=excluded.dkd_value,
    dkd_updated_at=excluded.dkd_updated_at,
    dkd_updated_by=excluded.dkd_updated_by;

  select dkd_value into dkd_result
  from public.dkd_drabornpark_app_config
  where dkd_key='update_policy';
  return dkd_result;
end;
$function$;
