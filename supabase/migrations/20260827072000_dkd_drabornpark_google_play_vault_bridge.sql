-- DraBornPark v1.0.18 Google Play credential bridge.
-- The service-account JSON itself is provisioned directly into Supabase Vault
-- and must never be committed to GitHub.

create or replace function public.dkd_drabornpark_get_google_play_service_account()
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON'
  limit 1
$$;

revoke all on function public.dkd_drabornpark_get_google_play_service_account() from public, anon, authenticated;
grant execute on function public.dkd_drabornpark_get_google_play_service_account() to service_role;

comment on function public.dkd_drabornpark_get_google_play_service_account()
is 'Server-only bridge for DraBornPark Google Play Developer API credential stored encrypted in Supabase Vault.';
