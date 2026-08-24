-- DraBornPark v1.0.4 production RPC ACL hardening.
-- Activation and factory-editing RPCs are authenticated/service only.
-- The legacy v1.0.3 factory editor is retained for rollback compatibility but is not anonymous.

revoke all on function public.dkd_drabornpark_activate_public_slug_v104(text,text,uuid) from public, anon;
grant execute on function public.dkd_drabornpark_activate_public_slug_v104(text,text,uuid) to authenticated, service_role;

revoke all on function public.dkd_drabornpark_factory_update_tag_v104(uuid,text,text,text,text,text,text) from public, anon;
grant execute on function public.dkd_drabornpark_factory_update_tag_v104(uuid,text,text,text,text,text,text) to authenticated, service_role;

revoke all on function public.dkd_drabornpark_factory_update_tag_v103(uuid,text,text,text,text,text) from public, anon;
grant execute on function public.dkd_drabornpark_factory_update_tag_v103(uuid,text,text,text,text,text) to authenticated, service_role;
