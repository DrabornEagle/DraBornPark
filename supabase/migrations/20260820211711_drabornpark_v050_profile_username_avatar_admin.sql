-- DraBornPark v0.5.0 — username, avatar profile fields and avatar storage.
-- Mirrors the live v0.5.0 profile migration and is intentionally idempotent.

alter table public.drabornpark_profiles add column if not exists username text;
alter table public.drabornpark_profiles add column if not exists avatar_url text;

update public.drabornpark_profiles p
set username = left(
  case
    when length(regexp_replace(lower(coalesce(nullif(trim(p.display_name), ''), split_part(coalesce(u.email,''),'@',1))), '[^a-z0-9._-]+', '', 'g')) >= 3
      then regexp_replace(lower(coalesce(nullif(trim(p.display_name), ''), split_part(coalesce(u.email,''),'@',1))), '[^a-z0-9._-]+', '', 'g')
    else 'user_' || substr(replace(p.user_id::text, '-', ''), 1, 10)
  end,
  24
)
from auth.users u
where u.id = p.user_id and p.username is null;

create unique index if not exists drabornpark_profiles_username_lower_uidx
  on public.drabornpark_profiles (lower(username))
  where username is not null;

create or replace function public.drabornpark_username_available(drabornpark_username text)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  select case
    when drabornpark_username is null then false
    when length(lower(trim(drabornpark_username))) < 3 then false
    when length(lower(trim(drabornpark_username))) > 24 then false
    when lower(trim(drabornpark_username)) !~ '^[a-z0-9._-]+$' then false
    else not exists (
      select 1 from public.drabornpark_profiles p
      where lower(p.username) = lower(trim(drabornpark_username))
    )
  end;
$function$;

create or replace function public.drabornpark_bootstrap_user(
  drabornpark_display_name text default null,
  drabornpark_username text default null,
  drabornpark_avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  drabornpark_uid uuid := auth.uid();
  drabornpark_email text := lower(nullif(trim(auth.jwt() ->> 'email'), ''));
  drabornpark_requested_username text := lower(nullif(trim(drabornpark_username), ''));
  drabornpark_fallback_username text;
  drabornpark_profile public.drabornpark_profiles%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;

  if drabornpark_requested_username is null then
    drabornpark_fallback_username := lower(nullif(trim(coalesce(
      auth.jwt() -> 'user_metadata' ->> 'username',
      drabornpark_display_name,
      split_part(coalesce(drabornpark_email, ''), '@', 1)
    )), ''));
    drabornpark_fallback_username := regexp_replace(coalesce(drabornpark_fallback_username, ''), '[^a-z0-9._-]+', '', 'g');
    if length(drabornpark_fallback_username) < 3 then
      drabornpark_fallback_username := 'user_' || substr(replace(drabornpark_uid::text, '-', ''), 1, 10);
    end if;
    drabornpark_requested_username := left(drabornpark_fallback_username, 24);
    if exists (
      select 1 from public.drabornpark_profiles p
      where lower(p.username) = drabornpark_requested_username and p.user_id <> drabornpark_uid
    ) then
      drabornpark_requested_username := left(drabornpark_requested_username, 17) || '_' || substr(replace(drabornpark_uid::text, '-', ''), 1, 6);
    end if;
  else
    if length(drabornpark_requested_username) < 3 or length(drabornpark_requested_username) > 24
       or drabornpark_requested_username !~ '^[a-z0-9._-]+$' then
      raise exception 'username_invalid';
    end if;
    if exists (
      select 1 from public.drabornpark_profiles p
      where lower(p.username) = drabornpark_requested_username and p.user_id <> drabornpark_uid
    ) then
      raise exception 'username_taken';
    end if;
  end if;

  insert into public.drabornpark_profiles(
    user_id, display_name, username, avatar_url, subscription_status, plus_trial_until
  )
  values (
    drabornpark_uid,
    coalesce(nullif(trim(drabornpark_display_name), ''), drabornpark_requested_username),
    drabornpark_requested_username,
    nullif(trim(drabornpark_avatar_url), ''),
    'PLUS_TRIAL',
    now() + interval '14 days'
  )
  on conflict (user_id) do update
    set display_name = coalesce(nullif(trim(excluded.display_name), ''), public.drabornpark_profiles.display_name),
        username = coalesce(excluded.username, public.drabornpark_profiles.username),
        avatar_url = coalesce(excluded.avatar_url, public.drabornpark_profiles.avatar_url),
        updated_at = now();

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
$function$;

create or replace function public.drabornpark_update_profile(
  drabornpark_username text default null,
  drabornpark_avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  drabornpark_uid uuid := auth.uid();
  drabornpark_normalized_username text := lower(nullif(trim(drabornpark_username), ''));
  drabornpark_profile public.drabornpark_profiles%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;

  if drabornpark_normalized_username is not null then
    if length(drabornpark_normalized_username) < 3 or length(drabornpark_normalized_username) > 24
       or drabornpark_normalized_username !~ '^[a-z0-9._-]+$' then
      raise exception 'username_invalid';
    end if;
    if exists (
      select 1 from public.drabornpark_profiles p
      where lower(p.username) = drabornpark_normalized_username and p.user_id <> drabornpark_uid
    ) then
      raise exception 'username_taken';
    end if;
  end if;

  update public.drabornpark_profiles
  set username = coalesce(drabornpark_normalized_username, username),
      display_name = coalesce(drabornpark_normalized_username, display_name),
      avatar_url = coalesce(nullif(trim(drabornpark_avatar_url), ''), avatar_url),
      updated_at = now()
  where user_id = drabornpark_uid
  returning * into drabornpark_profile;

  if drabornpark_profile.user_id is null then raise exception 'profile_not_found'; end if;
  return to_jsonb(drabornpark_profile);
end;
$function$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('drabornpark-avatars','drabornpark-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "drabornpark avatar public read" on storage.objects;
create policy "drabornpark avatar public read" on storage.objects for select
using (bucket_id='drabornpark-avatars');

drop policy if exists "drabornpark avatar owner insert" on storage.objects;
create policy "drabornpark avatar owner insert" on storage.objects for insert to authenticated
with check (bucket_id='drabornpark-avatars' and split_part(name,'/',1)=auth.uid()::text);

drop policy if exists "drabornpark avatar owner update" on storage.objects;
create policy "drabornpark avatar owner update" on storage.objects for update to authenticated
using (bucket_id='drabornpark-avatars' and split_part(name,'/',1)=auth.uid()::text)
with check (bucket_id='drabornpark-avatars' and split_part(name,'/',1)=auth.uid()::text);

drop policy if exists "drabornpark avatar owner delete" on storage.objects;
create policy "drabornpark avatar owner delete" on storage.objects for delete to authenticated
using (bucket_id='drabornpark-avatars' and split_part(name,'/',1)=auth.uid()::text);
