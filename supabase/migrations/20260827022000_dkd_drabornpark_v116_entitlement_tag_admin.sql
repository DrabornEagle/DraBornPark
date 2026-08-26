alter table public.drabornpark_profiles
  add column if not exists dkd_unlimited_plus boolean not null default false;

alter table public.drabornpark_tags
  add column if not exists dkd_subscription_suspended_at timestamptz,
  add column if not exists dkd_subscription_previous_status text;

create or replace function public.dkd_drabornpark_user_has_plus(dkd_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select exists(
    select 1
    from public.drabornpark_profiles dkd_profile
    where dkd_profile.user_id=dkd_user_id
      and (
        coalesce(dkd_profile.dkd_unlimited_plus,false)=true
        or (dkd_profile.plus_trial_until is not null and dkd_profile.plus_trial_until>now())
        or exists(
          select 1
          from public.drabornpark_subscriptions dkd_subscription
          where dkd_subscription.user_id=dkd_user_id
            and dkd_subscription.status in ('PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED')
            and (dkd_subscription.expires_at is null or dkd_subscription.expires_at>now())
        )
      )
  );
$$;

create or replace function public.dkd_drabornpark_sync_plus_tags_internal(dkd_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  dkd_has_plus boolean;
  dkd_changed integer:=0;
begin
  if dkd_user_id is null then return jsonb_build_object('ok',false,'reason','missing_user'); end if;
  dkd_has_plus:=public.dkd_drabornpark_user_has_plus(dkd_user_id);

  if dkd_has_plus then
    update public.drabornpark_tags
       set status=case
             when dkd_subscription_previous_status='TRANSFER_PENDING' and transfer_expires_at is not null and transfer_expires_at<=now() then 'ACTIVATED'
             when dkd_subscription_previous_status in ('ACTIVATED','TRANSFER_PENDING') then dkd_subscription_previous_status
             else 'ACTIVATED'
           end,
           transfer_token_hash=case when dkd_subscription_previous_status='TRANSFER_PENDING' and transfer_expires_at is not null and transfer_expires_at<=now() then null else transfer_token_hash end,
           transfer_started_at=case when dkd_subscription_previous_status='TRANSFER_PENDING' and transfer_expires_at is not null and transfer_expires_at<=now() then null else transfer_started_at end,
           transfer_expires_at=case when dkd_subscription_previous_status='TRANSFER_PENDING' and transfer_expires_at is not null and transfer_expires_at<=now() then null else transfer_expires_at end,
           dkd_subscription_suspended_at=null,
           dkd_subscription_previous_status=null,
           disabled_at=null,
           updated_at=now()
     where owner_user_id=dkd_user_id
       and dkd_subscription_suspended_at is not null;
    get diagnostics dkd_changed=row_count;
  else
    update public.drabornpark_tags
       set dkd_subscription_previous_status=status,
           dkd_subscription_suspended_at=now(),
           status='DISABLED',
           disabled_at=now(),
           updated_at=now()
     where owner_user_id=dkd_user_id
       and dkd_subscription_suspended_at is null
       and status in ('ACTIVATED','TRANSFER_PENDING');
    get diagnostics dkd_changed=row_count;
  end if;

  return jsonb_build_object('ok',true,'plusActive',dkd_has_plus,'changed',dkd_changed);
end;
$$;

create or replace function public.dkd_drabornpark_sync_plus_tags()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare dkd_user_id uuid:=auth.uid();
begin
  if dkd_user_id is null then raise exception 'authentication_required'; end if;
  return public.dkd_drabornpark_sync_plus_tags_internal(dkd_user_id);
end;
$$;

create or replace function public.dkd_drabornpark_entitlement_tag_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare dkd_user_id uuid;
begin
  dkd_user_id:=coalesce(new.user_id,old.user_id);
  perform public.dkd_drabornpark_sync_plus_tags_internal(dkd_user_id);
  return coalesce(new,old);
end;
$$;

drop trigger if exists dkd_drabornpark_profile_entitlement_tag_sync on public.drabornpark_profiles;
create trigger dkd_drabornpark_profile_entitlement_tag_sync
after update of plus_trial_until,subscription_status,dkd_unlimited_plus on public.drabornpark_profiles
for each row execute function public.dkd_drabornpark_entitlement_tag_trigger();

drop trigger if exists dkd_drabornpark_subscription_entitlement_tag_sync on public.drabornpark_subscriptions;
create trigger dkd_drabornpark_subscription_entitlement_tag_sync
after insert or update or delete on public.drabornpark_subscriptions
for each row execute function public.dkd_drabornpark_entitlement_tag_trigger();

create or replace function public.dkd_drabornpark_admin_search_users(dkd_query text default '')
returns table(
  dkd_user_id uuid,
  dkd_email text,
  dkd_username text,
  dkd_display_name text,
  dkd_subscription_status text,
  dkd_plus_trial_until timestamptz,
  dkd_unlimited_plus boolean,
  dkd_tag_count bigint,
  dkd_active_tag_count bigint,
  dkd_created_at timestamptz
)
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare dkd_search text:=lower(trim(coalesce(dkd_query,'')));
begin
  if not public.drabornpark_is_admin() then raise exception 'admin_required'; end if;
  return query
  select dkd_profile.user_id,
         dkd_auth.email,
         dkd_profile.username,
         dkd_profile.display_name,
         dkd_profile.subscription_status,
         dkd_profile.plus_trial_until,
         coalesce(dkd_profile.dkd_unlimited_plus,false),
         count(dkd_tag.id),
         count(dkd_tag.id) filter(where dkd_tag.status='ACTIVATED'),
         dkd_profile.created_at
    from public.drabornpark_profiles dkd_profile
    join auth.users dkd_auth on dkd_auth.id=dkd_profile.user_id
    left join public.drabornpark_tags dkd_tag on dkd_tag.owner_user_id=dkd_profile.user_id
   where dkd_search=''
      or lower(coalesce(dkd_auth.email,'')) like '%'||dkd_search||'%'
      or lower(coalesce(dkd_profile.username,'')) like '%'||dkd_search||'%'
      or lower(coalesce(dkd_profile.display_name,'')) like '%'||dkd_search||'%'
   group by dkd_profile.user_id,dkd_auth.email,dkd_profile.username,dkd_profile.display_name,
            dkd_profile.subscription_status,dkd_profile.plus_trial_until,dkd_profile.dkd_unlimited_plus,dkd_profile.created_at
   order by dkd_profile.created_at desc
   limit 100;
end;
$$;

create or replace function public.dkd_drabornpark_admin_set_unlimited_plus(dkd_target_user_id uuid,dkd_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.drabornpark_is_admin() then raise exception 'admin_required'; end if;
  update public.drabornpark_profiles
     set dkd_unlimited_plus=coalesce(dkd_enabled,false),updated_at=now()
   where user_id=dkd_target_user_id;
  if not found then raise exception 'user_not_found'; end if;
  perform public.dkd_drabornpark_sync_plus_tags_internal(dkd_target_user_id);
  return jsonb_build_object('ok',true,'userId',dkd_target_user_id,'unlimitedPlus',coalesce(dkd_enabled,false));
end;
$$;

create or replace function public.dkd_drabornpark_admin_update_user(
  dkd_target_user_id uuid,
  dkd_username text default null,
  dkd_display_name text default null,
  dkd_unlimited_plus boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare dkd_clean_username text;
begin
  if not public.drabornpark_is_admin() then raise exception 'admin_required'; end if;
  if dkd_target_user_id is null then raise exception 'user_required'; end if;
  dkd_clean_username:=case when dkd_username is null then null else lower(trim(dkd_username)) end;
  if dkd_clean_username is not null and (length(dkd_clean_username)<3 or length(dkd_clean_username)>24 or dkd_clean_username !~ '^[a-z0-9._-]+$') then raise exception 'invalid_username'; end if;
  if dkd_clean_username is not null and exists(select 1 from public.drabornpark_profiles dkd_other where dkd_other.user_id<>dkd_target_user_id and dkd_other.username=dkd_clean_username) then raise exception 'username_taken'; end if;

  update public.drabornpark_profiles
     set username=case when dkd_username is null then username else nullif(dkd_clean_username,'') end,
         display_name=case when dkd_display_name is null then display_name else nullif(trim(dkd_display_name),'') end,
         dkd_unlimited_plus=coalesce(dkd_unlimited_plus,dkd_unlimited_plus),
         updated_at=now()
   where user_id=dkd_target_user_id;
  if not found then raise exception 'user_not_found'; end if;
  perform public.dkd_drabornpark_sync_plus_tags_internal(dkd_target_user_id);

  return (select jsonb_build_object(
    'ok',true,'userId',dkd_profile.user_id,'username',dkd_profile.username,'displayName',dkd_profile.display_name,
    'unlimitedPlus',dkd_profile.dkd_unlimited_plus,'subscriptionStatus',dkd_profile.subscription_status,'trialUntil',dkd_profile.plus_trial_until
  ) from public.drabornpark_profiles dkd_profile where dkd_profile.user_id=dkd_target_user_id);
end;
$$;

grant execute on function public.dkd_drabornpark_user_has_plus(uuid) to authenticated,anon;
grant execute on function public.dkd_drabornpark_sync_plus_tags() to authenticated;
grant execute on function public.dkd_drabornpark_admin_search_users(text) to authenticated;
grant execute on function public.dkd_drabornpark_admin_set_unlimited_plus(uuid,boolean) to authenticated;
grant execute on function public.dkd_drabornpark_admin_update_user(uuid,text,text,boolean) to authenticated;

create or replace function public.drabornpark_public_tag_snapshot(drabornpark_tag_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  dkd_result jsonb;
  dkd_input text:=trim(coalesce(drabornpark_tag_code,''));
  dkd_code text;
  dkd_slug text;
  dkd_token uuid;
begin
  if dkd_input='' then return null; end if;
  dkd_input:=regexp_replace(dkd_input,'^https://www\.draborneagle\.com/DraBornPark/tag/','','i');
  dkd_input:=regexp_replace(dkd_input,'^https://www\.draborneagle\.com/DraBornPark/t/','','i');
  dkd_slug:=lower(trim(dkd_input));
  begin dkd_token:=dkd_input::uuid; exception when others then dkd_token:=null; end;
  dkd_code:=upper(regexp_replace(dkd_input,'^DP-','','i'));
  dkd_code:='DP-'||regexp_replace(dkd_code,'[^A-Z0-9]','','g');

  select jsonb_build_object(
    'tagCode',dkd_tag.tag_code,
    'publicToken',dkd_tag.dkd_public_token,
    'shortCode',dkd_tag.public_alias,
    'nfcConnectionCode',dkd_tag.public_alias,
    'publicUrl',dkd_tag.nfc_url,
    'physicalUrl',dkd_tag.nfc_url,
    'friendlyUrl',case when dkd_tag.status='ACTIVATED' and nullif(trim(dkd_profile.username),'') is not null then 'https://www.draborneagle.com/DraBornPark/tag/'||lower(dkd_profile.username) else dkd_tag.nfc_url end,
    'username',case when dkd_tag.status='ACTIVATED' then dkd_profile.username else null end,
    'status',dkd_tag.status,
    'activated',dkd_tag.status='ACTIVATED',
    'ownerAvatarUrl',case when dkd_tag.status='ACTIVATED' then dkd_profile.avatar_url else null end,
    'vehicle',case when dkd_tag.status='ACTIVATED' then jsonb_build_object(
      'type',dkd_vehicle.vehicle_type,
      'name',case when coalesce((dkd_vehicle.public_fields->>'brandModel')::boolean,true) then dkd_vehicle.vehicle_name else null end,
      'plate',case when coalesce((dkd_vehicle.public_fields->>'plate')::boolean,true) then dkd_vehicle.plate else null end,
      'brand',case when coalesce((dkd_vehicle.public_fields->>'brandModel')::boolean,true) then dkd_vehicle.brand else null end,
      'model',case when coalesce((dkd_vehicle.public_fields->>'brandModel')::boolean,true) then dkd_vehicle.model else null end,
      'color',case when coalesce((dkd_vehicle.public_fields->>'color')::boolean,true) then dkd_vehicle.color else null end
    ) else null end
  ) into dkd_result
  from public.drabornpark_tags dkd_tag
  left join public.drabornpark_vehicles dkd_vehicle on dkd_vehicle.id=dkd_tag.vehicle_id
  left join public.drabornpark_profiles dkd_profile on dkd_profile.user_id=dkd_tag.owner_user_id
  where public.dkd_drabornpark_user_has_plus(dkd_tag.owner_user_id)
    and ((dkd_token is not null and dkd_tag.dkd_public_token=dkd_token)
      or dkd_tag.tag_code=dkd_code
      or lower(dkd_tag.public_alias)=dkd_slug
      or (dkd_tag.status='ACTIVATED' and lower(dkd_profile.username)=dkd_slug))
  order by case
    when lower(dkd_tag.public_alias)=dkd_slug then 0
    when dkd_tag.status='ACTIVATED' and lower(dkd_profile.username)=dkd_slug then 1
    when dkd_token is not null and dkd_tag.dkd_public_token=dkd_token then 2
    else 3 end,
    dkd_tag.activated_at desc nulls last,
    dkd_tag.created_at desc
  limit 1;

  return dkd_result;
end;
$$;

do $$
declare dkd_user record;
begin
  for dkd_user in select user_id from public.drabornpark_profiles loop
    perform public.dkd_drabornpark_sync_plus_tags_internal(dkd_user.user_id);
  end loop;
end $$;
