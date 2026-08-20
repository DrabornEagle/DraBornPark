create or replace function public.drabornpark_family_shared_parks()
returns table (
  owner_user_id uuid,
  owner_display_name text,
  vehicle_id uuid,
  vehicle_name text,
  plate text,
  place_name text,
  latitude double precision,
  longitude double precision,
  floor_code text,
  zone_color text,
  row_code text,
  bay_code text,
  parked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    family.owner_user_id,
    coalesce(profile.display_name, 'Family araç sahibi') as owner_display_name,
    vehicle.id as vehicle_id,
    vehicle.vehicle_name,
    vehicle.plate,
    park.place_name,
    park.latitude,
    park.longitude,
    park.floor_code,
    park.zone_color,
    park.row_code,
    park.bay_code,
    park.parked_at
  from public.drabornpark_family_members as family
  join public.drabornpark_profiles as profile
    on profile.user_id = family.owner_user_id
  join public.drabornpark_vehicles as vehicle
    on vehicle.owner_user_id = family.owner_user_id
   and vehicle.is_active = true
  join lateral (
    select p.*
    from public.drabornpark_parks as p
    where p.owner_user_id = family.owner_user_id
      and p.vehicle_id = vehicle.id
      and p.ended_at is null
    order by p.parked_at desc
    limit 1
  ) as park on true
  where family.member_user_id = auth.uid()
    and family.status = 'active'
    and family.can_view_park = true
  order by park.parked_at desc;
$$;

revoke all on function public.drabornpark_family_shared_parks() from public;
revoke all on function public.drabornpark_family_shared_parks() from anon;
grant execute on function public.drabornpark_family_shared_parks() to authenticated;
