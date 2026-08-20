-- DraBornPark v0.4.0 canonical web host hotfix.
-- GitHub Pages for DrabornEagle_Web is configured with CNAME www.draborneagle.com.
-- Keep Tag IDs stable; only canonicalize the destination URL.

create or replace function public.drabornpark_factory_create_tag(drabornpark_serial_number text default null::text)
returns table(tag_code text, serial_number text, nfc_url text, activation_pin text)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  drabornpark_code text;
  drabornpark_serial text;
  drabornpark_pin text;
  drabornpark_tag_id uuid;
begin
  if not public.drabornpark_is_admin() then
    raise exception 'DraBornPark admin role required';
  end if;

  loop
    drabornpark_code := 'DP-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
    exit when not exists (
      select 1 from public.drabornpark_tags dpt where dpt.tag_code = drabornpark_code
    );
  end loop;

  drabornpark_serial := coalesce(
    nullif(trim(drabornpark_serial_number), ''),
    'DPS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8))
  );
  drabornpark_pin := lpad((floor(random() * 100000000))::bigint::text, 8, '0');

  insert into public.drabornpark_tags(
    tag_code,
    serial_number,
    nfc_url,
    activation_pin_hash,
    status
  )
  values (
    drabornpark_code,
    drabornpark_serial,
    'https://www.draborneagle.com/DraBornPark/?tag=' || replace(drabornpark_code, 'DP-', ''),
    extensions.crypt(drabornpark_pin, extensions.gen_salt('bf')),
    'NFC_PENDING'
  )
  returning id into drabornpark_tag_id;

  insert into public.drabornpark_factory_events(tag_id, actor_user_id, event_type, metadata)
  values (
    drabornpark_tag_id,
    auth.uid(),
    'TAG_CREATED',
    jsonb_build_object('serialNumber', drabornpark_serial)
  );

  return query
  select
    drabornpark_code,
    drabornpark_serial,
    'https://www.draborneagle.com/DraBornPark/?tag=' || replace(drabornpark_code, 'DP-', ''),
    drabornpark_pin;
end;
$function$;

update public.drabornpark_tags
set nfc_url = 'https://www.draborneagle.com/DraBornPark/?tag=' || replace(tag_code, 'DP-', ''),
    updated_at = now()
where nfc_url is distinct from 'https://www.draborneagle.com/DraBornPark/?tag=' || replace(tag_code, 'DP-', '');
