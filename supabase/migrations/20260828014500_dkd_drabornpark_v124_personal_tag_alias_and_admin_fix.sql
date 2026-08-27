alter table public.drabornpark_tags
  add column if not exists dkd_personal_alias text;

comment on column public.drabornpark_tags.dkd_personal_alias is
  'Etikete özel opsiyonel kişisel URL adı. Fiziksel NFC/QR public_alias kodundan bağımsızdır.';

create unique index if not exists dkd_drabornpark_tags_personal_alias_unique
  on public.drabornpark_tags (lower(dkd_personal_alias))
  where dkd_personal_alias is not null and trim(dkd_personal_alias)<>'';

with dkd_ranked as (
  select dkd_tag.id,
         lower(trim(dkd_profile.username)) as dkd_alias,
         row_number() over (
           partition by lower(trim(dkd_profile.username))
           order by dkd_tag.activated_at desc nulls last,dkd_tag.created_at desc
         ) as dkd_rank
  from public.drabornpark_tags dkd_tag
  join public.drabornpark_profiles dkd_profile on dkd_profile.user_id=dkd_tag.owner_user_id
  where nullif(trim(dkd_profile.username),'') is not null
    and dkd_tag.dkd_personal_alias is null
)
update public.drabornpark_tags dkd_tag
set dkd_personal_alias=dkd_ranked.dkd_alias,updated_at=now()
from dkd_ranked
where dkd_tag.id=dkd_ranked.id
  and dkd_ranked.dkd_rank=1
  and dkd_ranked.dkd_alias !~ '^[0-9]{4}-[0-9]{4}$'
  and not exists(
    select 1 from public.drabornpark_tags dkd_collision
    where lower(dkd_collision.public_alias)=dkd_ranked.dkd_alias
  );

create or replace function public.dkd_drabornpark_factory_update_tag_v124(
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
begin
  if not public.drabornpark_is_admin() then raise exception 'admin_required'; end if;
  if dkd_tag_id is null then raise exception 'tag_id_required'; end if;
  if dkd_clean_code !~ '^DP-[A-Z0-9]{4,32}$' then raise exception 'tag_code_invalid'; end if;
  if dkd_clean_serial is not null and (length(dkd_clean_serial)<3 or length(dkd_clean_serial)>96) then raise exception 'serial_invalid'; end if;
  if dkd_clean_short !~ '^[0-9]{4}-[0-9]{4}$' then raise exception 'short_code_invalid'; end if;
  if dkd_clean_pin is not null and dkd_clean_pin !~ '^[0-9]{8}$' then raise exception 'activation_pin_invalid'; end if;
  if dkd_clean_notes is not null and length(dkd_clean_notes)>1500 then raise exception 'factory_notes_too_long'; end if;
  if dkd_clean_username is not null and (
    length(dkd_clean_username)<3 or length(dkd_clean_username)>24
    or dkd_clean_username !~ '^[a-z0-9._-]+$'
    or dkd_clean_username ~ '^[0-9]{4}-[0-9]{4}$'
  ) then raise exception 'username_invalid'; end if;

  select dkd_tag.owner_user_id into dkd_owner
  from public.drabornpark_tags dkd_tag
  where dkd_tag.id=dkd_tag_id
  for update;
  if not found then raise exception 'tag_not_found'; end if;

  if exists(select 1 from public.drabornpark_tags dkd_other where dkd_other.tag_code=dkd_clean_code and dkd_other.id<>dkd_tag_id) then raise exception 'tag_code_unique'; end if;
  if dkd_clean_serial is not null and exists(select 1 from public.drabornpark_tags dkd_other where dkd_other.serial_number=dkd_clean_serial and dkd_other.id<>dkd_tag_id) then raise exception 'serial_unique'; end if;
  if exists(select 1 from public.drabornpark_tags dkd_other where lower(dkd_other.public_alias)=dkd_clean_short and dkd_other.id<>dkd_tag_id) then raise exception 'short_code_unique'; end if;
  if exists(select 1 from public.drabornpark_tags dkd_other where lower(coalesce(dkd_other.dkd_personal_alias,''))=dkd_clean_short and dkd_other.id<>dkd_tag_id) then raise exception 'short_code_reserved'; end if;
  if exists(select 1 from public.drabornpark_profiles dkd_profile where lower(coalesce(dkd_profile.username,''))=dkd_clean_short) then raise exception 'short_code_reserved'; end if;

  if dkd_clean_username is not null then
    if exists(select 1 from public.drabornpark_tags dkd_other where lower(dkd_other.public_alias)=dkd_clean_username) then raise exception 'username_taken'; end if;
    if exists(select 1 from public.drabornpark_tags dkd_other where lower(coalesce(dkd_other.dkd_personal_alias,''))=dkd_clean_username and dkd_other.id<>dkd_tag_id) then raise exception 'username_taken'; end if;
    if exists(
      select 1 from public.drabornpark_profiles dkd_profile
      where lower(coalesce(dkd_profile.username,''))=dkd_clean_username
        and (dkd_owner is null or dkd_profile.user_id<>dkd_owner)
    ) then raise exception 'username_taken'; end if;
  end if;

  dkd_public_url:='https://www.draborneagle.com/DraBornPark/tag/'||dkd_clean_short;
  dkd_friendly_url:=case when dkd_clean_username is not null
    then 'https://www.draborneagle.com/DraBornPark/tag/'||dkd_clean_username
    else null end;

  update public.drabornpark_tags
  set tag_code=dkd_clean_code,
      serial_number=dkd_clean_serial,
      public_alias=dkd_clean_short,
      nfc_url=dkd_public_url,
      dkd_personal_alias=dkd_clean_username,
      factory_notes=dkd_clean_notes,
      activation_pin_hash=case when dkd_clean_pin is null then activation_pin_hash else extensions.crypt(dkd_clean_pin,extensions.gen_salt('bf')) end,
      updated_at=now()
  where id=dkd_tag_id;

  insert into public.drabornpark_factory_events(tag_id,actor_user_id,event_type,metadata)
  values(dkd_tag_id,auth.uid(),'TAG_V124_UPDATED',jsonb_build_object(
    'tagCode',dkd_clean_code,'serialNumber',dkd_clean_serial,'shortCode',dkd_clean_short,
    'nfcQrUrl',dkd_public_url,'friendlyUrl',dkd_friendly_url,'personalAlias',dkd_clean_username,
    'pinChanged',dkd_clean_pin is not null
  ));

  return jsonb_build_object(
    'ok',true,'tagId',dkd_tag_id,'tagCode',dkd_clean_code,'serialNumber',dkd_clean_serial,
    'shortCode',dkd_clean_short,'nfcQrUrl',dkd_public_url,'friendlyUrl',dkd_friendly_url,
    'personalAlias',dkd_clean_username,'pinChanged',dkd_clean_pin is not null
  );
end;
$$;

grant execute on function public.dkd_drabornpark_factory_update_tag_v124(uuid,text,text,text,text,text,text) to authenticated,service_role;

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
set search_path='public','pg_temp'
as $$
begin
  return public.dkd_drabornpark_factory_update_tag_v124(
    dkd_tag_id,dkd_tag_code,dkd_serial_number,dkd_short_code,
    dkd_activation_pin,dkd_factory_notes,dkd_username
  );
end;
$$;

grant execute on function public.dkd_drabornpark_factory_update_tag_v123(uuid,text,text,text,text,text,text) to authenticated,service_role;

create or replace function public.drabornpark_public_tag_snapshot(drabornpark_tag_code text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
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
  begin dkd_token:=dkd_input::uuid;
  exception when others then dkd_token:=null;
  end;
  dkd_code:=upper(regexp_replace(dkd_input,'^DP-','','i'));
  dkd_code:='DP-'||regexp_replace(dkd_code,'[^A-Z0-9]','','g');

  select jsonb_build_object(
    'tagCode',dkd_tag.tag_code,
    'publicToken',dkd_tag.dkd_public_token,
    'shortCode',dkd_tag.public_alias,
    'nfcConnectionCode',dkd_tag.public_alias,
    'publicUrl',dkd_tag.nfc_url,
    'physicalUrl',dkd_tag.nfc_url,
    'friendlyUrl',case
      when nullif(trim(dkd_tag.dkd_personal_alias),'') is not null then 'https://www.draborneagle.com/DraBornPark/tag/'||lower(dkd_tag.dkd_personal_alias)
      when dkd_tag.status='ACTIVATED' and nullif(trim(dkd_profile.username),'') is not null then 'https://www.draborneagle.com/DraBornPark/tag/'||lower(dkd_profile.username)
      else dkd_tag.nfc_url
    end,
    'personalAlias',dkd_tag.dkd_personal_alias,
    'username',case
      when nullif(trim(dkd_tag.dkd_personal_alias),'') is not null then dkd_tag.dkd_personal_alias
      when dkd_tag.status='ACTIVATED' then dkd_profile.username
      else null
    end,
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
  where (dkd_token is not null and dkd_tag.dkd_public_token=dkd_token)
     or dkd_tag.tag_code=dkd_code
     or lower(dkd_tag.public_alias)=dkd_slug
     or lower(coalesce(dkd_tag.dkd_personal_alias,''))=dkd_slug
     or (dkd_tag.status='ACTIVATED' and lower(coalesce(dkd_profile.username,''))=dkd_slug)
  order by case
    when lower(dkd_tag.public_alias)=dkd_slug then 0
    when lower(coalesce(dkd_tag.dkd_personal_alias,''))=dkd_slug then 1
    when dkd_tag.status='ACTIVATED' and lower(coalesce(dkd_profile.username,''))=dkd_slug then 2
    when dkd_token is not null and dkd_tag.dkd_public_token=dkd_token then 3
    else 4
  end,
  dkd_tag.activated_at desc nulls last,
  dkd_tag.created_at desc
  limit 1;
  return dkd_result;
end;
$$;

revoke all on function public.drabornpark_public_tag_snapshot(text) from public,anon,authenticated;
grant execute on function public.drabornpark_public_tag_snapshot(text) to service_role;

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
    select dkd_profile.user_id,
           dkd_auth.email::text as dkd_email_value,
           dkd_profile.username::text as dkd_username_value,
           dkd_profile.subscription_status::text as dkd_status_value,
           dkd_profile.plus_trial_until as dkd_plus_trial_until,
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
  select dkd_premium.user_id::uuid,
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
           else ceil(extract(epoch from (dkd_premium.dkd_until-now()))/86400.0)::integer
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
