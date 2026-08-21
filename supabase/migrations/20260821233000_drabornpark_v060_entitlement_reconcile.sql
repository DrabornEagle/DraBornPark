-- DraBornPark v0.6.0 — paid/trial entitlement reconciliation.
-- Applied to the live Supabase project on 2026-08-21.

create or replace function public.drabornpark_reconcile_entitlement_dkd()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  dkd_user_id uuid := auth.uid();
  dkd_trial_until timestamptz;
  dkd_has_paid boolean := false;
  dkd_next_status text;
begin
  if dkd_user_id is null then raise exception 'authentication_required'; end if;

  select p.plus_trial_until
    into dkd_trial_until
  from public.drabornpark_profiles p
  where p.user_id = dkd_user_id
  for update;

  if not found then
    return jsonb_build_object('ok',false,'status','missing_profile');
  end if;

  select exists(
    select 1
    from public.drabornpark_subscriptions s
    where s.user_id = dkd_user_id
      and lower(s.status) in ('active','trialing','grace_period','canceled')
      and (s.expires_at is null or s.expires_at > now())
  ) into dkd_has_paid;

  if dkd_has_paid then
    dkd_next_status := 'PLUS_ACTIVE';
  elsif dkd_trial_until is not null and dkd_trial_until > now() then
    dkd_next_status := 'PLUS_TRIAL';
  else
    dkd_next_status := 'BASIC';
  end if;

  update public.drabornpark_profiles
  set subscription_status = dkd_next_status,
      updated_at = case when subscription_status is distinct from dkd_next_status then now() else updated_at end
  where user_id = dkd_user_id;

  return jsonb_build_object(
    'ok',true,
    'status',dkd_next_status,
    'paid',dkd_has_paid,
    'trialUntil',dkd_trial_until
  );
end;
$function$;

grant execute on function public.drabornpark_reconcile_entitlement_dkd() to authenticated;
