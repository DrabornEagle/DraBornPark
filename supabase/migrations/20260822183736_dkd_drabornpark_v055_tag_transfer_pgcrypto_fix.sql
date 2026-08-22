create or replace function public.dkd_drabornpark_start_tag_transfer_v055(dkd_tag_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dkd_uid uuid := auth.uid();
  dkd_token text := upper(encode(extensions.gen_random_bytes(6), 'hex'));
  dkd_tag public.drabornpark_tags%rowtype;
begin
  if dkd_uid is null then raise exception 'authentication_required'; end if;
  select * into dkd_tag from public.drabornpark_tags where id=dkd_tag_id and owner_user_id=dkd_uid for update;
  if dkd_tag.id is null then raise exception 'tag_not_found'; end if;
  update public.drabornpark_tags set status='TRANSFER_PENDING',transfer_token_hash=encode(extensions.digest(dkd_token,'sha256'),'hex'),transfer_started_at=now(),transfer_expires_at=now()+interval '24 hours',updated_at=now() where id=dkd_tag_id;
  insert into public.drabornpark_factory_events(tag_id,actor_user_id,event_type,metadata) values(dkd_tag_id,dkd_uid,'TRANSFER_STARTED',jsonb_build_object('expiresAt',now()+interval '24 hours','version','0.5.5'));
  return jsonb_build_object('tagCode',dkd_tag.tag_code,'transferCode',dkd_token,'expiresAt',now()+interval '24 hours');
end;
$$;
revoke all on function public.dkd_drabornpark_start_tag_transfer_v055(uuid) from public;
grant execute on function public.dkd_drabornpark_start_tag_transfer_v055(uuid) to authenticated;

create or replace function public.dkd_drabornpark_claim_tag_transfer_v055(dkd_tag_code text,dkd_transfer_code text,dkd_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare dkd_uid uuid:=auth.uid();dkd_tag public.drabornpark_tags%rowtype;dkd_old_owner uuid;
begin
  if dkd_uid is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.drabornpark_vehicles where id=dkd_vehicle_id and owner_user_id=dkd_uid) then raise exception 'vehicle_not_found'; end if;
  select * into dkd_tag from public.drabornpark_tags where tag_code=upper(trim(dkd_tag_code)) for update;
  if dkd_tag.id is null then raise exception 'tag_not_found'; end if;
  if dkd_tag.status<>'TRANSFER_PENDING' or dkd_tag.transfer_expires_at is null or dkd_tag.transfer_expires_at<=now() then raise exception 'transfer_expired'; end if;
  if dkd_tag.transfer_token_hash is distinct from encode(extensions.digest(upper(trim(dkd_transfer_code)),'sha256'),'hex') then raise exception 'invalid_transfer_code'; end if;
  dkd_old_owner:=dkd_tag.owner_user_id;
  update public.drabornpark_tags set owner_user_id=dkd_uid,vehicle_id=dkd_vehicle_id,status='ACTIVATED',activated_at=coalesce(activated_at,now()),transfer_token_hash=null,transfer_started_at=null,transfer_expires_at=null,updated_at=now() where id=dkd_tag.id;
  insert into public.drabornpark_timeline_events(owner_user_id,vehicle_id,event_type,title,description,metadata) values(dkd_uid,dkd_vehicle_id,'TAG_TRANSFERRED_IN','DraBornPark etiketi devralındı',dkd_tag.tag_code,jsonb_build_object('tagId',dkd_tag.id,'version','0.5.5'));
  if dkd_old_owner is not null then insert into public.drabornpark_timeline_events(owner_user_id,vehicle_id,event_type,title,description,metadata) values(dkd_old_owner,dkd_tag.vehicle_id,'TAG_TRANSFERRED_OUT','DraBornPark etiketi devredildi',dkd_tag.tag_code,jsonb_build_object('tagId',dkd_tag.id,'version','0.5.5')); end if;
  return jsonb_build_object('tagId',dkd_tag.id,'tagCode',dkd_tag.tag_code,'status','ACTIVATED');
end;
$$;
revoke all on function public.dkd_drabornpark_claim_tag_transfer_v055(text,text,uuid) from public;
grant execute on function public.dkd_drabornpark_claim_tag_transfer_v055(text,text,uuid) to authenticated;

create or replace function public.drabornpark_start_tag_transfer(drabornpark_tag_id uuid) returns jsonb language sql security invoker set search_path=public,pg_temp as $$select public.dkd_drabornpark_start_tag_transfer_v055(drabornpark_tag_id);$$;
revoke all on function public.drabornpark_start_tag_transfer(uuid) from public;
grant execute on function public.drabornpark_start_tag_transfer(uuid) to authenticated;
create or replace function public.drabornpark_claim_tag_transfer(drabornpark_tag_code text,drabornpark_transfer_code text,drabornpark_vehicle_id uuid) returns jsonb language sql security invoker set search_path=public,pg_temp as $$select public.dkd_drabornpark_claim_tag_transfer_v055(drabornpark_tag_code,drabornpark_transfer_code,drabornpark_vehicle_id);$$;
revoke all on function public.drabornpark_claim_tag_transfer(text,text,uuid) from public;
grant execute on function public.drabornpark_claim_tag_transfer(text,text,uuid) to authenticated;
