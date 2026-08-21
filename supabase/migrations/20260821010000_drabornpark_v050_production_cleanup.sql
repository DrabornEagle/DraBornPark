-- DraBornPark v0.5.0 production cleanup.
-- Mirrors the live migration applied on 2026-08-21.

alter table public.drabornpark_contact_sessions
  add column if not exists updated_at timestamptz not null default now();

alter table public.drabornpark_tags
  add column if not exists public_alias text;

create unique index if not exists drabornpark_tags_public_alias_unique
  on public.drabornpark_tags (lower(public_alias))
  where public_alias is not null;

create or replace function public.drabornpark_public_tag_snapshot(drabornpark_tag_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
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
  where t.status='ACTIVATED'
    and (t.tag_code=drabornpark_code or lower(t.public_alias)=drabornpark_alias)
  order by case when lower(t.public_alias)=drabornpark_alias then 0 else 1 end
  limit 1;
  return drabornpark_result;
end;
$$;

create or replace function public.drabornpark_factory_update_tag(
  drabornpark_tag_id uuid,
  drabornpark_serial_number text default null,
  drabornpark_public_alias text default null,
  drabornpark_factory_notes text default null
)
returns public.drabornpark_tags
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  drabornpark_row public.drabornpark_tags%rowtype;
  drabornpark_alias text;
begin
  if not public.drabornpark_is_admin() then raise exception 'admin_required'; end if;
  drabornpark_alias := nullif(lower(trim(coalesce(drabornpark_public_alias,''))), '');
  if drabornpark_alias is not null and drabornpark_alias !~ '^[a-z0-9][a-z0-9_-]{2,31}$' then
    raise exception 'alias_invalid';
  end if;
  update public.drabornpark_tags
  set serial_number=coalesce(nullif(trim(drabornpark_serial_number),''),serial_number),
      public_alias=drabornpark_alias,
      factory_notes=drabornpark_factory_notes,
      nfc_url='https://www.draborneagle.com/DraBornPark/?tag=' || coalesce(drabornpark_alias, regexp_replace(tag_code,'^DP-','')),
      updated_at=now()
  where id=drabornpark_tag_id
  returning * into drabornpark_row;
  if drabornpark_row.id is null then raise exception 'tag_not_found'; end if;
  return drabornpark_row;
end;
$$;

create or replace function public.drabornpark_factory_delete_tag(drabornpark_tag_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  if not public.drabornpark_is_admin() then raise exception 'admin_required'; end if;
  delete from public.drabornpark_tags where id=drabornpark_tag_id;
  return found;
end;
$$;

revoke all on function public.drabornpark_factory_update_tag(uuid,text,text,text) from public;
revoke all on function public.drabornpark_factory_delete_tag(uuid) from public;
grant execute on function public.drabornpark_factory_update_tag(uuid,text,text,text) to authenticated;
grant execute on function public.drabornpark_factory_delete_tag(uuid) to authenticated;

drop table if exists public.drabornpark_demo_scenarios;