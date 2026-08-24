create extension if not exists pgcrypto with schema extensions;

alter table public.drabornpark_tags
  add column if not exists dkd_public_token uuid;

update public.drabornpark_tags
set dkd_public_token = gen_random_uuid()
where dkd_public_token is null;

alter table public.drabornpark_tags
  alter column dkd_public_token set default gen_random_uuid(),
  alter column dkd_public_token set not null;

create unique index if not exists dkd_drabornpark_tags_public_token_uidx
  on public.drabornpark_tags(dkd_public_token);

update public.drabornpark_tags
set nfc_url = 'https://www.draborneagle.com/DraBornPark/t/' || dkd_public_token::text
where nfc_url is distinct from ('https://www.draborneagle.com/DraBornPark/t/' || dkd_public_token::text);

create or replace function public.drabornpark_public_tag_snapshot(drabornpark_tag_code text)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  dkd_result jsonb;
  dkd_input text := trim(coalesce(drabornpark_tag_code,''));
  dkd_code text;
  dkd_alias text;
  dkd_token uuid;
begin
  if dkd_input = '' then return null; end if;
  begin dkd_token := dkd_input::uuid; exception when others then dkd_token := null; end;
  dkd_alias := lower(regexp_replace(dkd_input, '^DP-', '', 'i'));
  dkd_code := upper(regexp_replace(dkd_input, '^DP-', '', 'i'));
  dkd_code := 'DP-' || regexp_replace(dkd_code, '[^A-Z0-9]', '', 'g');
  select jsonb_build_object(
    'tagCode', t.tag_code,
    'publicToken', t.dkd_public_token,
    'publicUrl', t.nfc_url,
    'publicAlias', t.public_alias,
    'status', t.status,
    'activated', t.status = 'ACTIVATED',
    'ownerAvatarUrl', case when t.status='ACTIVATED' then p.avatar_url else null end,
    'vehicle', case when t.status='ACTIVATED' then jsonb_build_object(
      'type', v.vehicle_type,
      'name', case when coalesce((v.public_fields->>'brandModel')::boolean, true) then v.vehicle_name else null end,
      'plate', case when coalesce((v.public_fields->>'plate')::boolean, true) then v.plate else null end,
      'brand', case when coalesce((v.public_fields->>'brandModel')::boolean, true) then v.brand else null end,
      'model', case when coalesce((v.public_fields->>'brandModel')::boolean, true) then v.model else null end,
      'color', case when coalesce((v.public_fields->>'color')::boolean, true) then v.color else null end
    ) else null end
  ) into dkd_result
  from public.drabornpark_tags t
  left join public.drabornpark_vehicles v on v.id=t.vehicle_id
  left join public.drabornpark_profiles p on p.user_id=t.owner_user_id
  where (dkd_token is not null and t.dkd_public_token=dkd_token)
     or t.tag_code=dkd_code
     or lower(t.public_alias)=dkd_alias
  order by case when dkd_token is not null and t.dkd_public_token=dkd_token then 0 when lower(t.public_alias)=dkd_alias then 1 else 2 end
  limit 1;
  return dkd_result;
end;
$$;

revoke all on function public.drabornpark_public_tag_snapshot(text) from public;
grant execute on function public.drabornpark_public_tag_snapshot(text) to anon, authenticated, service_role;

create or replace function public.dkd_drabornpark_activate_public_token_v101(dkd_public_token uuid, dkd_pin text, dkd_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  dkd_uid uuid := auth.uid();
  dkd_tag_code text;
begin
  if dkd_uid is null then raise exception 'authentication_required'; end if;
  select t.tag_code into dkd_tag_code from public.drabornpark_tags t where t.dkd_public_token = dkd_public_token limit 1;
  if dkd_tag_code is null then raise exception 'tag_not_found'; end if;
  return public.dkd_drabornpark_activate_tag_v054(dkd_tag_code, dkd_pin, dkd_vehicle_id);
end;
$$;

revoke all on function public.dkd_drabornpark_activate_public_token_v101(uuid,text,uuid) from public;
grant execute on function public.dkd_drabornpark_activate_public_token_v101(uuid,text,uuid) to authenticated;

create or replace function public.drabornpark_factory_create_tag(drabornpark_serial_number text default null)
returns table(tag_code text, serial_number text, nfc_url text, activation_pin text)
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
declare
  dkd_code text;
  dkd_serial text;
  dkd_pin text;
  dkd_tag_id uuid;
  dkd_public_token uuid := gen_random_uuid();
  dkd_public_url text;
begin
  if not public.drabornpark_is_admin() then raise exception 'DraBornPark admin role required'; end if;
  loop
    dkd_code := 'DP-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
    exit when not exists (select 1 from public.drabornpark_tags dpt where dpt.tag_code = dkd_code);
  end loop;
  dkd_serial := coalesce(nullif(trim(drabornpark_serial_number), ''), 'DPS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8)));
  dkd_pin := lpad((floor(random() * 100000000))::bigint::text, 8, '0');
  dkd_public_url := 'https://www.draborneagle.com/DraBornPark/t/' || dkd_public_token::text;
  insert into public.drabornpark_tags(tag_code, serial_number, nfc_url, activation_pin_hash, status, dkd_public_token)
  values (dkd_code, dkd_serial, dkd_public_url, extensions.crypt(dkd_pin, extensions.gen_salt('bf')), 'NFC_PENDING', dkd_public_token)
  returning id into dkd_tag_id;
  insert into public.drabornpark_factory_events(tag_id, actor_user_id, event_type, metadata)
  values (dkd_tag_id, auth.uid(), 'TAG_CREATED', jsonb_build_object('serialNumber', dkd_serial, 'publicToken', dkd_public_token, 'publicUrl', dkd_public_url));
  return query select dkd_code, dkd_serial, dkd_public_url, dkd_pin;
end;
$$;
