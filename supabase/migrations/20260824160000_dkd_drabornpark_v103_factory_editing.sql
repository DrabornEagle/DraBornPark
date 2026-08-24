create or replace function public.dkd_drabornpark_factory_update_tag_v103(
  dkd_tag_id uuid,
  dkd_tag_code text,
  dkd_serial_number text,
  dkd_nfc_url text,
  dkd_activation_pin text default null,
  dkd_factory_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'extensions', 'pg_temp'
as $$
declare
  dkd_clean_code text := upper(trim(coalesce(dkd_tag_code, '')));
  dkd_clean_serial text := nullif(trim(coalesce(dkd_serial_number, '')), '');
  dkd_clean_url text := trim(coalesce(dkd_nfc_url, ''));
  dkd_clean_pin text := nullif(trim(coalesce(dkd_activation_pin, '')), '');
  dkd_clean_notes text := nullif(trim(coalesce(dkd_factory_notes, '')), '');
  dkd_url_tail text;
  dkd_current_token uuid;
  dkd_next_alias text;
  dkd_pin_changed boolean := false;
begin
  if not public.drabornpark_is_admin() then
    raise exception 'DraBornPark admin role required';
  end if;

  if dkd_tag_id is null then raise exception 'tag_id_required'; end if;
  if dkd_clean_code !~ '^DP-[A-Z0-9]{4,32}$' then raise exception 'tag_code_invalid'; end if;
  if dkd_clean_serial is not null and (length(dkd_clean_serial) < 3 or length(dkd_clean_serial) > 96) then raise exception 'serial_invalid'; end if;
  if dkd_clean_url !~ '^https://www\.draborneagle\.com/DraBornPark/t/[A-Za-z0-9_-]{3,100}$' then raise exception 'nfc_url_invalid'; end if;
  if dkd_clean_pin is not null and dkd_clean_pin !~ '^[0-9]{8}$' then raise exception 'activation_pin_invalid'; end if;
  if dkd_clean_notes is not null and length(dkd_clean_notes) > 1500 then raise exception 'factory_notes_too_long'; end if;

  select dkd_public_token into dkd_current_token
  from public.drabornpark_tags
  where id = dkd_tag_id
  for update;
  if dkd_current_token is null then raise exception 'tag_not_found'; end if;

  if exists(select 1 from public.drabornpark_tags where tag_code = dkd_clean_code and id <> dkd_tag_id) then raise exception 'tag_code_unique'; end if;
  if dkd_clean_serial is not null and exists(select 1 from public.drabornpark_tags where serial_number = dkd_clean_serial and id <> dkd_tag_id) then raise exception 'serial_unique'; end if;

  dkd_url_tail := substring(dkd_clean_url from '/DraBornPark/t/([^/?#]+)$');
  if dkd_url_tail is null then raise exception 'nfc_url_invalid'; end if;

  if lower(dkd_url_tail) = lower(dkd_current_token::text) then
    dkd_next_alias := null;
  elsif upper(dkd_url_tail) = dkd_clean_code then
    dkd_next_alias := null;
  else
    dkd_next_alias := lower(dkd_url_tail);
    if exists(select 1 from public.drabornpark_tags where lower(public_alias) = dkd_next_alias and id <> dkd_tag_id) then raise exception 'public_alias_unique'; end if;
  end if;

  update public.drabornpark_tags
  set tag_code = dkd_clean_code,
      serial_number = dkd_clean_serial,
      nfc_url = dkd_clean_url,
      public_alias = dkd_next_alias,
      factory_notes = dkd_clean_notes,
      activation_pin_hash = case
        when dkd_clean_pin is null then activation_pin_hash
        else extensions.crypt(dkd_clean_pin, extensions.gen_salt('bf'))
      end,
      updated_at = now()
  where id = dkd_tag_id;

  dkd_pin_changed := dkd_clean_pin is not null;

  insert into public.drabornpark_factory_events(tag_id, actor_user_id, event_type, metadata)
  values (
    dkd_tag_id,
    auth.uid(),
    'TAG_V103_UPDATED',
    jsonb_build_object(
      'tagCode', dkd_clean_code,
      'serialNumber', dkd_clean_serial,
      'nfcQrUrl', dkd_clean_url,
      'pinChanged', dkd_pin_changed
    )
  );

  return jsonb_build_object(
    'ok', true,
    'tagId', dkd_tag_id,
    'tagCode', dkd_clean_code,
    'serialNumber', dkd_clean_serial,
    'nfcQrUrl', dkd_clean_url,
    'pinChanged', dkd_pin_changed
  );
end;
$$;

revoke all on function public.dkd_drabornpark_factory_update_tag_v103(uuid,text,text,text,text,text) from public;
grant execute on function public.dkd_drabornpark_factory_update_tag_v103(uuid,text,text,text,text,text) to authenticated;
