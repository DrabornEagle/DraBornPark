create or replace function public.drabornpark_public_tag_snapshot(drabornpark_tag_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  drabornpark_result jsonb;
  drabornpark_input text := trim(coalesce(drabornpark_tag_code,''));
  drabornpark_code text;
  drabornpark_alias text;
begin
  if drabornpark_input = '' then return null; end if;
  drabornpark_alias := lower(regexp_replace(drabornpark_input, '^DP-', '', 'i'));
  drabornpark_code := upper(regexp_replace(drabornpark_input, '^DP-', '', 'i'));
  drabornpark_code := 'DP-' || regexp_replace(drabornpark_code, '[^A-Z0-9]', '', 'g');

  select jsonb_build_object(
    'tagCode', t.tag_code,
    'publicAlias', t.public_alias,
    'status', t.status,
    'ownerAvatarUrl', p.avatar_url,
    'vehicle', jsonb_build_object(
      'type', v.vehicle_type,
      'name', case when coalesce((v.public_fields->>'brandModel')::boolean, true) then v.vehicle_name else null end,
      'plate', case when coalesce((v.public_fields->>'plate')::boolean, true) then v.plate else null end,
      'brand', case when coalesce((v.public_fields->>'brandModel')::boolean, true) then v.brand else null end,
      'model', case when coalesce((v.public_fields->>'brandModel')::boolean, true) then v.model else null end,
      'color', case when coalesce((v.public_fields->>'color')::boolean, true) then v.color else null end
    )
  ) into drabornpark_result
  from public.drabornpark_tags t
  left join public.drabornpark_vehicles v on v.id=t.vehicle_id
  left join public.drabornpark_profiles p on p.user_id=t.owner_user_id
  where t.status='ACTIVATED'
    and (t.tag_code=drabornpark_code or lower(t.public_alias)=drabornpark_alias)
  order by case when lower(t.public_alias)=drabornpark_alias then 0 else 1 end
  limit 1;
  return drabornpark_result;
end;
$function$;
