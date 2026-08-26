-- DraBornPark v1.0.15
-- Trial starts on the user's first activated NFC/QR tag and lasts exactly 14 days.
-- Additional tags do not extend the trial. Paid Google Play access is handled separately.

create or replace function public.dkd_drabornpark_activate_tag_v054(dkd_tag_code text, dkd_pin text, dkd_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  dkd_uid uuid := auth.uid();
  dkd_result jsonb;
  dkd_trial_start timestamptz;
  dkd_trial_until timestamptz;
  dkd_paid_status text;
  dkd_paid_expiry timestamptz;
begin
  if dkd_uid is null then raise exception 'authentication_required'; end if;

  dkd_result := public.drabornpark_activate_tag(dkd_tag_code, dkd_pin, dkd_vehicle_id);

  select min(t.activated_at)
    into dkd_trial_start
  from public.drabornpark_tags t
  where t.owner_user_id = dkd_uid
    and t.activated_at is not null;

  if dkd_trial_start is null then dkd_trial_start := now(); end if;
  dkd_trial_until := dkd_trial_start + interval '14 days';

  select s.status, s.expires_at
    into dkd_paid_status, dkd_paid_expiry
  from public.drabornpark_subscriptions s
  where s.user_id = dkd_uid
    and s.status in ('PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED')
    and (s.expires_at is null or s.expires_at > now())
  order by s.expires_at desc nulls first, s.updated_at desc
  limit 1;

  update public.drabornpark_profiles p
  set plus_trial_until = dkd_trial_until,
      subscription_status = case
        when dkd_paid_status is not null then dkd_paid_status
        when dkd_trial_until > now() then 'PLUS_TRIAL'
        else 'BASIC'
      end,
      updated_at = now()
  where p.user_id = dkd_uid;

  insert into public.drabornpark_timeline_events(owner_user_id, vehicle_id, event_type, title, description, metadata)
  values (
    dkd_uid,
    dkd_vehicle_id,
    'PLUS_REWARD_GRANTED',
    '14 Gün DraBornPark+ kazandınız',
    'İlk etiket bağlantınızla başlayan 14 günlük DraBornPark+ deneme süreniz etkinleştirildi.',
    jsonb_build_object('rewardDays',14,'trialStartedAt',dkd_trial_start,'plusTrialUntil',dkd_trial_until)
  );

  return coalesce(dkd_result,'{}'::jsonb) || jsonb_build_object(
    'rewardGranted', true,
    'rewardDays', 14,
    'trialStartedAt', dkd_trial_start,
    'plusTrialUntil', dkd_trial_until
  );
end;
$function$;

with dkd_first_tag as (
  select t.owner_user_id as user_id, min(t.activated_at) as trial_started_at
  from public.drabornpark_tags t
  where t.owner_user_id is not null and t.activated_at is not null
  group by t.owner_user_id
), dkd_paid as (
  select distinct on (s.user_id) s.user_id, s.status, s.expires_at
  from public.drabornpark_subscriptions s
  where s.status in ('PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED')
    and (s.expires_at is null or s.expires_at > now())
  order by s.user_id, s.expires_at desc nulls first, s.updated_at desc
)
update public.drabornpark_profiles p
set plus_trial_until = f.trial_started_at + interval '14 days',
    subscription_status = case
      when paid.status is not null then paid.status
      when f.trial_started_at + interval '14 days' > now() then 'PLUS_TRIAL'
      else 'BASIC'
    end,
    updated_at = now()
from dkd_first_tag f
left join dkd_paid paid on paid.user_id = f.user_id
where p.user_id = f.user_id;

with dkd_paid as (
  select distinct on (s.user_id) s.user_id, s.status
  from public.drabornpark_subscriptions s
  where s.status in ('PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED')
    and (s.expires_at is null or s.expires_at > now())
  order by s.user_id, s.expires_at desc nulls first, s.updated_at desc
)
update public.drabornpark_profiles p
set plus_trial_until = null,
    subscription_status = coalesce(paid.status,'BASIC'),
    updated_at = now()
from (select p2.user_id from public.drabornpark_profiles p2 where not exists (
  select 1 from public.drabornpark_tags t where t.owner_user_id=p2.user_id and t.activated_at is not null
)) no_tag
left join dkd_paid paid on paid.user_id=no_tag.user_id
where p.user_id=no_tag.user_id;
