-- DraBornPark-only query/index tuning. Existing DraBornGarage objects are intentionally untouched.

create index if not exists drabornpark_contact_sessions_report_idx on public.drabornpark_contact_sessions(report_id);
create index if not exists drabornpark_contact_sessions_tag_idx on public.drabornpark_contact_sessions(tag_id);
create index if not exists drabornpark_emergency_contacts_owner_idx on public.drabornpark_emergency_contacts(owner_user_id);
create index if not exists drabornpark_emergency_contacts_contact_idx on public.drabornpark_emergency_contacts(contact_user_id) where contact_user_id is not null;
create index if not exists drabornpark_factory_events_tag_idx on public.drabornpark_factory_events(tag_id);
create index if not exists drabornpark_factory_events_actor_idx on public.drabornpark_factory_events(actor_user_id) where actor_user_id is not null;
create index if not exists drabornpark_family_member_idx on public.drabornpark_family_members(member_user_id) where member_user_id is not null;
create index if not exists drabornpark_guest_drivers_guest_idx on public.drabornpark_guest_drivers(guest_user_id) where guest_user_id is not null;
create index if not exists drabornpark_guest_drivers_vehicle_idx on public.drabornpark_guest_drivers(vehicle_id);
create index if not exists drabornpark_messages_sender_idx on public.drabornpark_messages(sender_user_id) where sender_user_id is not null;
create index if not exists drabornpark_reports_vehicle_idx on public.drabornpark_reports(vehicle_id) where vehicle_id is not null;
create index if not exists drabornpark_routing_rules_owner_idx on public.drabornpark_routing_rules(owner_user_id);
create index if not exists drabornpark_routing_rules_vehicle_idx on public.drabornpark_routing_rules(vehicle_id) where vehicle_id is not null;
create index if not exists drabornpark_routing_rules_target_idx on public.drabornpark_routing_rules(target_user_id) where target_user_id is not null;
create index if not exists drabornpark_support_requests_owner_idx on public.drabornpark_support_requests(owner_user_id, created_at desc);
create index if not exists drabornpark_timeline_vehicle_idx on public.drabornpark_timeline_events(vehicle_id, occurred_at desc) where vehicle_id is not null;

drop policy if exists drabornpark_tags_select_own on public.drabornpark_tags;
drop policy if exists drabornpark_tags_admin_all on public.drabornpark_tags;
create policy drabornpark_tags_select_owner_or_admin on public.drabornpark_tags
for select to authenticated
using ((select auth.uid()) = owner_user_id or public.drabornpark_is_admin());
create policy drabornpark_tags_admin_insert on public.drabornpark_tags
for insert to authenticated
with check (public.drabornpark_is_admin());
create policy drabornpark_tags_admin_update on public.drabornpark_tags
for update to authenticated
using (public.drabornpark_is_admin())
with check (public.drabornpark_is_admin());
create policy drabornpark_tags_admin_delete on public.drabornpark_tags
for delete to authenticated
using (public.drabornpark_is_admin());

drop policy if exists drabornpark_family_owner_all on public.drabornpark_family_members;
drop policy if exists drabornpark_family_member_select on public.drabornpark_family_members;
create policy drabornpark_family_select_owner_or_member on public.drabornpark_family_members
for select to authenticated
using ((select auth.uid()) = owner_user_id or ((select auth.uid()) = member_user_id and status = 'active'));
create policy drabornpark_family_owner_insert on public.drabornpark_family_members
for insert to authenticated
with check ((select auth.uid()) = owner_user_id);
create policy drabornpark_family_owner_update on public.drabornpark_family_members
for update to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);
create policy drabornpark_family_owner_delete on public.drabornpark_family_members
for delete to authenticated
using ((select auth.uid()) = owner_user_id);
