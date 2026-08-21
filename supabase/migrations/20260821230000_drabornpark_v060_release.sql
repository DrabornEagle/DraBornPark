-- DraBornPark v0.6.0 release migration mirror.
-- Live project migration was applied through Supabase on 2026-08-21.

create table if not exists public.drabornpark_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.drabornpark_admin_users enable row level security;
drop policy if exists "drabornpark_admin_users_select_self" on public.drabornpark_admin_users;
create policy "drabornpark_admin_users_select_self" on public.drabornpark_admin_users for select to authenticated using (user_id=auth.uid());

create or replace function public.drabornpark_is_admin()
returns boolean language sql stable security definer set search_path to 'public','pg_temp'
as $function$
  select exists(select 1 from public.drabornpark_admin_users a where a.user_id=auth.uid())
  or coalesce((auth.jwt()->'app_metadata'->>'drabornpark_role')='admin',false)
  or lower(coalesce(auth.jwt()->>'email',''))='draborneagle@gmail.com';
$function$;
grant execute on function public.drabornpark_is_admin() to authenticated;

create table if not exists public.drabornpark_admin_notifications (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  support_request_id uuid references public.drabornpark_support_requests(id) on delete cascade,
  notification_type text not null default 'support_request',
  title text not null,
  body text not null,
  route text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique(admin_user_id,support_request_id,notification_type)
);
create index if not exists drabornpark_admin_notifications_user_created_idx on public.drabornpark_admin_notifications(admin_user_id,created_at desc);
alter table public.drabornpark_admin_notifications enable row level security;
drop policy if exists "drabornpark_admin_notifications_select_own" on public.drabornpark_admin_notifications;
create policy "drabornpark_admin_notifications_select_own" on public.drabornpark_admin_notifications for select to authenticated using (admin_user_id=auth.uid() and public.drabornpark_is_admin());
drop policy if exists "drabornpark_admin_notifications_update_own" on public.drabornpark_admin_notifications;
create policy "drabornpark_admin_notifications_update_own" on public.drabornpark_admin_notifications for update to authenticated using (admin_user_id=auth.uid() and public.drabornpark_is_admin()) with check (admin_user_id=auth.uid() and public.drabornpark_is_admin());

drop policy if exists "drabornpark_support_admin_select" on public.drabornpark_support_requests;
create policy "drabornpark_support_admin_select" on public.drabornpark_support_requests for select to authenticated using (public.drabornpark_is_admin());
drop policy if exists "drabornpark_support_admin_update" on public.drabornpark_support_requests;
create policy "drabornpark_support_admin_update" on public.drabornpark_support_requests for update to authenticated using (public.drabornpark_is_admin()) with check (public.drabornpark_is_admin());
drop policy if exists "drabornpark_profiles_admin_select" on public.drabornpark_profiles;
create policy "drabornpark_profiles_admin_select" on public.drabornpark_profiles for select to authenticated using (public.drabornpark_is_admin());

create or replace function public.drabornpark_support_notify_admin_dkd()
returns trigger language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
begin
  insert into public.drabornpark_admin_notifications(admin_user_id,support_request_id,notification_type,title,body,route)
  select a.user_id,new.id,'support_request','Yeni DraBornPark destek kaydı',left(new.subject,180),'/admin/support/'||new.id::text
  from public.drabornpark_admin_users a
  on conflict(admin_user_id,support_request_id,notification_type) do nothing;
  return new;
end;
$function$;
drop trigger if exists drabornpark_support_notify_admin_dkd on public.drabornpark_support_requests;
create trigger drabornpark_support_notify_admin_dkd after insert on public.drabornpark_support_requests for each row execute function public.drabornpark_support_notify_admin_dkd();

create or replace function public.drabornpark_admin_support_request_dkd(drabornpark_support_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp'
as $function$
declare drabornpark_result jsonb;
begin
  if not public.drabornpark_is_admin() then raise exception 'admin_required'; end if;
  select jsonb_build_object('id',r.id,'ownerUserId',r.owner_user_id,'subject',r.subject,'body',r.body,'status',r.status,'createdAt',r.created_at,'updatedAt',r.updated_at,'username',p.username,'displayName',p.display_name,'phone',p.phone_e164)
  into drabornpark_result from public.drabornpark_support_requests r left join public.drabornpark_profiles p on p.user_id=r.owner_user_id where r.id=drabornpark_support_request_id;
  if drabornpark_result is null then raise exception 'support_request_not_found'; end if;
  return drabornpark_result;
end;
$function$;
grant execute on function public.drabornpark_admin_support_request_dkd(uuid) to authenticated;

create or replace function public.drabornpark_admin_support_inbox_dkd(drabornpark_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp'
as $function$
declare drabornpark_result jsonb;
begin
  if not public.drabornpark_is_admin() then raise exception 'admin_required'; end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into drabornpark_result
  from (select r.id,r.subject,r.status,r.created_at,r.updated_at,coalesce(p.username,p.display_name,'Kullanıcı') as username from public.drabornpark_support_requests r left join public.drabornpark_profiles p on p.user_id=r.owner_user_id order by r.created_at desc limit greatest(1,least(coalesce(drabornpark_limit,50),100))) x;
  return drabornpark_result;
end;
$function$;
grant execute on function public.drabornpark_admin_support_inbox_dkd(integer) to authenticated;

create or replace function public.drabornpark_mark_admin_notification_read_dkd(drabornpark_support_request_id uuid)
returns boolean language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
begin
  if not public.drabornpark_is_admin() then raise exception 'admin_required'; end if;
  update public.drabornpark_admin_notifications set read_at=coalesce(read_at,now()) where admin_user_id=auth.uid() and support_request_id=drabornpark_support_request_id;
  return true;
end;
$function$;
grant execute on function public.drabornpark_mark_admin_notification_read_dkd(uuid) to authenticated;

create or replace function public.drabornpark_bootstrap_phone_from_metadata_dkd()
returns text language plpgsql stable security definer set search_path to 'public','pg_temp'
as $function$
declare drabornpark_phone text := nullif(trim(auth.jwt()->'user_metadata'->>'phone_e164'),'');
begin
  if drabornpark_phone is null then return null; end if;
  if drabornpark_phone !~ '^\+[1-9][0-9]{7,14}$' then return null; end if;
  return drabornpark_phone;
end;
$function$;
grant execute on function public.drabornpark_bootstrap_phone_from_metadata_dkd() to authenticated;

create or replace function public.drabornpark_bootstrap_user(drabornpark_display_name text default null,drabornpark_username text default null,drabornpark_avatar_url text default null)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  drabornpark_uid uuid := auth.uid();
  drabornpark_email text := lower(nullif(trim(auth.jwt()->>'email'),''));
  drabornpark_requested_username text := lower(nullif(trim(drabornpark_username),''));
  drabornpark_fallback_username text;
  drabornpark_phone text := public.drabornpark_bootstrap_phone_from_metadata_dkd();
  drabornpark_profile public.drabornpark_profiles%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  if drabornpark_requested_username is null then
    drabornpark_fallback_username := lower(nullif(trim(coalesce(auth.jwt()->'user_metadata'->>'username',drabornpark_display_name,split_part(coalesce(drabornpark_email,''),'@',1))),''));
    drabornpark_fallback_username := regexp_replace(coalesce(drabornpark_fallback_username,''),'[^a-z0-9._-]+','','g');
    if length(drabornpark_fallback_username)<3 then drabornpark_fallback_username := 'user_'||substr(replace(drabornpark_uid::text,'-',''),1,10); end if;
    drabornpark_requested_username := left(drabornpark_fallback_username,24);
    if exists(select 1 from public.drabornpark_profiles p where lower(p.username)=drabornpark_requested_username and p.user_id<>drabornpark_uid) then drabornpark_requested_username := left(drabornpark_requested_username,17)||'_'||substr(replace(drabornpark_uid::text,'-',''),1,6); end if;
  else
    if length(drabornpark_requested_username)<3 or length(drabornpark_requested_username)>24 or drabornpark_requested_username !~ '^[a-z0-9._-]+$' then raise exception 'username_invalid'; end if;
    if exists(select 1 from public.drabornpark_profiles p where lower(p.username)=drabornpark_requested_username and p.user_id<>drabornpark_uid) then raise exception 'username_taken'; end if;
  end if;
  insert into public.drabornpark_profiles(user_id,display_name,username,avatar_url,phone_e164,subscription_status,plus_trial_until)
  values(drabornpark_uid,coalesce(nullif(trim(drabornpark_display_name),''),drabornpark_requested_username),drabornpark_requested_username,nullif(trim(drabornpark_avatar_url),''),drabornpark_phone,'BASIC',null)
  on conflict(user_id) do update set display_name=coalesce(nullif(trim(excluded.display_name),''),public.drabornpark_profiles.display_name),username=coalesce(excluded.username,public.drabornpark_profiles.username),avatar_url=coalesce(excluded.avatar_url,public.drabornpark_profiles.avatar_url),phone_e164=coalesce(excluded.phone_e164,public.drabornpark_profiles.phone_e164),updated_at=now();
  if drabornpark_email is not null then update public.drabornpark_family_members set member_user_id=drabornpark_uid,status='active',updated_at=now() where lower(invite_email)=drabornpark_email and owner_user_id<>drabornpark_uid and status='invited' and (member_user_id is null or member_user_id=drabornpark_uid); end if;
  select * into drabornpark_profile from public.drabornpark_profiles where user_id=drabornpark_uid;
  return to_jsonb(drabornpark_profile);
end;
$function$;

create or replace function public.drabornpark_activate_tag(drabornpark_tag_code text,drabornpark_pin text,drabornpark_vehicle_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public','extensions'
as $function$
declare
  drabornpark_user_id uuid := auth.uid();
  drabornpark_tag public.drabornpark_tags%rowtype;
  drabornpark_trial_until timestamptz;
begin
  if drabornpark_user_id is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.drabornpark_vehicles v where v.id=drabornpark_vehicle_id and v.owner_user_id=drabornpark_user_id) then raise exception 'Vehicle not found'; end if;
  select * into drabornpark_tag from public.drabornpark_tags t where t.tag_code=upper(trim(drabornpark_tag_code)) for update;
  if drabornpark_tag.id is null then raise exception 'Tag not found'; end if;
  if drabornpark_tag.status in ('ACTIVATED','DISABLED') then raise exception 'Tag is not available for activation'; end if;
  if extensions.crypt(regexp_replace(drabornpark_pin,'[^0-9]','','g'),drabornpark_tag.activation_pin_hash)<>drabornpark_tag.activation_pin_hash then raise exception 'Invalid activation PIN'; end if;
  update public.drabornpark_tags set owner_user_id=drabornpark_user_id,vehicle_id=drabornpark_vehicle_id,status='ACTIVATED',activated_at=coalesce(activated_at,now()),updated_at=now() where id=drabornpark_tag.id;
  update public.drabornpark_profiles set subscription_status=case when subscription_status in ('BASIC','PLUS_TRIAL') then 'PLUS_TRIAL' else subscription_status end,plus_trial_until=case when subscription_status in ('BASIC','PLUS_TRIAL') then greatest(coalesce(plus_trial_until,now()),now())+interval '14 days' else plus_trial_until end,updated_at=now() where user_id=drabornpark_user_id returning plus_trial_until into drabornpark_trial_until;
  insert into public.drabornpark_timeline_events(owner_user_id,vehicle_id,event_type,title,description,metadata) values(drabornpark_user_id,drabornpark_vehicle_id,'TAG_ACTIVATED','DraBornPark etiketi aktive edildi','Etiket aracınıza güvenle bağlandı. 14 günlük DraBornPark+ ödülü hesabınıza eklendi.',jsonb_build_object('tagCode',drabornpark_tag.tag_code,'trialUntil',drabornpark_trial_until));
  insert into public.drabornpark_factory_events(tag_id,actor_user_id,event_type,metadata) values(drabornpark_tag.id,drabornpark_user_id,'TAG_ACTIVATED',jsonb_build_object('vehicleId',drabornpark_vehicle_id,'trialUntil',drabornpark_trial_until));
  return jsonb_build_object('ok',true,'tagCode',drabornpark_tag.tag_code,'vehicleId',drabornpark_vehicle_id,'trialUntil',drabornpark_trial_until);
end;
$function$;

alter table public.drabornpark_subscriptions add column if not exists order_id text;
alter table public.drabornpark_subscriptions add column if not exists package_name text;
alter table public.drabornpark_subscriptions add column if not exists environment text not null default 'production';
alter table public.drabornpark_subscriptions add column if not exists acknowledged boolean;
create index if not exists drabornpark_subscriptions_user_status_idx on public.drabornpark_subscriptions(user_id,status,expires_at desc);
create unique index if not exists drabornpark_subscriptions_purchase_token_hash_uidx on public.drabornpark_subscriptions(purchase_token_hash) where purchase_token_hash is not null;
