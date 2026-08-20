-- DraBornPark isolated schema additions.
-- IMPORTANT: This migration intentionally does not alter any existing DraBornGarage tables.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.drabornpark_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.drabornpark_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'drabornpark_role') = 'admin', false);
$$;

create table if not exists public.drabornpark_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone_e164 text,
  preferred_language text not null default 'tr',
  subscription_status text not null default 'BASIC' check (subscription_status in ('BASIC','PLUS_TRIAL','PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_EXPIRED','PLUS_CANCELLED')),
  plus_trial_until timestamptz,
  privacy_settings jsonb not null default '{"showPlate":true,"showBrandModel":true,"showColor":true}'::jsonb,
  notification_settings jsonb not null default '{"push":true,"emergency":true,"liveChat":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drabornpark_vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_name text not null default 'Aracım',
  plate text,
  brand text,
  model text,
  model_year integer check (model_year is null or model_year between 1900 and 2100),
  color text,
  vehicle_type text not null default 'car' check (vehicle_type in ('car','motorcycle','bike','other')),
  profile_image_path text,
  public_fields jsonb not null default '{"plate":true,"brandModel":true,"color":true}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drabornpark_vehicles_owner_idx on public.drabornpark_vehicles(owner_user_id);

create table if not exists public.drabornpark_tags (
  id uuid primary key default gen_random_uuid(),
  tag_code text not null unique check (tag_code ~ '^DP-[A-Z0-9]{6,12}$'),
  serial_number text not null unique,
  nfc_url text not null unique,
  activation_pin_hash text not null,
  status text not null default 'CREATED' check (status in ('CREATED','NFC_PENDING','NFC_VERIFIED','QR_VERIFIED','PACKED','READY_FOR_SALE','SOLD','ACTIVATED','DISABLED','TRANSFER_PENDING')),
  owner_user_id uuid references auth.users(id) on delete set null,
  vehicle_id uuid references public.drabornpark_vehicles(id) on delete set null,
  manufactured_at timestamptz not null default now(),
  sold_at timestamptz,
  activated_at timestamptz,
  last_verified_at timestamptz,
  disabled_at timestamptz,
  factory_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drabornpark_tags_owner_idx on public.drabornpark_tags(owner_user_id);
create index if not exists drabornpark_tags_vehicle_idx on public.drabornpark_tags(vehicle_id);
create index if not exists drabornpark_tags_status_idx on public.drabornpark_tags(status);

create table if not exists public.drabornpark_parks (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.drabornpark_vehicles(id) on delete cascade,
  place_name text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  accuracy_meters double precision,
  floor_code text,
  zone_name text,
  zone_color text,
  row_code text,
  bay_code text,
  note text,
  photo_path text,
  ticket_path text,
  source text not null default 'manual' check (source in ('manual','suggested','bluetooth','imported')),
  parked_at timestamptz not null default now(),
  reminder_at timestamptz,
  ended_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drabornpark_parks_owner_time_idx on public.drabornpark_parks(owner_user_id, parked_at desc);
create index if not exists drabornpark_parks_vehicle_time_idx on public.drabornpark_parks(vehicle_id, parked_at desc);

create table if not exists public.drabornpark_reports (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.drabornpark_tags(id) on delete cascade,
  vehicle_id uuid references public.drabornpark_vehicles(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete cascade,
  category text not null,
  priority text not null default 'normal' check (priority in ('normal','high','emergency')),
  message_original text,
  message_safe text,
  media_paths text[] not null default '{}',
  sender_session_key text,
  sender_ip_hash text,
  sender_user_agent text,
  status text not null default 'new' check (status in ('new','seen','replied','closed','blocked')),
  seen_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drabornpark_reports_owner_time_idx on public.drabornpark_reports(owner_user_id, created_at desc);
create index if not exists drabornpark_reports_tag_time_idx on public.drabornpark_reports(tag_id, created_at desc);

create table if not exists public.drabornpark_contact_sessions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.drabornpark_reports(id) on delete cascade,
  tag_id uuid not null references public.drabornpark_tags(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete cascade,
  public_token uuid not null default gen_random_uuid() unique,
  status text not null default 'open' check (status in ('open','closed','expired','blocked')),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists drabornpark_contact_sessions_owner_idx on public.drabornpark_contact_sessions(owner_user_id, created_at desc);

create table if not exists public.drabornpark_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.drabornpark_contact_sessions(id) on delete cascade,
  sender_role text not null check (sender_role in ('owner','visitor','system')),
  sender_user_id uuid references auth.users(id) on delete set null,
  body_original text,
  body_safe text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists drabornpark_messages_session_time_idx on public.drabornpark_messages(session_id, created_at);

create table if not exists public.drabornpark_timeline_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.drabornpark_vehicles(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists drabornpark_timeline_owner_time_idx on public.drabornpark_timeline_events(owner_user_id, occurred_at desc);

create table if not exists public.drabornpark_family_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete cascade,
  invite_email text,
  display_name text,
  role text not null default 'member' check (role in ('member','driver','viewer')),
  can_view_park boolean not null default false,
  can_receive_notifications boolean not null default false,
  status text not null default 'invited' check (status in ('invited','active','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (member_user_id is not null or invite_email is not null)
);
create index if not exists drabornpark_family_owner_idx on public.drabornpark_family_members(owner_user_id);

create table if not exists public.drabornpark_guest_drivers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.drabornpark_vehicles(id) on delete cascade,
  guest_user_id uuid references auth.users(id) on delete set null,
  guest_label text not null,
  redirect_notifications boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists drabornpark_guest_drivers_owner_idx on public.drabornpark_guest_drivers(owner_user_id, starts_at desc);

create table if not exists public.drabornpark_routing_rules (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.drabornpark_vehicles(id) on delete cascade,
  rule_name text not null,
  days_of_week smallint[] not null default '{1,2,3,4,5}',
  start_time time not null,
  end_time time not null,
  target_type text not null check (target_type in ('owner','family','guest')),
  target_user_id uuid references auth.users(id) on delete set null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drabornpark_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  contact_name text not null,
  phone_e164 text,
  contact_user_id uuid references auth.users(id) on delete set null,
  priority smallint not null default 1 check (priority between 1 and 5),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (phone_e164 is not null or contact_user_id is not null)
);

create table if not exists public.drabornpark_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google_play' check (provider in ('google_play','manual','promo')),
  product_id text not null default 'drabornpark_plus',
  base_plan_id text,
  purchase_token_hash text,
  status text not null check (status in ('PLUS_TRIAL','PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_EXPIRED','PLUS_CANCELLED')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  auto_renewing boolean,
  last_verified_at timestamptz,
  raw_provider_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drabornpark_subscriptions_user_idx on public.drabornpark_subscriptions(user_id, created_at desc);

create table if not exists public.drabornpark_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('android','ios','web')),
  device_label text,
  is_enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drabornpark_push_tokens_user_idx on public.drabornpark_push_tokens(user_id);

create table if not exists public.drabornpark_factory_events (
  id bigint generated always as identity primary key,
  tag_id uuid references public.drabornpark_tags(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.drabornpark_scan_events (
  id bigint generated always as identity primary key,
  tag_id uuid references public.drabornpark_tags(id) on delete cascade,
  session_key text,
  ip_hash text,
  user_agent text,
  action text not null check (action in ('lookup','notify','chat','photo')),
  created_at timestamptz not null default now()
);
create index if not exists drabornpark_scan_events_tag_time_idx on public.drabornpark_scan_events(tag_id, created_at desc);
create index if not exists drabornpark_scan_events_ip_time_idx on public.drabornpark_scan_events(ip_hash, created_at desc);

create table if not exists public.drabornpark_abuse_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.drabornpark_support_requests (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drabornpark_demo_scenarios (
  scenario_key text primary key,
  title text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

DO $$
DECLARE
  drabornpark_table_name text;
BEGIN
  FOREACH drabornpark_table_name IN ARRAY ARRAY[
    'drabornpark_profiles','drabornpark_vehicles','drabornpark_tags','drabornpark_parks',
    'drabornpark_reports','drabornpark_family_members','drabornpark_guest_drivers',
    'drabornpark_routing_rules','drabornpark_emergency_contacts','drabornpark_subscriptions',
    'drabornpark_push_tokens','drabornpark_support_requests'
  ]
  LOOP
    EXECUTE format('drop trigger if exists %I on public.%I', drabornpark_table_name || '_set_updated_at', drabornpark_table_name);
    EXECUTE format('create trigger %I before update on public.%I for each row execute function public.drabornpark_set_updated_at()', drabornpark_table_name || '_set_updated_at', drabornpark_table_name);
  END LOOP;
END $$;

create or replace function public.drabornpark_factory_create_tag(drabornpark_serial_number text default null)
returns table(tag_code text, serial_number text, nfc_url text, activation_pin text)
language plpgsql
security definer
set search_path = public, extensions
as $$
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
    exit when not exists (select 1 from public.drabornpark_tags dpt where dpt.tag_code = drabornpark_code);
  end loop;

  drabornpark_serial := coalesce(nullif(trim(drabornpark_serial_number), ''), 'DPS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8)));
  drabornpark_pin := lpad((floor(random() * 100000000))::bigint::text, 8, '0');

  insert into public.drabornpark_tags(tag_code, serial_number, nfc_url, activation_pin_hash, status)
  values (drabornpark_code, drabornpark_serial, 'https://p.draborn.com/t/' || replace(drabornpark_code, 'DP-', ''), extensions.crypt(drabornpark_pin, extensions.gen_salt('bf')), 'NFC_PENDING')
  returning id into drabornpark_tag_id;

  insert into public.drabornpark_factory_events(tag_id, actor_user_id, event_type, metadata)
  values (drabornpark_tag_id, auth.uid(), 'TAG_CREATED', jsonb_build_object('serialNumber', drabornpark_serial));

  return query select drabornpark_code, drabornpark_serial, 'https://p.draborn.com/t/' || replace(drabornpark_code, 'DP-', ''), drabornpark_pin;
end;
$$;

create or replace function public.drabornpark_activate_tag(drabornpark_tag_code text, drabornpark_pin text, drabornpark_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  drabornpark_user_id uuid := auth.uid();
  drabornpark_tag public.drabornpark_tags%rowtype;
begin
  if drabornpark_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.drabornpark_vehicles v
    where v.id = drabornpark_vehicle_id and v.owner_user_id = drabornpark_user_id
  ) then
    raise exception 'Vehicle not found';
  end if;

  select * into drabornpark_tag
  from public.drabornpark_tags t
  where t.tag_code = upper(trim(drabornpark_tag_code))
  for update;

  if drabornpark_tag.id is null then
    raise exception 'Tag not found';
  end if;

  if drabornpark_tag.status in ('ACTIVATED','DISABLED') then
    raise exception 'Tag is not available for activation';
  end if;

  if extensions.crypt(regexp_replace(drabornpark_pin, '[^0-9]', '', 'g'), drabornpark_tag.activation_pin_hash) <> drabornpark_tag.activation_pin_hash then
    raise exception 'Invalid activation PIN';
  end if;

  update public.drabornpark_tags
  set owner_user_id = drabornpark_user_id,
      vehicle_id = drabornpark_vehicle_id,
      status = 'ACTIVATED',
      activated_at = coalesce(activated_at, now()),
      updated_at = now()
  where id = drabornpark_tag.id;

  insert into public.drabornpark_timeline_events(owner_user_id, vehicle_id, event_type, title, description, metadata)
  values (drabornpark_user_id, drabornpark_vehicle_id, 'TAG_ACTIVATED', 'DraBornPark etiketi aktive edildi', 'Etiket aracınıza güvenle bağlandı.', jsonb_build_object('tagCode', drabornpark_tag.tag_code));

  insert into public.drabornpark_factory_events(tag_id, actor_user_id, event_type, metadata)
  values (drabornpark_tag.id, drabornpark_user_id, 'TAG_ACTIVATED', jsonb_build_object('vehicleId', drabornpark_vehicle_id));

  return jsonb_build_object('ok', true, 'tagCode', drabornpark_tag.tag_code, 'vehicleId', drabornpark_vehicle_id);
end;
$$;

create or replace function public.drabornpark_public_tag_snapshot(drabornpark_tag_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  drabornpark_result jsonb;
begin
  select jsonb_build_object(
    'tagCode', t.tag_code,
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
  left join public.drabornpark_vehicles v on v.id = t.vehicle_id
  where t.tag_code = upper(trim(drabornpark_tag_code))
    and t.status = 'ACTIVATED';

  return drabornpark_result;
end;
$$;

alter table public.drabornpark_profiles enable row level security;
alter table public.drabornpark_vehicles enable row level security;
alter table public.drabornpark_tags enable row level security;
alter table public.drabornpark_parks enable row level security;
alter table public.drabornpark_reports enable row level security;
alter table public.drabornpark_contact_sessions enable row level security;
alter table public.drabornpark_messages enable row level security;
alter table public.drabornpark_timeline_events enable row level security;
alter table public.drabornpark_family_members enable row level security;
alter table public.drabornpark_guest_drivers enable row level security;
alter table public.drabornpark_routing_rules enable row level security;
alter table public.drabornpark_emergency_contacts enable row level security;
alter table public.drabornpark_subscriptions enable row level security;
alter table public.drabornpark_push_tokens enable row level security;
alter table public.drabornpark_factory_events enable row level security;
alter table public.drabornpark_scan_events enable row level security;
alter table public.drabornpark_abuse_limits enable row level security;
alter table public.drabornpark_support_requests enable row level security;
alter table public.drabornpark_demo_scenarios enable row level security;

create policy drabornpark_profiles_select_own on public.drabornpark_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy drabornpark_profiles_insert_own on public.drabornpark_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy drabornpark_profiles_update_own on public.drabornpark_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy drabornpark_vehicles_select_own on public.drabornpark_vehicles for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy drabornpark_vehicles_insert_own on public.drabornpark_vehicles for insert to authenticated with check ((select auth.uid()) = owner_user_id);
create policy drabornpark_vehicles_update_own on public.drabornpark_vehicles for update to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);
create policy drabornpark_vehicles_delete_own on public.drabornpark_vehicles for delete to authenticated using ((select auth.uid()) = owner_user_id);
create policy drabornpark_tags_select_own on public.drabornpark_tags for select to authenticated using ((select auth.uid()) = owner_user_id or public.drabornpark_is_admin());
create policy drabornpark_tags_admin_all on public.drabornpark_tags for all to authenticated using (public.drabornpark_is_admin()) with check (public.drabornpark_is_admin());
create policy drabornpark_parks_owner_all on public.drabornpark_parks for all to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);
create policy drabornpark_reports_owner_select on public.drabornpark_reports for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy drabornpark_reports_owner_update on public.drabornpark_reports for update to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);
create policy drabornpark_contact_sessions_owner_select on public.drabornpark_contact_sessions for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy drabornpark_messages_owner_select on public.drabornpark_messages for select to authenticated using (exists (select 1 from public.drabornpark_contact_sessions s where s.id = session_id and s.owner_user_id = (select auth.uid())));
create policy drabornpark_messages_owner_insert on public.drabornpark_messages for insert to authenticated with check (sender_role = 'owner' and sender_user_id = (select auth.uid()) and exists (select 1 from public.drabornpark_contact_sessions s where s.id = session_id and s.owner_user_id = (select auth.uid()) and s.status = 'open' and s.expires_at > now()));
create policy drabornpark_timeline_owner_select on public.drabornpark_timeline_events for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy drabornpark_family_owner_all on public.drabornpark_family_members for all to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);
create policy drabornpark_family_member_select on public.drabornpark_family_members for select to authenticated using ((select auth.uid()) = member_user_id and status = 'active');
create policy drabornpark_guest_owner_all on public.drabornpark_guest_drivers for all to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);
create policy drabornpark_routing_owner_all on public.drabornpark_routing_rules for all to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);
create policy drabornpark_emergency_owner_all on public.drabornpark_emergency_contacts for all to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);
create policy drabornpark_subscriptions_owner_select on public.drabornpark_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy drabornpark_push_owner_all on public.drabornpark_push_tokens for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy drabornpark_factory_admin_select on public.drabornpark_factory_events for select to authenticated using (public.drabornpark_is_admin());
create policy drabornpark_support_owner_all on public.drabornpark_support_requests for all to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);
create policy drabornpark_demo_public_read on public.drabornpark_demo_scenarios for select to anon, authenticated using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('drabornpark-private', 'drabornpark-private', false, 10485760, array['image/jpeg','image/png','image/webp','video/mp4'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy drabornpark_storage_select_own on storage.objects for select to authenticated using (bucket_id = 'drabornpark-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy drabornpark_storage_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'drabornpark-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy drabornpark_storage_update_own on storage.objects for update to authenticated using (bucket_id = 'drabornpark-private' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'drabornpark-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy drabornpark_storage_delete_own on storage.objects for delete to authenticated using (bucket_id = 'drabornpark-private' and (storage.foldername(name))[1] = (select auth.uid())::text);

revoke all on function public.drabornpark_factory_create_tag(text) from public;
grant execute on function public.drabornpark_factory_create_tag(text) to authenticated;
revoke all on function public.drabornpark_activate_tag(text,text,uuid) from public;
grant execute on function public.drabornpark_activate_tag(text,text,uuid) to authenticated;
revoke all on function public.drabornpark_public_tag_snapshot(text) from public;
grant execute on function public.drabornpark_public_tag_snapshot(text) to anon, authenticated;

insert into public.drabornpark_demo_scenarios (scenario_key, title, payload)
values ('default','DraBornPark Expo Go Demo',jsonb_build_object(
  'profile', jsonb_build_object('displayName','Draborn Eagle','plan','PLUS_TRIAL','trialDaysLeft',14),
  'vehicle', jsonb_build_object('id','demo-vehicle-1','name','Volkswagen Tiguan','plate','06 DBP 2026','brand','Volkswagen','model','Tiguan','year',2025,'color','Gece Mavisi','type','car','tagCode','DP-K7M4X2P9','tagStatus','ACTIVATED'),
  'lastPark', jsonb_build_object('placeName','Metromall AVM','floor','P2','zoneColor','Mavi','row','C','bay','128','latitude',39.9357,'longitude',32.8063,'parkedAt','2026-08-20T00:32:00+03:00','photoHint','P2 Mavi C-128'),
  'notifications', jsonb_build_array(
    jsonb_build_object('id','n1','category','Farlarınız açık','title','Farlarınız açık olabilir','body','Aracınız için yeni bir bildirim gönderildi.','priority','normal','minutesAgo',5,'seen',false),
    jsonb_build_object('id','n2','category','Aracı hareket ettir','title','Aracınızı hareket ettirmeniz isteniyor','body','Bir kullanıcı aracınızın başka bir aracın çıkışını engellediğini bildirdi.','priority','high','minutesAgo',18,'seen',true),
    jsonb_build_object('id','n3','category','Tanık Modu','title','Fotoğraflı olay bildirimi','body','Aracınızla ilgili bir olaya şahit olundu.','priority','normal','minutesAgo',93,'seen',true)),
  'timeline', jsonb_build_array(
    jsonb_build_object('type','PARKED','title','Park edildi','detail','Metromall AVM • P2 • Mavi • C128','time','20 Ağustos 00:32'),
    jsonb_build_object('type','LIGHTS','title','Far açık bildirimi','detail','Bir kullanıcı farlarınızın açık olabileceğini bildirdi.','time','19 Ağustos 23:58'),
    jsonb_build_object('type','PHOTO_REPORT','title','Fotoğraflı hasar bildirimi','detail','Sağ ön kapı bölgesi için fotoğraflı bildirim alındı.','time','16 Ağustos 21:03')),
  'stats', jsonb_build_object('parksThisMonth',17,'reportsThisMonth',3,'averageParkMinutes',102,'favoritePlace','Metromall AVM')))
on conflict (scenario_key) do update set title = excluded.title, payload = excluded.payload, updated_at = now();
