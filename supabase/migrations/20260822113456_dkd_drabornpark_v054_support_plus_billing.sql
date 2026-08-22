alter table public.drabornpark_support_requests
  add column if not exists admin_seen_at timestamptz,
  add column if not exists admin_seen_by uuid references auth.users(id) on delete set null,
  add column if not exists resolution_note text;

create index if not exists dkd_drabornpark_support_status_created_idx on public.drabornpark_support_requests(status,created_at desc);
create index if not exists dkd_drabornpark_support_admin_unseen_idx on public.drabornpark_support_requests(created_at desc) where admin_seen_at is null;
alter table public.drabornpark_support_requests enable row level security;
drop policy if exists drabornpark_support_owner_all on public.drabornpark_support_requests;
drop policy if exists dkd_drabornpark_support_owner_select_v054 on public.drabornpark_support_requests;
drop policy if exists dkd_drabornpark_support_owner_insert_v054 on public.drabornpark_support_requests;
drop policy if exists dkd_drabornpark_support_admin_select_v054 on public.drabornpark_support_requests;
drop policy if exists dkd_drabornpark_support_admin_update_v054 on public.drabornpark_support_requests;
create policy dkd_drabornpark_support_owner_select_v054 on public.drabornpark_support_requests for select to authenticated using ((select auth.uid())=owner_user_id);
create policy dkd_drabornpark_support_owner_insert_v054 on public.drabornpark_support_requests for insert to authenticated with check ((select auth.uid())=owner_user_id);
create policy dkd_drabornpark_support_admin_select_v054 on public.drabornpark_support_requests for select to authenticated using (public.drabornpark_is_admin());
create policy dkd_drabornpark_support_admin_update_v054 on public.drabornpark_support_requests for update to authenticated using (public.drabornpark_is_admin()) with check (public.drabornpark_is_admin());
grant select,insert,update on public.drabornpark_support_requests to authenticated;

create unique index if not exists dkd_drabornpark_subscription_token_hash_uidx on public.drabornpark_subscriptions(purchase_token_hash) where purchase_token_hash is not null;
create index if not exists dkd_drabornpark_subscription_user_expiry_idx on public.drabornpark_subscriptions(user_id,expires_at desc,created_at desc);

create or replace function public.dkd_drabornpark_bootstrap_user_v054(dkd_display_name text default null,dkd_username text default null,dkd_avatar_url text default null,dkd_phone_e164 text default null)
returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $function$
declare dkd_uid uuid:=auth.uid();dkd_profile_existed boolean;dkd_phone text:=nullif(regexp_replace(coalesce(dkd_phone_e164,''),'[^0-9+]','','g'),'');dkd_result jsonb;
begin
 if dkd_uid is null then raise exception 'authentication_required'; end if;
 select exists(select 1 from public.drabornpark_profiles p where p.user_id=dkd_uid) into dkd_profile_existed;
 dkd_result:=public.drabornpark_bootstrap_user(dkd_display_name,dkd_username,dkd_avatar_url);
 if dkd_phone is not null and dkd_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'phone_invalid'; end if;
 update public.drabornpark_profiles p set phone_e164=coalesce(dkd_phone,p.phone_e164),subscription_status=case when dkd_profile_existed then p.subscription_status else 'BASIC' end,plus_trial_until=case when dkd_profile_existed then p.plus_trial_until else null end,updated_at=now() where p.user_id=dkd_uid;
 select to_jsonb(p) into dkd_result from public.drabornpark_profiles p where p.user_id=dkd_uid;return dkd_result;
end;$function$;
revoke all on function public.dkd_drabornpark_bootstrap_user_v054(text,text,text,text) from public,anon;
grant execute on function public.dkd_drabornpark_bootstrap_user_v054(text,text,text,text) to authenticated;

create or replace function public.dkd_drabornpark_activate_tag_v054(dkd_tag_code text,dkd_pin text,dkd_vehicle_id uuid)
returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $function$
declare dkd_uid uuid:=auth.uid();dkd_result jsonb;dkd_reward_start timestamptz:=now();dkd_trial_until timestamptz;dkd_latest_paid_expiry timestamptz;
begin
 if dkd_uid is null then raise exception 'authentication_required'; end if;
 dkd_result:=public.drabornpark_activate_tag(dkd_tag_code,dkd_pin,dkd_vehicle_id);
 select max(s.expires_at) into dkd_latest_paid_expiry from public.drabornpark_subscriptions s where s.user_id=dkd_uid and s.status in ('PLUS_ACTIVE','PLUS_GRACE_PERIOD','PLUS_CANCELLED') and (s.expires_at is null or s.expires_at>now());
 select greatest(now(),coalesce(p.plus_trial_until,now()),coalesce(dkd_latest_paid_expiry,now()))+interval '14 days' into dkd_trial_until from public.drabornpark_profiles p where p.user_id=dkd_uid;
 update public.drabornpark_profiles p set plus_trial_until=dkd_trial_until,subscription_status=case when dkd_latest_paid_expiry is not null then p.subscription_status else 'PLUS_TRIAL' end,updated_at=now() where p.user_id=dkd_uid;
 insert into public.drabornpark_timeline_events(owner_user_id,vehicle_id,event_type,title,description,metadata) values(dkd_uid,dkd_vehicle_id,'PLUS_REWARD_GRANTED','14 Gün DraBornPark+ kazandınız','Yeni etiket aktivasyonunuzla 14 günlük DraBornPark+ ödülü hesabınıza eklendi.',jsonb_build_object('rewardDays',14,'startsAfter',coalesce(dkd_latest_paid_expiry,dkd_reward_start),'plusTrialUntil',dkd_trial_until));
 return coalesce(dkd_result,'{}'::jsonb)||jsonb_build_object('rewardGranted',true,'rewardDays',14,'plusTrialUntil',dkd_trial_until,'rewardStartsAfter',coalesce(dkd_latest_paid_expiry,dkd_reward_start));
end;$function$;
revoke all on function public.dkd_drabornpark_activate_tag_v054(text,text,uuid) from public,anon;
grant execute on function public.dkd_drabornpark_activate_tag_v054(text,text,uuid) to authenticated;

do $block$ begin
 if not exists(select 1 from pg_publication p join pg_publication_rel pr on pr.prpubid=p.oid join pg_class c on c.oid=pr.prrelid join pg_namespace n on n.oid=c.relnamespace where p.pubname='supabase_realtime' and n.nspname='public' and c.relname='drabornpark_support_requests') then alter publication supabase_realtime add table public.drabornpark_support_requests; end if;
end $block$;
