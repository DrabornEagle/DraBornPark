-- DraBornPark v1.0.5 / versionCode 5
-- Physical NFC and QR always use exactly one canonical short URL:
-- https://www.draborneagle.com/DraBornPark/tag/NNNN-NNNN

create or replace function public.dkd_drabornpark_enforce_nfc_url_v105()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if nullif(trim(new.public_alias), '') is null then
    new.public_alias := public.dkd_drabornpark_new_short_code_v104();
  end if;
  new.public_alias := lower(trim(new.public_alias));
  if new.public_alias !~ '^[0-9]{4}-[0-9]{4}$' then
    raise exception 'nfc_connection_code_invalid';
  end if;
  new.nfc_url := 'https://www.draborneagle.com/DraBornPark/tag/' || new.public_alias;
  return new;
end;
$$;

revoke all on function public.dkd_drabornpark_enforce_nfc_url_v105() from public, anon, authenticated;

drop trigger if exists dkd_drabornpark_enforce_nfc_url_v105 on public.drabornpark_tags;
create trigger dkd_drabornpark_enforce_nfc_url_v105
before insert or update of public_alias, nfc_url on public.drabornpark_tags
for each row execute function public.dkd_drabornpark_enforce_nfc_url_v105();

update public.drabornpark_tags
set nfc_url = 'https://www.draborneagle.com/DraBornPark/tag/' || lower(trim(public_alias)),
    updated_at = now()
where public_alias is not null
  and nfc_url is distinct from ('https://www.draborneagle.com/DraBornPark/tag/' || lower(trim(public_alias)));

create or replace function public.dkd_drabornpark_factory_update_tag_v105(
  dkd_tag_id uuid,
  dkd_tag_code text,
  dkd_serial_number text,
  dkd_nfc_connection_code text,
  dkd_activation_pin text default null::text,
  dkd_factory_notes text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  dkd_clean_code text := upper(trim(coalesce(dkd_tag_code, '')));
  dkd_clean_serial text := nullif(trim(coalesce(dkd_serial_number, '')), '');
  dkd_clean_nfc_code text := lower(trim(coalesce(dkd_nfc_connection_code, '')));
  dkd_clean_pin text := nullif(trim(coalesce(dkd_activation_pin, '')), '');
  dkd_clean_notes text := nullif(trim(coalesce(dkd_factory_notes, '')), '');
  dkd_nfc_url text;
begin
  if not public.drabornpark_is_admin() then raise exception 'DraBornPark admin role required'; end if;
  if dkd_tag_id is null then raise exception 'tag_id_required'; end if;
  if dkd_clean_code !~ '^DP-[A-Z0-9]{4,32}$' then raise exception 'tag_code_invalid'; end if;
  if dkd_clean_serial is not null and (length(dkd_clean_serial) < 3 or length(dkd_clean_serial) > 96) then raise exception 'serial_invalid'; end if;
  if dkd_clean_nfc_code !~ '^[0-9]{4}-[0-9]{4}$' then raise exception 'nfc_connection_code_invalid'; end if;
  if dkd_clean_pin is not null and dkd_clean_pin !~ '^[0-9]{8}$' then raise exception 'activation_pin_invalid'; end if;
  if dkd_clean_notes is not null and length(dkd_clean_notes) > 1500 then raise exception 'factory_notes_too_long'; end if;
  if not exists(select 1 from public.drabornpark_tags where id=dkd_tag_id) then raise exception 'tag_not_found'; end if;
  if exists(select 1 from public.drabornpark_tags where tag_code=dkd_clean_code and id<>dkd_tag_id) then raise exception 'tag_code_unique'; end if;
  if dkd_clean_serial is not null and exists(select 1 from public.drabornpark_tags where serial_number=dkd_clean_serial and id<>dkd_tag_id) then raise exception 'serial_unique'; end if;
  if exists(select 1 from public.drabornpark_tags where lower(public_alias)=dkd_clean_nfc_code and id<>dkd_tag_id) then raise exception 'nfc_connection_code_unique'; end if;
  if exists(select 1 from public.drabornpark_profiles where lower(username)=dkd_clean_nfc_code) then raise exception 'nfc_connection_code_reserved'; end if;

  dkd_nfc_url := 'https://www.draborneagle.com/DraBornPark/tag/' || dkd_clean_nfc_code;
  update public.drabornpark_tags
     set tag_code=dkd_clean_code,
         serial_number=dkd_clean_serial,
         public_alias=dkd_clean_nfc_code,
         nfc_url=dkd_nfc_url,
         factory_notes=dkd_clean_notes,
         activation_pin_hash=case when dkd_clean_pin is null then activation_pin_hash else extensions.crypt(dkd_clean_pin,extensions.gen_salt('bf')) end,
         updated_at=now()
   where id=dkd_tag_id;

  insert into public.drabornpark_factory_events(tag_id,actor_user_id,event_type,metadata)
  values(dkd_tag_id,auth.uid(),'TAG_V105_UPDATED',jsonb_build_object('tagCode',dkd_clean_code,'serialNumber',dkd_clean_serial,'nfcConnectionCode',dkd_clean_nfc_code,'nfcUrl',dkd_nfc_url,'pinChanged',dkd_clean_pin is not null));

  return jsonb_build_object('ok',true,'tagId',dkd_tag_id,'tagCode',dkd_clean_code,'serialNumber',dkd_clean_serial,'nfcConnectionCode',dkd_clean_nfc_code,'nfcUrl',dkd_nfc_url,'pinChanged',dkd_clean_pin is not null);
end;
$$;
revoke all on function public.dkd_drabornpark_factory_update_tag_v105(uuid,text,text,text,text,text) from public, anon;
grant execute on function public.dkd_drabornpark_factory_update_tag_v105(uuid,text,text,text,text,text) to authenticated, service_role;

create or replace function public.drabornpark_public_tag_snapshot(drabornpark_tag_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dkd_result jsonb;
  dkd_input text := trim(coalesce(drabornpark_tag_code,''));
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
    'tagCode',t.tag_code,
    'publicToken',t.dkd_public_token,
    'shortCode',t.public_alias,
    'nfcConnectionCode',t.public_alias,
    'publicUrl','https://www.draborneagle.com/DraBornPark/tag/'||t.public_alias,
    'physicalUrl','https://www.draborneagle.com/DraBornPark/tag/'||t.public_alias,
    'friendlyUrl','https://www.draborneagle.com/DraBornPark/tag/'||t.public_alias,
    'username',case when t.status='ACTIVATED' then p.username else null end,
    'status',t.status,
    'activated',t.status='ACTIVATED',
    'ownerAvatarUrl',case when t.status='ACTIVATED' then p.avatar_url else null end,
    'vehicle',case when t.status='ACTIVATED' then jsonb_build_object(
      'type',v.vehicle_type,
      'name',case when coalesce((v.public_fields->>'brandModel')::boolean,true) then v.vehicle_name else null end,
      'plate',case when coalesce((v.public_fields->>'plate')::boolean,true) then v.plate else null end,
      'brand',case when coalesce((v.public_fields->>'brandModel')::boolean,true) then v.brand else null end,
      'model',case when coalesce((v.public_fields->>'brandModel')::boolean,true) then v.model else null end,
      'color',case when coalesce((v.public_fields->>'color')::boolean,true) then v.color else null end)
      else null end)
  into dkd_result
  from public.drabornpark_tags t
  left join public.drabornpark_vehicles v on v.id=t.vehicle_id
  left join public.drabornpark_profiles p on p.user_id=t.owner_user_id
  where (dkd_token is not null and t.dkd_public_token=dkd_token)
     or t.tag_code=dkd_code
     or lower(t.public_alias)=dkd_slug
  order by case when lower(t.public_alias)=dkd_slug then 0 when dkd_token is not null and t.dkd_public_token=dkd_token then 1 else 2 end,
           t.activated_at desc nulls last,
           t.created_at desc
  limit 1;
  return dkd_result;
end;
$$;
revoke all on function public.drabornpark_public_tag_snapshot(text) from public, anon, authenticated;
grant execute on function public.drabornpark_public_tag_snapshot(text) to service_role;
