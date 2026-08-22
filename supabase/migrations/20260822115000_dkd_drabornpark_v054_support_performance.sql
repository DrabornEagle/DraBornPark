create index if not exists dkd_drabornpark_support_admin_seen_by_idx
  on public.drabornpark_support_requests(admin_seen_by)
  where admin_seen_by is not null;

drop policy if exists dkd_drabornpark_support_owner_select_v054 on public.drabornpark_support_requests;
drop policy if exists dkd_drabornpark_support_admin_select_v054 on public.drabornpark_support_requests;
drop policy if exists dkd_drabornpark_support_select_v054 on public.drabornpark_support_requests;

create policy dkd_drabornpark_support_select_v054
on public.drabornpark_support_requests
for select
to authenticated
using (((select auth.uid()) = owner_user_id) or public.drabornpark_is_admin());
