-- DraBornPark v0.6.0 — authenticated/admin RPC privilege hardening.
-- Anonymous/default EXECUTE removed from private user/admin functions.

revoke execute on function public.drabornpark_is_admin() from public, anon;
grant execute on function public.drabornpark_is_admin() to authenticated;

revoke execute on function public.drabornpark_admin_support_request_dkd(uuid) from public, anon;
grant execute on function public.drabornpark_admin_support_request_dkd(uuid) to authenticated;

revoke execute on function public.drabornpark_admin_support_inbox_dkd(integer) from public, anon;
grant execute on function public.drabornpark_admin_support_inbox_dkd(integer) to authenticated;

revoke execute on function public.drabornpark_mark_admin_notification_read_dkd(uuid) from public, anon;
grant execute on function public.drabornpark_mark_admin_notification_read_dkd(uuid) to authenticated;

revoke execute on function public.drabornpark_bootstrap_phone_from_metadata_dkd() from public, anon;
grant execute on function public.drabornpark_bootstrap_phone_from_metadata_dkd() to authenticated;

revoke execute on function public.drabornpark_reconcile_entitlement_dkd() from public, anon;
grant execute on function public.drabornpark_reconcile_entitlement_dkd() to authenticated;

revoke execute on function public.drabornpark_support_notify_admin_dkd() from public, anon, authenticated;

revoke execute on function public.drabornpark_activate_tag(text,text,uuid) from public, anon;
grant execute on function public.drabornpark_activate_tag(text,text,uuid) to authenticated;

revoke execute on function public.drabornpark_factory_create_tag(text) from public, anon;
grant execute on function public.drabornpark_factory_create_tag(text) to authenticated;

revoke execute on function public.drabornpark_factory_delete_tag(uuid) from public, anon;
grant execute on function public.drabornpark_factory_delete_tag(uuid) to authenticated;

revoke execute on function public.drabornpark_factory_update_tag(uuid,text,text,text) from public, anon;
grant execute on function public.drabornpark_factory_update_tag(uuid,text,text,text) to authenticated;

revoke execute on function public.drabornpark_factory_set_status(uuid,text,text) from public, anon;
grant execute on function public.drabornpark_factory_set_status(uuid,text,text) to authenticated;
