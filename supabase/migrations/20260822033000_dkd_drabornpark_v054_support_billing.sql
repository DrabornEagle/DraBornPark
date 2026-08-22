create unique index if not exists dkd_drabornpark_subscriptions_user_provider_product_uq
on public.drabornpark_subscriptions(user_id, provider, product_id);

drop policy if exists drabornpark_support_admin_select on public.drabornpark_support_requests;
create policy drabornpark_support_admin_select
on public.drabornpark_support_requests
for select
to authenticated
using (public.drabornpark_is_admin());

create or replace function public.dkd_drabornpark_admin_support_v054(drabornpark_request_id uuid default null)
returns table(id uuid,owner_user_id uuid,owner_username text,owner_display_name text,subject text,body text,status text,created_at timestamptz,updated_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
  if not public.drabornpark_is_admin() then raise exception 'not_authorized'; end if;
  return query
  select dkd_request.id,dkd_request.owner_user_id,dkd_profile.username,dkd_profile.display_name,dkd_request.subject,dkd_request.body,dkd_request.status,dkd_request.created_at,dkd_request.updated_at
  from public.drabornpark_support_requests dkd_request
  left join public.drabornpark_profiles dkd_profile on dkd_profile.user_id=dkd_request.owner_user_id
  where drabornpark_request_id is null or dkd_request.id=drabornpark_request_id
  order by dkd_request.created_at desc;
end;$$;
revoke all on function public.dkd_drabornpark_admin_support_v054(uuid) from public;
grant execute on function public.dkd_drabornpark_admin_support_v054(uuid) to authenticated;

create or replace function public.dkd_drabornpark_admin_support_mark_v054(drabornpark_request_id uuid,drabornpark_status text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.drabornpark_is_admin() then raise exception 'not_authorized'; end if;
  if drabornpark_status not in ('open','in_review','resolved','closed') then raise exception 'invalid_status'; end if;
  update public.drabornpark_support_requests set status=drabornpark_status,updated_at=now() where id=drabornpark_request_id;
  return found;
end;$$;
revoke all on function public.dkd_drabornpark_admin_support_mark_v054(uuid,text) from public;
grant execute on function public.dkd_drabornpark_admin_support_mark_v054(uuid,text) to authenticated;
