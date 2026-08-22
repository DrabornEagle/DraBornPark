create or replace function public.drabornpark_bootstrap_user(
  drabornpark_display_name text default null,
  drabornpark_username text default null,
  drabornpark_avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  drabornpark_uid uuid := auth.uid();
  drabornpark_email text := lower(nullif(trim(auth.jwt() ->> 'email'), ''));
  drabornpark_requested_username text := lower(nullif(trim(drabornpark_username), ''));
  drabornpark_fallback_username text;
  drabornpark_phone text := nullif(trim(auth.jwt() -> 'user_metadata' ->> 'phone_e164'), '');
  drabornpark_profile public.drabornpark_profiles%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  if drabornpark_phone is not null and drabornpark_phone !~ '^\+[1-9][0-9]{7,14}$' then drabornpark_phone := null; end if;

  if drabornpark_requested_username is null then
    drabornpark_fallback_username := lower(nullif(trim(coalesce(
      auth.jwt() -> 'user_metadata' ->> 'username',
      drabornpark_display_name,
      split_part(coalesce(drabornpark_email, ''), '@', 1)
    )), ''));
    drabornpark_fallback_username := regexp_replace(coalesce(drabornpark_fallback_username, ''), '[^a-z0-9._-]+', '', 'g');
    if length(drabornpark_fallback_username) < 3 then
      drabornpark_fallback_username := 'user_' || substr(replace(drabornpark_uid::text, '-', ''), 1, 10);
    end if;
    drabornpark_requested_username := left(drabornpark_fallback_username, 24);
    if exists (
      select 1 from public.drabornpark_profiles dkd_profile
      where lower(dkd_profile.username) = drabornpark_requested_username
        and dkd_profile.user_id <> drabornpark_uid
    ) then
      drabornpark_requested_username := left(drabornpark_requested_username, 17) || '_' || substr(replace(drabornpark_uid::text, '-', ''), 1, 6);
    end if;
  else
    if length(drabornpark_requested_username) < 3
       or length(drabornpark_requested_username) > 24
       or drabornpark_requested_username !~ '^[a-z0-9._-]+$' then
      raise exception 'username_invalid';
    end if;
    if exists (
      select 1 from public.drabornpark_profiles dkd_profile
      where lower(dkd_profile.username) = drabornpark_requested_username
        and dkd_profile.user_id <> drabornpark_uid
    ) then
      raise exception 'username_taken';
    end if;
  end if;

  insert into public.drabornpark_profiles(
    user_id, display_name, username, avatar_url, phone_e164, subscription_status, plus_trial_until
  ) values (
    drabornpark_uid,
    coalesce(nullif(trim(drabornpark_display_name), ''), drabornpark_requested_username),
    drabornpark_requested_username,
    nullif(trim(drabornpark_avatar_url), ''),
    drabornpark_phone,
    'BASIC',
    null
  )
  on conflict (user_id) do update set
    display_name = coalesce(nullif(trim(excluded.display_name), ''), public.drabornpark_profiles.display_name),
    username = coalesce(excluded.username, public.drabornpark_profiles.username),
    avatar_url = coalesce(excluded.avatar_url, public.drabornpark_profiles.avatar_url),
    phone_e164 = coalesce(public.drabornpark_profiles.phone_e164, excluded.phone_e164),
    updated_at = now();

  if drabornpark_email is not null then
    update public.drabornpark_family_members
    set member_user_id = drabornpark_uid, status = 'active', updated_at = now()
    where lower(invite_email) = drabornpark_email
      and owner_user_id <> drabornpark_uid
      and status = 'invited'
      and (member_user_id is null or member_user_id = drabornpark_uid);
  end if;

  select * into drabornpark_profile
  from public.drabornpark_profiles
  where user_id = drabornpark_uid;

  return to_jsonb(drabornpark_profile);
end;
$$;

create or replace function public.drabornpark_activate_tag(
  drabornpark_tag_code text,
  drabornpark_pin text,
  drabornpark_vehicle_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  drabornpark_user_id uuid := auth.uid();
  drabornpark_tag public.drabornpark_tags%rowtype;
  drabornpark_trial_until timestamptz;
begin
  if drabornpark_user_id is null then raise exception 'Authentication required'; end if;

  if not exists (
    select 1 from public.drabornpark_vehicles dkd_vehicle
    where dkd_vehicle.id = drabornpark_vehicle_id
      and dkd_vehicle.owner_user_id = drabornpark_user_id
  ) then
    raise exception 'Vehicle not found';
  end if;

  select * into drabornpark_tag
  from public.drabornpark_tags dkd_tag
  where dkd_tag.tag_code = upper(trim(drabornpark_tag_code))
  for update;

  if drabornpark_tag.id is null then raise exception 'Tag not found'; end if;
  if drabornpark_tag.status in ('ACTIVATED', 'DISABLED') then raise exception 'Tag is not available for activation'; end if;

  if extensions.crypt(regexp_replace(drabornpark_pin, '[^0-9]', '', 'g'), drabornpark_tag.activation_pin_hash) <> drabornpark_tag.activation_pin_hash then
    raise exception 'Invalid activation PIN';
  end if;

  update public.drabornpark_tags
  set owner_user_id = drabornpark_user_id,
      vehicle_id = drabornpark_vehicle_id,
      status = 'ACTIVATED',
      activated_at = coalesce(activated_at, now()),
      updated_at = now()
  where id = drabornpark_tag.id;

  update public.drabornpark_profiles
  set plus_trial_until = greatest(coalesce(plus_trial_until, now()), now()) + interval '14 days',
      subscription_status = case
        when subscription_status in ('PLUS_ACTIVE', 'ACTIVE', 'PLUS') then subscription_status
        else 'PLUS_TRIAL'
      end,
      updated_at = now()
  where user_id = drabornpark_user_id
  returning plus_trial_until into drabornpark_trial_until;

  insert into public.drabornpark_timeline_events(owner_user_id, vehicle_id, event_type, title, description, metadata)
  values (
    drabornpark_user_id,
    drabornpark_vehicle_id,
    'TAG_ACTIVATED',
    'DraBornPark etiketi aktive edildi',
    'Etiket aracınıza güvenle bağlandı. 14 günlük DraBornPark+ aktivasyon ödülü eklendi.',
    jsonb_build_object('tagCode', drabornpark_tag.tag_code, 'plusRewardDays', 14, 'plusTrialUntil', drabornpark_trial_until)
  );

  insert into public.drabornpark_factory_events(tag_id, actor_user_id, event_type, metadata)
  values (
    drabornpark_tag.id,
    drabornpark_user_id,
    'TAG_ACTIVATED',
    jsonb_build_object('vehicleId', drabornpark_vehicle_id, 'plusRewardDays', 14, 'plusTrialUntil', drabornpark_trial_until)
  );

  return jsonb_build_object(
    'ok', true,
    'tagCode', drabornpark_tag.tag_code,
    'vehicleId', drabornpark_vehicle_id,
    'plusRewardDays', 14,
    'plusTrialUntil', drabornpark_trial_until
  );
end;
$$;
