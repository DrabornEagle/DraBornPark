create unique index if not exists dkd_drabornpark_subscription_token_hash_uidx
on public.drabornpark_subscriptions(purchase_token_hash)
where purchase_token_hash is not null;

insert into public.dkd_drabornpark_app_config(dkd_key,dkd_value,dkd_updated_at,dkd_updated_by)
values (
  'update_policy',
  jsonb_build_object(
    'force_update_enabled', false,
    'minimum_version_code', 20,
    'latest_version', '1.0.21',
    'latest_version_code', 21
  ),
  now(),
  null
)
on conflict (dkd_key) do update set
  dkd_value=excluded.dkd_value,
  dkd_updated_at=excluded.dkd_updated_at,
  dkd_updated_by=excluded.dkd_updated_by;
