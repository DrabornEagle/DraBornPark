-- DraBornPark v0.3.0: automatic Family invite claiming and validated routing targets.

create or replace function public.drabornpark_accept_family_invites()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  drabornpark_uid uuid := auth.uid();
  drabornpark_email text := lower(nullif(trim(auth.jwt() ->> 'email'), ''));
  drabornpark_count integer := 0;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  if drabornpark_email is null then return 0; end if;
  update public.drabornpark_family_members
  set member_user_id = drabornpark_uid, status = 'active', updated_at = now()
  where lower(invite_email) = drabornpark_email
    and owner_user_id <> drabornpark_uid
    and status = 'invited'
    and (member_user_id is null or member_user_id = drabornpark_uid);
  get diagnostics drabornpark_count = row_count;
  return drabornpark_count;
end;
$$;

revoke execute on function public.drabornpark_accept_family_invites() from public, anon;
grant execute on function public.drabornpark_accept_family_invites() to authenticated;

create or replace function public.drabornpark_bootstrap_user(drabornpark_display_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  drabornpark_uid uuid := auth.uid();
  drabornpark_email text := lower(nullif(trim(auth.jwt() ->> 'email'), ''));
  drabornpark_profile public.drabornpark_profiles%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  insert into public.drabornpark_profiles(user_id, display_name, subscription_status, plus_trial_until)
  values (drabornpark_uid, nullif(trim(drabornpark_display_name), ''), 'PLUS_TRIAL', now() + interval '14 days')
  on conflict (user_id) do update
    set display_name = coalesce(nullif(trim(excluded.display_name), ''), public.drabornpark_profiles.display_name), updated_at = now();
  if drabornpark_email is not null then
    update public.drabornpark_family_members
    set member_user_id = drabornpark_uid, status = 'active', updated_at = now()
    where lower(invite_email) = drabornpark_email
      and owner_user_id <> drabornpark_uid
      and status = 'invited'
      and (member_user_id is null or member_user_id = drabornpark_uid);
  end if;
  select * into drabornpark_profile from public.drabornpark_profiles where user_id = drabornpark_uid;
  return to_jsonb(drabornpark_profile);
end;
$$;

revoke execute on function public.drabornpark_bootstrap_user(text) from anon;
grant execute on function public.drabornpark_bootstrap_user(text) to authenticated;

create or replace function public.drabornpark_create_routing_rule(
  drabornpark_vehicle_id uuid,
  drabornpark_rule_name text,
  drabornpark_days_of_week smallint[],
  drabornpark_start_time time,
  drabornpark_end_time time,
  drabornpark_target_type text,
  drabornpark_target_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  drabornpark_uid uuid := auth.uid();
  drabornpark_row public.drabornpark_routing_rules%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  if not public.drabornpark_has_plus() then raise exception 'plus_required'; end if;
  if drabornpark_vehicle_id is not null and not exists(select 1 from public.drabornpark_vehicles v where v.id=drabornpark_vehicle_id and v.owner_user_id=drabornpark_uid and v.is_active) then raise exception 'vehicle_not_found'; end if;
  if drabornpark_rule_name is null or trim(drabornpark_rule_name)='' then raise exception 'rule_name_required'; end if;
  if drabornpark_days_of_week is null or cardinality(drabornpark_days_of_week)=0 or exists(select 1 from unnest(drabornpark_days_of_week) d where d < 1 or d > 7) then raise exception 'invalid_days'; end if;
  if drabornpark_start_time = drabornpark_end_time then raise exception 'invalid_time_range'; end if;
  if drabornpark_target_type not in ('owner','family','guest') then raise exception 'invalid_target_type'; end if;

  if drabornpark_target_type = 'owner' then
    drabornpark_target_user_id := null;
  elsif drabornpark_target_type = 'family' then
    if drabornpark_target_user_id is null or not exists (
      select 1 from public.drabornpark_family_members f
      where f.owner_user_id = drabornpark_uid and f.member_user_id = drabornpark_target_user_id
        and f.status = 'active' and f.can_receive_notifications
    ) then raise exception 'invalid_family_target'; end if;
  elsif drabornpark_target_type = 'guest' then
    if drabornpark_target_user_id is null or not exists (
      select 1 from public.drabornpark_guest_drivers g
      where g.owner_user_id = drabornpark_uid and g.guest_user_id = drabornpark_target_user_id
        and g.status = 'active' and g.ends_at > now() and g.redirect_notifications
    ) then raise exception 'invalid_guest_target'; end if;
  end if;

  insert into public.drabornpark_routing_rules(owner_user_id, vehicle_id, rule_name, days_of_week, start_time, end_time, target_type, target_user_id, is_enabled)
  values (drabornpark_uid, drabornpark_vehicle_id, trim(drabornpark_rule_name), drabornpark_days_of_week, drabornpark_start_time, drabornpark_end_time, drabornpark_target_type, drabornpark_target_user_id, true)
  returning * into drabornpark_row;
  return to_jsonb(drabornpark_row);
end;
$$;

revoke execute on function public.drabornpark_create_routing_rule(uuid,text,smallint[],time,time,text,uuid) from public, anon;
grant execute on function public.drabornpark_create_routing_rule(uuid,text,smallint[],time,time,text,uuid) to authenticated;
