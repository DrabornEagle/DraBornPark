create or replace function public.dkd_drabornpark_admin_search_users(dkd_query text default ''::text)
returns table(
  dkd_user_id uuid,
  dkd_email text,
  dkd_username text,
  dkd_display_name text,
  dkd_subscription_status text,
  dkd_plus_trial_until timestamptz,
  dkd_unlimited_plus boolean,
  dkd_tag_count bigint,
  dkd_active_tag_count bigint,
  dkd_created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public','auth','pg_temp'
as $function$
declare
  dkd_search text := lower(trim(coalesce(dkd_query,'')));
begin
  if not public.drabornpark_is_admin() then
    raise exception 'admin_required';
  end if;

  return query
  select
    dkd_profile.user_id::uuid,
    dkd_auth.email::text,
    dkd_profile.username::text,
    dkd_profile.display_name::text,
    dkd_profile.subscription_status::text,
    dkd_profile.plus_trial_until::timestamptz,
    coalesce(dkd_profile.dkd_unlimited_plus,false)::boolean,
    count(dkd_tag.id)::bigint,
    count(dkd_tag.id) filter(where dkd_tag.status='ACTIVATED')::bigint,
    dkd_profile.created_at::timestamptz
  from public.drabornpark_profiles dkd_profile
  join auth.users dkd_auth on dkd_auth.id=dkd_profile.user_id
  left join public.drabornpark_tags dkd_tag on dkd_tag.owner_user_id=dkd_profile.user_id
  where dkd_search=''
     or lower(coalesce(dkd_auth.email::text,'')) like '%'||dkd_search||'%'
     or lower(coalesce(dkd_profile.username::text,'')) like '%'||dkd_search||'%'
     or lower(coalesce(dkd_profile.display_name::text,'')) like '%'||dkd_search||'%'
  group by
    dkd_profile.user_id,
    dkd_auth.email,
    dkd_profile.username,
    dkd_profile.display_name,
    dkd_profile.subscription_status,
    dkd_profile.plus_trial_until,
    dkd_profile.dkd_unlimited_plus,
    dkd_profile.created_at
  order by dkd_profile.created_at desc
  limit 100;
end;
$function$;
