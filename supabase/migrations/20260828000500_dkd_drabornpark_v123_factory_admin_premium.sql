alter table public.drabornpark_profiles
  add column if not exists dkd_admin_plus_until timestamptz;

comment on column public.drabornpark_profiles.dkd_admin_plus_until is
  'DraBornPark admin panelinden süreli olarak eklenen Plus hakkının bitiş zamanı.';

-- v1.0.23 writes one canonical physical NFC/QR address:
-- https://www.draborneagle.com/DraBornPark/tag/NNNN-NNNN
-- Legacy /t/{uuid} may remain readable by the public resolver, but it is never written again.
drop trigger if exists dkd_drabornpark_sync_public_tag_url_v101 on public.drabornpark_tags;

create or replace function public.dkd_drabornpark_enforce_nfc_url_v105()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
begin
  if new.public_alias is not null and trim(new.public_alias)<>'' then
    new.public_alias:=lower(trim(new.public_alias));
    new.nfc_url:='https://www.draborneagle.com/DraBornPark/tag/'||new.public_alias;
  end if;
  return new;
end;
$$;

update public.drabornpark_tags
set nfc_url='https://www.draborneagle.com/DraBornPark/tag/'||lower(trim(public_alias)),
    updated_at=now()
where public_alias is not null
  and trim(public_alias)<>''
  and nfc_url is distinct from 'https://www.draborneagle.com/DraBornPark/tag/'||lower(trim(public_alias));

create or replace function public.dkd_drabornpark_factory_update_tag_v123(
  dkd_tag_id uuid,
  dkd_tag_code text,
  dkd_serial_number text,
  dkd_short_code text,
  dkd_activation_pin text default null,
  dkd_factory_notes text default null,
  dkd_username text default null
)
returns jsonb
language plpgsql
security definer
set search_path='public','extensions','pg_temp'
as $$
declare
  dkd_clean_code text:=upper(trim(coalesce(dkd_tag_code,'')));
  dkd_clean_serial text:=nullif(trim(coalesce(dkd_serial_number,'')),'');
  dkd_clean_short text:=lower(trim(coalesce(dkd_short_code,'')));
  dkd_clean_pin text:=nullif(trim(coalesce(dkd_activation_pin,'')),'');
  dkd_clean_notes text:=nullif(trim(coalesce(dkd_factory_notes,'')),'');
  dkd_clean_username text:=case when dkd_username is null then null else lower(nullif(trim(dkd_username),'')) end;
  dkd_owner uuid;
  dkd_public_url text;
  dkd_friendly_url text;
  dkd_effective_username text;
begin
  if not public.drabornpark_is_admin() then raise exception 'admin_required'; end if;
  if dkd_tag_id is null then raise exception 'tag_id_required'; end if;
  if dkd_clean_code !~ '^DP-[A-Z0-9]{4,32}$' then raise exception 'tag_code_invalid'; end if;
  if dkd_clean_serial is not null and (length(dkd_clean_serial)<3 or length(dkd_clean_serial)>96) then raise exception 'serial_invalid'; end if;
  if dkd_clean_short !~ '^[0-9]{4}-[0-9]{4}$' then raise exception 'short_code_invalid'; end if;
  if dkd_clean_pin is not null and dkd_clean_pin !~ '^[0-9]{8}$' then raise exception 'activation_pin_invalid'; end if;
  if dkd_clean_notes is not null and length(dkd_clean_notes)>1500 then raise exception 'factory_notes_too_long'; end if;

  select dkd_tag.owner_user_id into dkd_owner
    from public.drabornpark_tags dkd_tag
   where dkd_tag.id=dkd_tag_id
   for update;
  if not found then raise exception 'tag_not_found'; end if;

  if exists(select 1 from public.drabornpark_tags dkd_other where dkd_other.tag_code=dkd_clean_code and dkd_other.id<>dkd_tag_id) then raise exception 'tag_code_unique'; end if;
  if dkd_clean_serial is not null and exists(select 1 from public.drabornpark_tags dkd_other where dkd_other.serial_number=dkd_clean_serial and dkd_other.id<>dkd_tag_id) then raise exception 'serial_unique'; end if;
  if exists(select 1 from public.drabornpark_tags dkd_other where lower(dkd_other.public_alias)=dkd_clean_short and dkd_other.id<>dkd_tag_id) then raise exception 'short_code_unique'; end if;
  if exists(select 1 from public.drabornpark_profiles dkd_profile where lower(dkd_profile.username)=dkd_clean_short) then raise exception 'short_code_reserved'; end if;

  if dkd_username is not null then
    if dkd_owner is null then raise exception 'tag_owner_required_for_username'; end if;
    if dkd_clean_username is null or length(dkd_clean_username)<3 or length(dkd_clean_username)>24 or dkd_clean_username !~ '^[a-z0-9._-]+$' or dkd_clean_username ~ '^[0-9]{4}-[0-9]{4}$' then raise exception 'username_invalid'; end if;
    if exists(select 1 from public.drabornpark_profiles dkd_profile where lower(dkd_profile.username)=dkd_clean_username and dkd_profile.user_id<>dkd_owner)
       or exists(select 1 from public.drabornpark_tags dkd_tag where lower(dkd_tag.public_alias)=dkd_clean_username) then
      raise exception 'username_taken';
    end if;
    update public.drabornpark_profiles
       set username=dkd_clean_username,updated_at=now()
     where user_id=dkd_owner;
  end if;

  dkd_public_url:='https://www.draborneagle.com/DraBornPark/tag/'||dkd_clean_short;

  update public.drabornpark_tags
     set tag_code=dkd_clean_code,
         serial_number=dkd_clean_serial,
         public_alias=dkd_clean_short,
         nfc_url=dkd_public_url,
         factory_notes=dkd_clean_notes,
         activation_pin_hash=case when dkd_clean_pin is null then activation_pin_hash else extensions.crypt(dkd_clean_pin,extensions.gen_salt('bf')) end,
         updated_at=now()
   where id=dkd_tag_id;

  select dkd_profile.username into dkd_effective_username
    from public.drabornpark_profiles dkd_profile
   where dkd_profile.user_id=dkd_owner;

  dkd_friendly_url:=case
    when dkd_effective_username is not null and trim(dkd_effective_username)<>''
      then 'https://www.draborneagle.com/DraBornPark/tag/'||lower(trim(dkd_effective_username))
    else null
  end;

  insert into public.drabornpark_factory_events(tag_id,actor_user_id,event_type,metadata)
  values(dkd_tag_id,auth.uid(),'TAG_V123_UPDATED',jsonb_build_object(
    'tagCode',dkd_clean_code,'serialNumber',dkd_clean_serial,'shortCode',dkd_clean_short,
    'nfcQrUrl',dkd_public_url,'friendlyUrl',dkd_friendly_url,'username',dkd_effective_username,
    'pinChanged',dkd_clean_pin is not null
  ));

  return jsonb_build_object(
    'ok',true,'tagId',dkd_tag_id,'tagCode',dkd_clean_code,'serialNumber',dkd_clean_serial,
    'shortCode',dkd_clean_short,'nfcQrUrl',dkd_public_url,'friendlyUrl',dkd_friendly_url,
    'username',dkd_effective_username,'pinChanged',dkd_clean_pin is not null
  );
end;
$$;

grant execute on function public.dkd_drabornpark_factory_update_tag_v123(uuid,text,text,text,text,text,text) to authenticated,service_role;

create or replace function public.dkd_drabornpark_user_has_plus(dkd_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path='public','pg_temp'
as $$
  select exists(
    select 1 from public.drabornpark_profiles dkd_profile
    where dkd_profile.user_id=dkd_user_id
      and (
        coalesce(dkd_profile.dkd_unlimited_plus,false)=true
        or (dkd_profile.dkd_admin_plus_until is not null and dkd_profile.dkd_admin_plus_until>now())
        or (dkd_profile.plus_trial_until is not null and dkd_profile.plus_trial_until>now())
        or exists(
          select 1 from public.drabornpark_subscriptions dkd_subscription
          where dkd_subscription.user_id=dkd_user_id
            and dkd_subscription.status in ('PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED')
            and (dkd_subscription.expires_at is null or dkd_subscription.expires_at>now())
        )
      )
  );
$$;

grant execute on function public.dkd_drabornpark_user_has_plus(uuid) to authenticated,service_role;

create or replace function public.drabornpark_has_plus()
returns boolean
language sql
stable
security definer
set search_path='public','pg_temp'
as $$
  select coalesce(public.dkd_drabornpark_user_has_plus(auth.uid()),false);
$$;

grant execute on function public.drabornpark_has_plus() to authenticated,service_role;

create or replace function public.dkd_drabornpark_admin_search_users_v123(dkd_query text default '')
returns table(
  dkd_user_id uuid,
  dkd_email text,
  dkd_username text,
  dkd_subscription_status text,
  dkd_plus_trial_until timestamptz,
  dkd_admin_plus_until timestamptz,
  dkd_unlimited_plus boolean,
  dkd_premium_until timestamptz,
  dkd_premium_days_left integer,
  dkd_tag_count bigint,
  dkd_active_tag_count bigint,
  dkd_created_at timestamptz
)
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  dkd_search text:=lower(trim(coalesce(dkd_query,'')));
begin
  if not public.drabornpark_is_admin() then raise exception 'admin_required'; end if;

  return query
  with dkd_user_rows as (
    select
      dkd_profile.user_id,
      dkd_auth.email::text as dkd_email_value,
      dkd_profile.username::text as dkd_username_value,
      dkd_profile.subscription_status::text as dkd_status_value,
      dkd_profile.plus_trial_until,
      dkd_profile.dkd_admin_plus_until,
      coalesce(dkd_profile.dkd_unlimited_plus,false) as dkd_unlimited_value,
      dkd_profile.created_at,
      count(distinct dkd_tag.id)::bigint as dkd_tag_total,
      count(distinct dkd_tag.id) filter(where dkd_tag.status='ACTIVATED')::bigint as dkd_active_total,
      max(dkd_subscription.expires_at) filter(
        where dkd_subscription.status in ('PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED')
          and (dkd_subscription.expires_at is null or dkd_subscription.expires_at>now())
      ) as dkd_subscription_until
    from public.drabornpark_profiles dkd_profile
    join auth.users dkd_auth on dkd_auth.id=dkd_profile.user_id
    left join public.drabornpark_tags dkd_tag on dkd_tag.owner_user_id=dkd_profile.user_id
    left join public.drabornpark_subscriptions dkd_subscription on dkd_subscription.user_id=dkd_profile.user_id
    where dkd_search=''
       or lower(coalesce(dkd_auth.email::text,'')) like '%'||dkd_search||'%'
       or lower(coalesce(dkd_profile.username::text,'')) like '%'||dkd_search||'%'
    group by dkd_profile.user_id,dkd_auth.email,dkd_profile.username,dkd_profile.subscription_status,
             dkd_profile.plus_trial_until,dkd_profile.dkd_admin_plus_until,dkd_profile.dkd_unlimited_plus,dkd_profile.created_at
  ), dkd_premium as (
    select dkd_user_rows.*,
      greatest(
        coalesce(dkd_user_rows.dkd_plus_trial_until,'-infinity'::timestamptz),
        coalesce(dkd_user_rows.dkd_admin_plus_until,'-infinity'::timestamptz),
        coalesce(dkd_user_rows.dkd_subscription_until,'-infinity'::timestamptz)
      ) as dkd_until
    from dkd_user_rows
  )
  select
    dkd_premium.user_id::uuid,
    dkd_premium.dkd_email_value::text,
    dkd_premium.dkd_username_value::text,
    dkd_premium.dkd_status_value::text,
    dkd_premium.dkd_plus_trial_until::timestamptz,
    dkd_premium.dkd_admin_plus_until::timestamptz,
    dkd_premium.dkd_unlimited_value::boolean,
    case when dkd_premium.dkd_until='-infinity'::timestamptz then null else dkd_premium.dkd_until end,
    case
      when dkd_premium.dkd_unlimited_value then 0
      when dkd_premium.dkd_until<=now() or dkd_premium.dkd_until='-infinity'::timestamptz then 0
      else floor(extract(epoch from (dkd_premium.dkd_until-now()))/86400)::integer
    end,
    dkd_premium.dkd_tag_total::bigint,
    dkd_premium.dkd_active_total::bigint,
    dkd_premium.created_at::timestamptz
  from dkd_premium
  order by dkd_premium.created_at desc
  limit 100;
end;
$$;

grant execute on function public.dkd_drabornpark_admin_search_users_v123(text) to authenticated,service_role;

create or replace function public.dkd_drabornpark_admin_update_user_v123(
  dkd_target_user_id uuid,
  dkd_username text default null,
  dkd_unlimited_plus boolean default null,
  dkd_premium_days_add integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  dkd_clean_username text;
  dkd_days integer:=coalesce(dkd_premium_days_add,0);
  dkd_subscription_until timestamptz;
  dkd_current_until timestamptz;
  dkd_new_admin_until timestamptz;
  dkd_profile public.drabornpark_profiles%rowtype;
begin
  if not public.drabornpark_is_admin() then raise exception 'admin_required'; end if;
  if dkd_target_user_id is null then raise exception 'user_required'; end if;
  if dkd_days<0 or dkd_days>3650 then raise exception 'premium_days_invalid'; end if;

  select * into dkd_profile from public.drabornpark_profiles
  where user_id=dkd_target_user_id for update;
  if not found then raise exception 'user_not_found'; end if;

  dkd_clean_username:=case when dkd_username is null then null else lower(trim(dkd_username)) end;
  if dkd_clean_username is not null and (length(dkd_clean_username)<3 or length(dkd_clean_username)>24 or dkd_clean_username !~ '^[a-z0-9._-]+$' or dkd_clean_username ~ '^[0-9]{4}-[0-9]{4}$') then raise exception 'invalid_username'; end if;
  if dkd_clean_username is not null and exists(select 1 from public.drabornpark_profiles dkd_other where dkd_other.user_id<>dkd_target_user_id and lower(dkd_other.username)=dkd_clean_username) then raise exception 'username_taken'; end if;
  if dkd_clean_username is not null and exists(select 1 from public.drabornpark_tags dkd_tag where lower(dkd_tag.public_alias)=dkd_clean_username) then raise exception 'username_taken'; end if;

  select max(dkd_subscription.expires_at) into dkd_subscription_until
  from public.drabornpark_subscriptions dkd_subscription
  where dkd_subscription.user_id=dkd_target_user_id
    and dkd_subscription.status in ('PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED')
    and (dkd_subscription.expires_at is null or dkd_subscription.expires_at>now());

  dkd_current_until:=greatest(
    now(),
    coalesce(dkd_profile.plus_trial_until,'-infinity'::timestamptz),
    coalesce(dkd_profile.dkd_admin_plus_until,'-infinity'::timestamptz),
    coalesce(dkd_subscription_until,'-infinity'::timestamptz)
  );
  dkd_new_admin_until:=case when dkd_days>0 then dkd_current_until+make_interval(days=>dkd_days) else dkd_profile.dkd_admin_plus_until end;

  update public.drabornpark_profiles
  set username=case when dkd_username is null then username else nullif(dkd_clean_username,'') end,
      dkd_unlimited_plus=coalesce($3,dkd_unlimited_plus),
      dkd_admin_plus_until=dkd_new_admin_until,
      updated_at=now()
  where user_id=dkd_target_user_id
  returning * into dkd_profile;

  perform public.dkd_drabornpark_sync_plus_tags_internal(dkd_target_user_id);

  return jsonb_build_object(
    'ok',true,'userId',dkd_profile.user_id,'username',dkd_profile.username,
    'unlimitedPlus',dkd_profile.dkd_unlimited_plus,'subscriptionStatus',dkd_profile.subscription_status,
    'trialUntil',dkd_profile.plus_trial_until,'adminPlusUntil',dkd_profile.dkd_admin_plus_until,
    'premiumDaysAdded',dkd_days
  );
end;
$$;

grant execute on function public.dkd_drabornpark_admin_update_user_v123(uuid,text,boolean,integer) to authenticated,service_role;
