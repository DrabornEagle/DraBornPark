-- DraBornPark v1.0.5
-- Restore optional username URLs without changing the physical NFC/QR target.
-- Canonical physical URL stays /DraBornPark/tag/NNNN-NNNN.

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

  dkd_input := regexp_replace(dkd_input,'^https://www\.draborneagle\.com/DraBornPark/tag/','','i');
  dkd_input := regexp_replace(dkd_input,'^https://www\.draborneagle\.com/DraBornPark/t/','','i');
  dkd_slug := lower(trim(dkd_input));

  begin
    dkd_token := dkd_input::uuid;
  exception when others then
    dkd_token := null;
  end;

  dkd_code := upper(regexp_replace(dkd_input,'^DP-','','i'));
  dkd_code := 'DP-' || regexp_replace(dkd_code,'[^A-Z0-9]','','g');

  select jsonb_build_object(
    'tagCode',t.tag_code,
    'publicToken',t.dkd_public_token,
    'shortCode',t.public_alias,
    'nfcConnectionCode',t.public_alias,
    'publicUrl',t.nfc_url,
    'physicalUrl',t.nfc_url,
    'friendlyUrl',case
      when t.status='ACTIVATED' and nullif(trim(p.username),'') is not null
        then 'https://www.draborneagle.com/DraBornPark/tag/'||lower(p.username)
      else t.nfc_url
    end,
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
      'color',case when coalesce((v.public_fields->>'color')::boolean,true) then v.color else null end
    ) else null end
  )
  into dkd_result
  from public.drabornpark_tags t
  left join public.drabornpark_vehicles v on v.id=t.vehicle_id
  left join public.drabornpark_profiles p on p.user_id=t.owner_user_id
  where (dkd_token is not null and t.dkd_public_token=dkd_token)
     or t.tag_code=dkd_code
     or lower(t.public_alias)=dkd_slug
     or (t.status='ACTIVATED' and lower(p.username)=dkd_slug)
  order by case
    when lower(t.public_alias)=dkd_slug then 0
    when t.status='ACTIVATED' and lower(p.username)=dkd_slug then 1
    when dkd_token is not null and t.dkd_public_token=dkd_token then 2
    else 3
  end,
  t.activated_at desc nulls last,
  t.created_at desc
  limit 1;

  return dkd_result;
end;
$$;

revoke all on function public.drabornpark_public_tag_snapshot(text) from public, anon, authenticated;
grant execute on function public.drabornpark_public_tag_snapshot(text) to service_role;
