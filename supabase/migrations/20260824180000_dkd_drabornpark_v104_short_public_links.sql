-- DraBornPark v1.0.4
-- Permanent physical NFC/QR links use a short per-tag code under /DraBornPark/tag/.
-- Usernames remain optional, unique friendly aliases and are never required by the physical tag.

create or replace function public.dkd_drabornpark_new_short_code_v104()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare dkd_candidate text; dkd_attempt integer;
begin
  for dkd_attempt in 1..250 loop
    dkd_candidate := lpad((floor(random()*10000))::int::text,4,'0') || '-' || lpad((floor(random()*10000))::int::text,4,'0');
    if not exists(select 1 from public.drabornpark_tags t where lower(t.public_alias)=lower(dkd_candidate))
       and not exists(select 1 from public.drabornpark_profiles p where lower(p.username)=lower(dkd_candidate)) then return dkd_candidate; end if;
  end loop;
  raise exception 'short_code_generation_failed';
end;
$$;
revoke all on function public.dkd_drabornpark_new_short_code_v104() from public, anon, authenticated;

do $$
declare dkd_row record; dkd_short text;
begin
  for dkd_row in select id from public.drabornpark_tags where public_alias is null or trim(public_alias)='' loop
    dkd_short := public.dkd_drabornpark_new_short_code_v104();
    update public.drabornpark_tags set public_alias=dkd_short,nfc_url='https://www.draborneagle.com/DraBornPark/tag/'||dkd_short,updated_at=now() where id=dkd_row.id;
  end loop;
  update public.drabornpark_tags set nfc_url='https://www.draborneagle.com/DraBornPark/tag/'||public_alias,updated_at=now()
   where public_alias is not null and nfc_url is distinct from ('https://www.draborneagle.com/DraBornPark/tag/'||public_alias);
end;
$$;

create or replace function public.drabornpark_factory_create_tag(drabornpark_serial_number text default null::text)
returns table(tag_code text, serial_number text, nfc_url text, activation_pin text)
language plpgsql security definer set search_path=public,extensions,pg_temp
as $$
declare dkd_code text; dkd_serial text; dkd_pin text; dkd_tag_id uuid; dkd_public_token uuid:=gen_random_uuid(); dkd_short_code text; dkd_public_url text;
begin
  if not public.drabornpark_is_admin() then raise exception 'DraBornPark admin role required'; end if;
  loop dkd_code:='DP-'||upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,8)); exit when not exists(select 1 from public.drabornpark_tags dpt where dpt.tag_code=dkd_code); end loop;
  dkd_serial:=coalesce(nullif(trim(drabornpark_serial_number),''),'DPS-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(encode(extensions.gen_random_bytes(6),'hex'),1,8)));
  dkd_pin:=lpad((floor(random()*100000000))::bigint::text,8,'0');
  dkd_short_code:=public.dkd_drabornpark_new_short_code_v104();
  dkd_public_url:='https://www.draborneagle.com/DraBornPark/tag/'||dkd_short_code;
  insert into public.drabornpark_tags(tag_code,serial_number,nfc_url,activation_pin_hash,status,dkd_public_token,public_alias)
  values(dkd_code,dkd_serial,dkd_public_url,extensions.crypt(dkd_pin,extensions.gen_salt('bf')),'NFC_PENDING',dkd_public_token,dkd_short_code) returning id into dkd_tag_id;
  insert into public.drabornpark_factory_events(tag_id,actor_user_id,event_type,metadata)
  values(dkd_tag_id,auth.uid(),'TAG_CREATED_V104',jsonb_build_object('serialNumber',dkd_serial,'publicToken',dkd_public_token,'shortCode',dkd_short_code,'publicUrl',dkd_public_url));
  return query select dkd_code,dkd_serial,dkd_public_url,dkd_pin;
end;
$$;

create or replace function public.drabornpark_public_tag_snapshot(drabornpark_tag_code text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare dkd_result jsonb; dkd_input text:=trim(coalesce(drabornpark_tag_code,'')); dkd_code text; dkd_slug text; dkd_token uuid;
begin
  if dkd_input='' then return null; end if;
  dkd_input:=regexp_replace(dkd_input,'^https://www\.draborneagle\.com/DraBornPark/tag/','','i');
  dkd_input:=regexp_replace(dkd_input,'^https://www\.draborneagle\.com/DraBornPark/t/','','i');
  dkd_slug:=lower(trim(dkd_input));
  begin dkd_token:=dkd_input::uuid; exception when others then dkd_token:=null; end;
  dkd_code:=upper(regexp_replace(dkd_input,'^DP-','','i')); dkd_code:='DP-'||regexp_replace(dkd_code,'[^A-Z0-9]','','g');
  select jsonb_build_object(
    'tagCode',t.tag_code,'publicToken',t.dkd_public_token,'shortCode',t.public_alias,'publicUrl',t.nfc_url,'physicalUrl',t.nfc_url,
    'friendlyUrl',case when nullif(trim(p.username),'') is not null then 'https://www.draborneagle.com/DraBornPark/tag/'||lower(p.username) else t.nfc_url end,
    'username',case when t.status='ACTIVATED' then p.username else null end,'status',t.status,'activated',t.status='ACTIVATED',
    'ownerAvatarUrl',case when t.status='ACTIVATED' then p.avatar_url else null end,
    'vehicle',case when t.status='ACTIVATED' then jsonb_build_object(
      'type',v.vehicle_type,'name',case when coalesce((v.public_fields->>'brandModel')::boolean,true) then v.vehicle_name else null end,
      'plate',case when coalesce((v.public_fields->>'plate')::boolean,true) then v.plate else null end,
      'brand',case when coalesce((v.public_fields->>'brandModel')::boolean,true) then v.brand else null end,
      'model',case when coalesce((v.public_fields->>'brandModel')::boolean,true) then v.model else null end,
      'color',case when coalesce((v.public_fields->>'color')::boolean,true) then v.color else null end) else null end)
  into dkd_result
  from public.drabornpark_tags t left join public.drabornpark_vehicles v on v.id=t.vehicle_id left join public.drabornpark_profiles p on p.user_id=t.owner_user_id
  where (dkd_token is not null and t.dkd_public_token=dkd_token) or t.tag_code=dkd_code or lower(t.public_alias)=dkd_slug or (t.status='ACTIVATED' and lower(p.username)=dkd_slug)
  order by case when dkd_token is not null and t.dkd_public_token=dkd_token then 0 when lower(t.public_alias)=dkd_slug then 1 when t.status='ACTIVATED' and lower(p.username)=dkd_slug then 2 else 3 end,
           t.activated_at desc nulls last,t.created_at desc limit 1;
  return dkd_result;
end;
$$;

create or replace function public.drabornpark_username_available(drabornpark_username text)
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$
  select case when drabornpark_username is null then false
    when length(lower(trim(drabornpark_username)))<3 or length(lower(trim(drabornpark_username)))>24 then false
    when lower(trim(drabornpark_username)) !~ '^[a-z0-9._-]+$' then false
    when lower(trim(drabornpark_username)) ~ '^[0-9]{4}-[0-9]{4}$' then false
    else not exists(select 1 from public.drabornpark_profiles p where lower(p.username)=lower(trim(drabornpark_username)))
     and not exists(select 1 from public.drabornpark_tags t where lower(t.public_alias)=lower(trim(drabornpark_username))) end;
$$;

create or replace function public.drabornpark_bootstrap_user(drabornpark_display_name text default null::text, drabornpark_username text default null::text, drabornpark_avatar_url text default null::text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare drabornpark_uid uuid:=auth.uid(); drabornpark_email text:=lower(nullif(trim(auth.jwt()->>'email'),'')); drabornpark_requested_username text:=lower(nullif(trim(drabornpark_username),'')); drabornpark_resolved_display text; drabornpark_profile public.drabornpark_profiles%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  if drabornpark_requested_username is not null then
    if length(drabornpark_requested_username)<3 or length(drabornpark_requested_username)>24 or drabornpark_requested_username !~ '^[a-z0-9._-]+$' or drabornpark_requested_username ~ '^[0-9]{4}-[0-9]{4}$' then raise exception 'username_invalid'; end if;
    if exists(select 1 from public.drabornpark_profiles p where lower(p.username)=drabornpark_requested_username and p.user_id<>drabornpark_uid)
       or exists(select 1 from public.drabornpark_tags t where lower(t.public_alias)=drabornpark_requested_username) then raise exception 'username_taken'; end if;
  end if;
  drabornpark_resolved_display:=coalesce(nullif(trim(drabornpark_display_name),''),drabornpark_requested_username,nullif(split_part(coalesce(drabornpark_email,''),'@',1),''),'DraBornPark Kullanıcısı');
  insert into public.drabornpark_profiles(user_id,display_name,username,avatar_url,subscription_status,plus_trial_until)
  values(drabornpark_uid,drabornpark_resolved_display,drabornpark_requested_username,nullif(trim(drabornpark_avatar_url),''),'PLUS_TRIAL',now()+interval '14 days')
  on conflict(user_id) do update set display_name=coalesce(nullif(trim(excluded.display_name),''),public.drabornpark_profiles.display_name),username=coalesce(excluded.username,public.drabornpark_profiles.username),avatar_url=coalesce(excluded.avatar_url,public.drabornpark_profiles.avatar_url),updated_at=now();
  if drabornpark_email is not null then update public.drabornpark_family_members set member_user_id=drabornpark_uid,status='active',updated_at=now() where lower(invite_email)=drabornpark_email and owner_user_id<>drabornpark_uid and status='invited' and (member_user_id is null or member_user_id=drabornpark_uid); end if;
  select * into drabornpark_profile from public.drabornpark_profiles where user_id=drabornpark_uid; return to_jsonb(drabornpark_profile);
end;
$$;

create or replace function public.drabornpark_update_profile(drabornpark_username text default null::text, drabornpark_avatar_url text default null::text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare drabornpark_uid uuid:=auth.uid(); drabornpark_normalized_username text:=lower(nullif(trim(drabornpark_username),'')); drabornpark_profile public.drabornpark_profiles%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  if drabornpark_normalized_username is not null then
    if length(drabornpark_normalized_username)<3 or length(drabornpark_normalized_username)>24 or drabornpark_normalized_username !~ '^[a-z0-9._-]+$' or drabornpark_normalized_username ~ '^[0-9]{4}-[0-9]{4}$' then raise exception 'username_invalid'; end if;
    if exists(select 1 from public.drabornpark_profiles p where lower(p.username)=drabornpark_normalized_username and p.user_id<>drabornpark_uid)
       or exists(select 1 from public.drabornpark_tags t where lower(t.public_alias)=drabornpark_normalized_username) then raise exception 'username_taken'; end if;
  end if;
  update public.drabornpark_profiles set username=coalesce(drabornpark_normalized_username,username),avatar_url=coalesce(nullif(trim(drabornpark_avatar_url),''),avatar_url),updated_at=now() where user_id=drabornpark_uid returning * into drabornpark_profile;
  if drabornpark_profile.user_id is null then raise exception 'profile_not_found'; end if; return to_jsonb(drabornpark_profile);
end;
$$;

create or replace function public.dkd_drabornpark_factory_update_tag_v104(dkd_tag_id uuid,dkd_tag_code text,dkd_serial_number text,dkd_short_code text,dkd_activation_pin text default null::text,dkd_factory_notes text default null::text,dkd_username text default null::text)
returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp
as $$
declare dkd_clean_code text:=upper(trim(coalesce(dkd_tag_code,''))); dkd_clean_serial text:=nullif(trim(coalesce(dkd_serial_number,'')),''); dkd_clean_short text:=lower(trim(coalesce(dkd_short_code,''))); dkd_clean_pin text:=nullif(trim(coalesce(dkd_activation_pin,'')),''); dkd_clean_notes text:=nullif(trim(coalesce(dkd_factory_notes,'')),''); dkd_clean_username text:=lower(nullif(trim(coalesce(dkd_username,'')),'')); dkd_owner uuid; dkd_public_url text; dkd_friendly_url text;
begin
  if not public.drabornpark_is_admin() then raise exception 'DraBornPark admin role required'; end if;
  if dkd_tag_id is null then raise exception 'tag_id_required'; end if;
  if dkd_clean_code !~ '^DP-[A-Z0-9]{4,32}$' then raise exception 'tag_code_invalid'; end if;
  if dkd_clean_serial is not null and (length(dkd_clean_serial)<3 or length(dkd_clean_serial)>96) then raise exception 'serial_invalid'; end if;
  if dkd_clean_short !~ '^[0-9]{4}-[0-9]{4}$' then raise exception 'short_code_invalid'; end if;
  if dkd_clean_pin is not null and dkd_clean_pin !~ '^[0-9]{8}$' then raise exception 'activation_pin_invalid'; end if;
  select owner_user_id into dkd_owner from public.drabornpark_tags where id=dkd_tag_id for update; if not found then raise exception 'tag_not_found'; end if;
  if exists(select 1 from public.drabornpark_tags where tag_code=dkd_clean_code and id<>dkd_tag_id) then raise exception 'tag_code_unique'; end if;
  if dkd_clean_serial is not null and exists(select 1 from public.drabornpark_tags where serial_number=dkd_clean_serial and id<>dkd_tag_id) then raise exception 'serial_unique'; end if;
  if exists(select 1 from public.drabornpark_tags where lower(public_alias)=dkd_clean_short and id<>dkd_tag_id) then raise exception 'short_code_unique'; end if;
  if exists(select 1 from public.drabornpark_profiles where lower(username)=dkd_clean_short) then raise exception 'short_code_reserved'; end if;
  if dkd_clean_username is not null then
    if dkd_owner is null then raise exception 'tag_owner_required_for_username'; end if;
    if length(dkd_clean_username)<3 or length(dkd_clean_username)>24 or dkd_clean_username !~ '^[a-z0-9._-]+$' or dkd_clean_username ~ '^[0-9]{4}-[0-9]{4}$' then raise exception 'username_invalid'; end if;
    if exists(select 1 from public.drabornpark_profiles p where lower(p.username)=dkd_clean_username and p.user_id<>dkd_owner) or exists(select 1 from public.drabornpark_tags t where lower(t.public_alias)=dkd_clean_username) then raise exception 'username_taken'; end if;
    update public.drabornpark_profiles set username=dkd_clean_username,updated_at=now() where user_id=dkd_owner;
  end if;
  dkd_public_url:='https://www.draborneagle.com/DraBornPark/tag/'||dkd_clean_short;
  update public.drabornpark_tags set tag_code=dkd_clean_code,serial_number=dkd_clean_serial,public_alias=dkd_clean_short,nfc_url=dkd_public_url,factory_notes=dkd_clean_notes,activation_pin_hash=case when dkd_clean_pin is null then activation_pin_hash else extensions.crypt(dkd_clean_pin,extensions.gen_salt('bf')) end,updated_at=now() where id=dkd_tag_id;
  select case when p.username is not null then 'https://www.draborneagle.com/DraBornPark/tag/'||lower(p.username) else dkd_public_url end into dkd_friendly_url from public.drabornpark_profiles p where p.user_id=dkd_owner; dkd_friendly_url:=coalesce(dkd_friendly_url,dkd_public_url);
  insert into public.drabornpark_factory_events(tag_id,actor_user_id,event_type,metadata) values(dkd_tag_id,auth.uid(),'TAG_V104_UPDATED',jsonb_build_object('tagCode',dkd_clean_code,'serialNumber',dkd_clean_serial,'shortCode',dkd_clean_short,'nfcQrUrl',dkd_public_url,'friendlyUrl',dkd_friendly_url,'username',dkd_clean_username,'pinChanged',dkd_clean_pin is not null));
  return jsonb_build_object('ok',true,'tagId',dkd_tag_id,'tagCode',dkd_clean_code,'serialNumber',dkd_clean_serial,'shortCode',dkd_clean_short,'nfcQrUrl',dkd_public_url,'friendlyUrl',dkd_friendly_url,'username',dkd_clean_username,'pinChanged',dkd_clean_pin is not null);
end;
$$;
grant execute on function public.dkd_drabornpark_factory_update_tag_v104(uuid,text,text,text,text,text,text) to authenticated;
