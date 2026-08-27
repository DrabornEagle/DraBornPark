insert into public.dkd_drabornpark_app_config(dkd_key,dkd_value,dkd_updated_at,dkd_updated_by)
values(
  'update_policy',
  jsonb_build_object(
    'force_update_enabled', false,
    'latest_version', '1.0.19',
    'latest_version_code', 19,
    'minimum_version_code', 18
  ),
  now(),
  null
)
on conflict (dkd_key) do update set
  dkd_value=excluded.dkd_value,
  dkd_updated_at=now(),
  dkd_updated_by=null;
