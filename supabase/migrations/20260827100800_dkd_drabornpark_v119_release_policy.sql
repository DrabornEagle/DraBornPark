insert into public.dkd_drabornpark_app_config(dkd_key,dkd_value,dkd_updated_at,dkd_updated_by)
values (
  'update_policy',
  jsonb_build_object(
    'force_update_enabled', false,
    'minimum_version_code', 18,
    'latest_version', '1.0.19',
    'latest_version_code', 19
  ),
  now(),
  null
)
on conflict (dkd_key) do update set
  dkd_value=excluded.dkd_value,
  dkd_updated_at=excluded.dkd_updated_at,
  dkd_updated_by=excluded.dkd_updated_by;
