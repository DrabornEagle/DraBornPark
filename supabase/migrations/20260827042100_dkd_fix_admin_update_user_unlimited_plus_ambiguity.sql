create or replace function public.dkd_drabornpark_admin_update_user(dkd_target_user_id uuid, dkd_username text default null::text, dkd_display_name text default null::text, dkd_unlimited_plus boolean default null::boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  dkd_clean_username text;
begin
  if not public.drabornpark_is_admin() then raise exception 'admin_required'; end if;
  if dkd_target_user_id is null then raise exception 'user_required'; end if;

  dkd_clean_username:=case when dkd_username is null then null else lower(trim(dkd_username)) end;

  if dkd_clean_username is not null and (length(dkd_clean_username)<3 or length(dkd_clean_username)>24 or dkd_clean_username !~ '^[a-z0-9._-]+$') then
    raise exception 'invalid_username';
  end if;

  if dkd_clean_username is not null and exists(
    select 1
    from public.drabornpark_profiles dkd_other
    where dkd_other.user_id<>dkd_target_user_id
      and dkd_other.username=dkd_clean_username
  ) then
    raise exception 'username_taken';
  end if;

  update public.drabornpark_profiles as dkd_profile
  set username=case when dkd_username is null then dkd_profile.username else nullif(dkd_clean_username,'') end,
      display_name=case when dkd_display_name is null then dkd_profile.display_name else nullif(trim(dkd_display_name),'') end,
      dkd_unlimited_plus=coalesce($4,dkd_profile.dkd_unlimited_plus),
      updated_at=now()
  where dkd_profile.user_id=dkd_target_user_id;

  if not found then raise exception 'user_not_found'; end if;

  perform public.dkd_drabornpark_sync_plus_tags_internal(dkd_target_user_id);

  return (
    select jsonb_build_object(
      'ok',true,
      'userId',dkd_profile.user_id,
      'username',dkd_profile.username,
      'displayName',dkd_profile.display_name,
      'unlimitedPlus',dkd_profile.dkd_unlimited_plus,
      'subscriptionStatus',dkd_profile.subscription_status,
      'trialUntil',dkd_profile.plus_trial_until
    )
    from public.drabornpark_profiles dkd_profile
    where dkd_profile.user_id=dkd_target_user_id
  );
end;
$function$;
