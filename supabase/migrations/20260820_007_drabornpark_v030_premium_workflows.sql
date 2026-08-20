-- DraBornPark v0.3.0: server-side Plus entitlement, Vale/Service modes,
-- routing rules, emergency chain controls and service state Timeline events.

create or replace function public.drabornpark_has_plus()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
    exists (
      select 1
      from public.drabornpark_profiles p
      where p.user_id = auth.uid()
        and (
          p.subscription_status in ('PLUS','PLUS_ACTIVE','ACTIVE')
          or (p.subscription_status = 'PLUS_TRIAL' and p.plus_trial_until > now())
        )
    )
    or exists (
      select 1
      from public.drabornpark_subscriptions s
      where s.user_id = auth.uid()
        and lower(s.status) in ('active','trialing','grace_period')
        and (s.expires_at is null or s.expires_at > now())
    )
  );
$$;

grant execute on function public.drabornpark_has_plus() to authenticated;
revoke execute on function public.drabornpark_has_plus() from anon;

create table if not exists public.drabornpark_vehicle_modes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.drabornpark_vehicles(id) on delete cascade,
  mode_type text not null check (mode_type in ('valet','service')),
  label text,
  status text not null default 'active' check (status in ('active','ended','expired','cancelled')),
  redirect_notifications boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint drabornpark_vehicle_modes_time_check check (ends_at > starts_at)
);

create index if not exists drabornpark_vehicle_modes_owner_idx on public.drabornpark_vehicle_modes(owner_user_id, created_at desc);
create index if not exists drabornpark_vehicle_modes_vehicle_idx on public.drabornpark_vehicle_modes(vehicle_id, status, ends_at desc);
create unique index if not exists drabornpark_vehicle_modes_one_active_per_vehicle_idx on public.drabornpark_vehicle_modes(vehicle_id) where status = 'active';

alter table public.drabornpark_vehicle_modes enable row level security;

drop policy if exists drabornpark_vehicle_modes_owner_select on public.drabornpark_vehicle_modes;
create policy drabornpark_vehicle_modes_owner_select on public.drabornpark_vehicle_modes for select to authenticated using ((select auth.uid()) = owner_user_id);
drop policy if exists drabornpark_vehicle_modes_owner_insert on public.drabornpark_vehicle_modes;
create policy drabornpark_vehicle_modes_owner_insert on public.drabornpark_vehicle_modes for insert to authenticated with check ((select auth.uid()) = owner_user_id and public.drabornpark_has_plus());
drop policy if exists drabornpark_vehicle_modes_owner_update on public.drabornpark_vehicle_modes;
create policy drabornpark_vehicle_modes_owner_update on public.drabornpark_vehicle_modes for update to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id and public.drabornpark_has_plus());
drop policy if exists drabornpark_vehicle_modes_owner_delete on public.drabornpark_vehicle_modes;
create policy drabornpark_vehicle_modes_owner_delete on public.drabornpark_vehicle_modes for delete to authenticated using ((select auth.uid()) = owner_user_id and public.drabornpark_has_plus());

drop trigger if exists drabornpark_vehicle_modes_set_updated_at on public.drabornpark_vehicle_modes;
create trigger drabornpark_vehicle_modes_set_updated_at before update on public.drabornpark_vehicle_modes for each row execute function public.drabornpark_set_updated_at();

-- Premium records remain readable when a subscription expires; write access is gated.
drop policy if exists drabornpark_family_owner_insert on public.drabornpark_family_members;
create policy drabornpark_family_owner_insert on public.drabornpark_family_members for insert to authenticated with check ((select auth.uid()) = owner_user_id and public.drabornpark_has_plus());
drop policy if exists drabornpark_family_owner_update on public.drabornpark_family_members;
create policy drabornpark_family_owner_update on public.drabornpark_family_members for update to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id and public.drabornpark_has_plus());
drop policy if exists drabornpark_family_owner_delete on public.drabornpark_family_members;
create policy drabornpark_family_owner_delete on public.drabornpark_family_members for delete to authenticated using ((select auth.uid()) = owner_user_id and public.drabornpark_has_plus());

drop policy if exists drabornpark_guest_owner_all on public.drabornpark_guest_drivers;
drop policy if exists drabornpark_guest_owner_select on public.drabornpark_guest_drivers;
drop policy if exists drabornpark_guest_owner_insert on public.drabornpark_guest_drivers;
drop policy if exists drabornpark_guest_owner_update on public.drabornpark_guest_drivers;
drop policy if exists drabornpark_guest_owner_delete on public.drabornpark_guest_drivers;
create policy drabornpark_guest_owner_select on public.drabornpark_guest_drivers for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy drabornpark_guest_owner_insert on public.drabornpark_guest_drivers for insert to authenticated with check ((select auth.uid()) = owner_user_id and public.drabornpark_has_plus());
create policy drabornpark_guest_owner_update on public.drabornpark_guest_drivers for update to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id and public.drabornpark_has_plus());
create policy drabornpark_guest_owner_delete on public.drabornpark_guest_drivers for delete to authenticated using ((select auth.uid()) = owner_user_id and public.drabornpark_has_plus());

drop policy if exists drabornpark_routing_owner_all on public.drabornpark_routing_rules;
drop policy if exists drabornpark_routing_owner_select on public.drabornpark_routing_rules;
drop policy if exists drabornpark_routing_owner_insert on public.drabornpark_routing_rules;
drop policy if exists drabornpark_routing_owner_update on public.drabornpark_routing_rules;
drop policy if exists drabornpark_routing_owner_delete on public.drabornpark_routing_rules;
create policy drabornpark_routing_owner_select on public.drabornpark_routing_rules for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy drabornpark_routing_owner_insert on public.drabornpark_routing_rules for insert to authenticated with check ((select auth.uid()) = owner_user_id and public.drabornpark_has_plus());
create policy drabornpark_routing_owner_update on public.drabornpark_routing_rules for update to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id and public.drabornpark_has_plus());
create policy drabornpark_routing_owner_delete on public.drabornpark_routing_rules for delete to authenticated using ((select auth.uid()) = owner_user_id and public.drabornpark_has_plus());

drop policy if exists drabornpark_emergency_owner_all on public.drabornpark_emergency_contacts;
drop policy if exists drabornpark_emergency_owner_select on public.drabornpark_emergency_contacts;
drop policy if exists drabornpark_emergency_owner_insert on public.drabornpark_emergency_contacts;
drop policy if exists drabornpark_emergency_owner_update on public.drabornpark_emergency_contacts;
drop policy if exists drabornpark_emergency_owner_delete on public.drabornpark_emergency_contacts;
create policy drabornpark_emergency_owner_select on public.drabornpark_emergency_contacts for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy drabornpark_emergency_owner_insert on public.drabornpark_emergency_contacts for insert to authenticated with check ((select auth.uid()) = owner_user_id and public.drabornpark_has_plus());
create policy drabornpark_emergency_owner_update on public.drabornpark_emergency_contacts for update to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id and public.drabornpark_has_plus());
create policy drabornpark_emergency_owner_delete on public.drabornpark_emergency_contacts for delete to authenticated using ((select auth.uid()) = owner_user_id and public.drabornpark_has_plus());

create or replace function public.drabornpark_start_vehicle_mode(
  drabornpark_vehicle_id uuid,
  drabornpark_mode_type text,
  drabornpark_label text default null,
  drabornpark_duration_minutes integer default 120,
  drabornpark_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  drabornpark_uid uuid := auth.uid();
  drabornpark_row public.drabornpark_vehicle_modes%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  if not public.drabornpark_has_plus() then raise exception 'plus_required'; end if;
  if drabornpark_mode_type not in ('valet','service') then raise exception 'invalid_mode_type'; end if;
  if drabornpark_duration_minutes < 15 or drabornpark_duration_minutes > 1440 then raise exception 'invalid_duration'; end if;
  if not exists(select 1 from public.drabornpark_vehicles v where v.id = drabornpark_vehicle_id and v.owner_user_id = drabornpark_uid and v.is_active) then raise exception 'vehicle_not_found'; end if;

  update public.drabornpark_vehicle_modes set status = 'expired', ended_at = coalesce(ended_at, now()), updated_at = now() where owner_user_id = drabornpark_uid and status = 'active' and ends_at <= now();
  if exists(select 1 from public.drabornpark_vehicle_modes m where m.vehicle_id = drabornpark_vehicle_id and m.status = 'active') then raise exception 'vehicle_mode_already_active'; end if;

  insert into public.drabornpark_vehicle_modes(owner_user_id, vehicle_id, mode_type, label, starts_at, ends_at, metadata)
  values (drabornpark_uid, drabornpark_vehicle_id, drabornpark_mode_type, nullif(trim(drabornpark_label),''), now(), now() + make_interval(mins => drabornpark_duration_minutes), coalesce(drabornpark_metadata,'{}'::jsonb))
  returning * into drabornpark_row;

  insert into public.drabornpark_timeline_events(owner_user_id, vehicle_id, event_type, title, description, metadata)
  values (drabornpark_uid, drabornpark_vehicle_id, upper(drabornpark_mode_type) || '_STARTED', case when drabornpark_mode_type='valet' then 'Vale modu başladı' else 'Servis modu başladı' end, coalesce(nullif(trim(drabornpark_label),''), case when drabornpark_mode_type='valet' then 'Geçici vale oturumu' else 'Araç servis oturumu' end), jsonb_build_object('modeId', drabornpark_row.id, 'endsAt', drabornpark_row.ends_at));
  return to_jsonb(drabornpark_row);
end;
$$;

create or replace function public.drabornpark_end_vehicle_mode(drabornpark_mode_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  drabornpark_uid uuid := auth.uid();
  drabornpark_row public.drabornpark_vehicle_modes%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  if not public.drabornpark_has_plus() then raise exception 'plus_required'; end if;
  update public.drabornpark_vehicle_modes set status='ended', ended_at=now(), updated_at=now() where id=drabornpark_mode_id and owner_user_id=drabornpark_uid and status='active' returning * into drabornpark_row;
  if drabornpark_row.id is null then return false; end if;
  insert into public.drabornpark_timeline_events(owner_user_id, vehicle_id, event_type, title, description, metadata)
  values (drabornpark_uid, drabornpark_row.vehicle_id, upper(drabornpark_row.mode_type) || '_ENDED', case when drabornpark_row.mode_type='valet' then 'Vale modu bitti' else 'Servis modu bitti' end, coalesce(drabornpark_row.label,'Oturum kapatıldı'), jsonb_build_object('modeId', drabornpark_row.id));
  return true;
end;
$$;

create or replace function public.drabornpark_set_service_state(drabornpark_mode_id uuid, drabornpark_service_state text, drabornpark_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  drabornpark_uid uuid := auth.uid();
  drabornpark_row public.drabornpark_vehicle_modes%rowtype;
  drabornpark_title text;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  if not public.drabornpark_has_plus() then raise exception 'plus_required'; end if;
  if drabornpark_service_state not in ('in_service','extra_work','ready','pickup') then raise exception 'invalid_service_state'; end if;
  drabornpark_title := case drabornpark_service_state when 'in_service' then 'Araç serviste' when 'extra_work' then 'Ek işlem gerekiyor' when 'ready' then 'Araç hazır' else 'Teslim alınabilir' end;
  update public.drabornpark_vehicle_modes set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('serviceState', drabornpark_service_state, 'serviceNote', nullif(trim(drabornpark_note),''), 'serviceUpdatedAt', now()), updated_at = now() where id = drabornpark_mode_id and owner_user_id = drabornpark_uid and mode_type = 'service' and status = 'active' returning * into drabornpark_row;
  if drabornpark_row.id is null then raise exception 'active_service_mode_not_found'; end if;
  insert into public.drabornpark_timeline_events(owner_user_id, vehicle_id, event_type, title, description, metadata) values (drabornpark_uid, drabornpark_row.vehicle_id, 'SERVICE_STATUS', drabornpark_title, nullif(trim(drabornpark_note),''), jsonb_build_object('modeId', drabornpark_row.id, 'serviceState', drabornpark_service_state));
  return to_jsonb(drabornpark_row);
end;
$$;

create or replace function public.drabornpark_end_guest_driver(drabornpark_guest_driver_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare drabornpark_uid uuid := auth.uid(); drabornpark_vehicle_id uuid;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  if not public.drabornpark_has_plus() then raise exception 'plus_required'; end if;
  update public.drabornpark_guest_drivers set status='ended', ends_at=least(ends_at, now()), updated_at=now() where id=drabornpark_guest_driver_id and owner_user_id=drabornpark_uid and status='active' returning vehicle_id into drabornpark_vehicle_id;
  if drabornpark_vehicle_id is null then return false; end if;
  insert into public.drabornpark_timeline_events(owner_user_id, vehicle_id, event_type, title, description) values (drabornpark_uid, drabornpark_vehicle_id, 'GUEST_DRIVER_ENDED', 'Geçici sürücü sona erdi', 'Bildirim yönlendirmesi araç sahibine döndü.');
  return true;
end;
$$;

create or replace function public.drabornpark_create_routing_rule(drabornpark_vehicle_id uuid, drabornpark_rule_name text, drabornpark_days_of_week smallint[], drabornpark_start_time time, drabornpark_end_time time, drabornpark_target_type text, drabornpark_target_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare drabornpark_uid uuid := auth.uid(); drabornpark_row public.drabornpark_routing_rules%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  if not public.drabornpark_has_plus() then raise exception 'plus_required'; end if;
  if drabornpark_vehicle_id is not null and not exists(select 1 from public.drabornpark_vehicles v where v.id=drabornpark_vehicle_id and v.owner_user_id=drabornpark_uid) then raise exception 'vehicle_not_found'; end if;
  if drabornpark_rule_name is null or trim(drabornpark_rule_name)='' then raise exception 'rule_name_required'; end if;
  if drabornpark_days_of_week is null or cardinality(drabornpark_days_of_week)=0 or exists(select 1 from unnest(drabornpark_days_of_week) d where d < 1 or d > 7) then raise exception 'invalid_days'; end if;
  if drabornpark_start_time = drabornpark_end_time then raise exception 'invalid_time_range'; end if;
  if drabornpark_target_type not in ('owner','family','guest') then raise exception 'invalid_target_type'; end if;
  insert into public.drabornpark_routing_rules(owner_user_id, vehicle_id, rule_name, days_of_week, start_time, end_time, target_type, target_user_id, is_enabled) values (drabornpark_uid, drabornpark_vehicle_id, trim(drabornpark_rule_name), drabornpark_days_of_week, drabornpark_start_time, drabornpark_end_time, drabornpark_target_type, drabornpark_target_user_id, true) returning * into drabornpark_row;
  return to_jsonb(drabornpark_row);
end;
$$;

create or replace function public.drabornpark_delete_routing_rule(drabornpark_rule_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$ begin if auth.uid() is null then raise exception 'authentication_required'; end if; if not public.drabornpark_has_plus() then raise exception 'plus_required'; end if; delete from public.drabornpark_routing_rules where id=drabornpark_rule_id and owner_user_id=auth.uid(); return found; end; $$;

create or replace function public.drabornpark_add_emergency_contact(drabornpark_contact_name text, drabornpark_phone_e164 text, drabornpark_priority smallint default 1)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare drabornpark_uid uuid := auth.uid(); drabornpark_row public.drabornpark_emergency_contacts%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  if not public.drabornpark_has_plus() then raise exception 'plus_required'; end if;
  if drabornpark_contact_name is null or trim(drabornpark_contact_name)='' then raise exception 'contact_name_required'; end if;
  if drabornpark_priority < 1 or drabornpark_priority > 5 then raise exception 'invalid_priority'; end if;
  if (select count(*) from public.drabornpark_emergency_contacts where owner_user_id=drabornpark_uid and is_enabled) >= 5 then raise exception 'contact_limit_reached'; end if;
  insert into public.drabornpark_emergency_contacts(owner_user_id, contact_name, phone_e164, priority, is_enabled) values (drabornpark_uid, trim(drabornpark_contact_name), nullif(trim(drabornpark_phone_e164),''), drabornpark_priority, true) returning * into drabornpark_row;
  return to_jsonb(drabornpark_row);
end;
$$;

create or replace function public.drabornpark_delete_emergency_contact(drabornpark_contact_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$ begin if auth.uid() is null then raise exception 'authentication_required'; end if; if not public.drabornpark_has_plus() then raise exception 'plus_required'; end if; delete from public.drabornpark_emergency_contacts where id=drabornpark_contact_id and owner_user_id=auth.uid(); return found; end; $$;

revoke execute on function public.drabornpark_start_vehicle_mode(uuid,text,text,integer,jsonb) from public, anon;
revoke execute on function public.drabornpark_end_vehicle_mode(uuid) from public, anon;
revoke execute on function public.drabornpark_set_service_state(uuid,text,text) from public, anon;
revoke execute on function public.drabornpark_end_guest_driver(uuid) from public, anon;
revoke execute on function public.drabornpark_create_routing_rule(uuid,text,smallint[],time,time,text,uuid) from public, anon;
revoke execute on function public.drabornpark_delete_routing_rule(uuid) from public, anon;
revoke execute on function public.drabornpark_add_emergency_contact(text,text,smallint) from public, anon;
revoke execute on function public.drabornpark_delete_emergency_contact(uuid) from public, anon;
grant execute on function public.drabornpark_start_vehicle_mode(uuid,text,text,integer,jsonb) to authenticated;
grant execute on function public.drabornpark_end_vehicle_mode(uuid) to authenticated;
grant execute on function public.drabornpark_set_service_state(uuid,text,text) to authenticated;
grant execute on function public.drabornpark_end_guest_driver(uuid) to authenticated;
grant execute on function public.drabornpark_create_routing_rule(uuid,text,smallint[],time,time,text,uuid) to authenticated;
grant execute on function public.drabornpark_delete_routing_rule(uuid) to authenticated;
grant execute on function public.drabornpark_add_emergency_contact(text,text,smallint) to authenticated;
grant execute on function public.drabornpark_delete_emergency_contact(uuid) to authenticated;
