alter table public.drabornpark_tags
  add column if not exists transfer_token_hash text,
  add column if not exists transfer_started_at timestamptz,
  add column if not exists transfer_expires_at timestamptz;

create or replace function public.drabornpark_bootstrap_user(drabornpark_display_name text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare drabornpark_uid uuid := auth.uid(); drabornpark_profile public.drabornpark_profiles%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  insert into public.drabornpark_profiles(user_id, display_name, subscription_status, plus_trial_until)
  values (drabornpark_uid, nullif(trim(drabornpark_display_name), ''), 'PLUS_TRIAL', now() + interval '14 days')
  on conflict (user_id) do update set display_name = coalesce(nullif(trim(excluded.display_name), ''), public.drabornpark_profiles.display_name), updated_at = now();
  select * into drabornpark_profile from public.drabornpark_profiles where user_id = drabornpark_uid;
  return to_jsonb(drabornpark_profile);
end; $$;

create or replace function public.drabornpark_save_park(
  drabornpark_vehicle_id uuid, drabornpark_place_name text default null,
  drabornpark_latitude double precision default null, drabornpark_longitude double precision default null,
  drabornpark_accuracy_meters double precision default null, drabornpark_floor_code text default null,
  drabornpark_zone_name text default null, drabornpark_zone_color text default null,
  drabornpark_row_code text default null, drabornpark_bay_code text default null,
  drabornpark_note text default null, drabornpark_photo_path text default null,
  drabornpark_reminder_minutes integer default null, drabornpark_source text default 'manual'
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare drabornpark_uid uuid := auth.uid(); drabornpark_park public.drabornpark_parks%rowtype; drabornpark_desc text;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  if not exists (select 1 from public.drabornpark_vehicles where id=drabornpark_vehicle_id and owner_user_id=drabornpark_uid and is_active) then raise exception 'vehicle_not_found'; end if;
  update public.drabornpark_parks set ended_at=coalesce(ended_at,now()), archived_at=coalesce(archived_at,now()), updated_at=now()
    where owner_user_id=drabornpark_uid and vehicle_id=drabornpark_vehicle_id and ended_at is null;
  insert into public.drabornpark_parks(owner_user_id,vehicle_id,place_name,latitude,longitude,accuracy_meters,floor_code,zone_name,zone_color,row_code,bay_code,note,photo_path,source,reminder_at)
  values(drabornpark_uid,drabornpark_vehicle_id,nullif(trim(drabornpark_place_name),''),drabornpark_latitude,drabornpark_longitude,drabornpark_accuracy_meters,nullif(trim(drabornpark_floor_code),''),nullif(trim(drabornpark_zone_name),''),nullif(trim(drabornpark_zone_color),''),nullif(trim(drabornpark_row_code),''),nullif(trim(drabornpark_bay_code),''),nullif(trim(drabornpark_note),''),nullif(trim(drabornpark_photo_path),''),coalesce(nullif(trim(drabornpark_source),''),'manual'),case when drabornpark_reminder_minutes is not null and drabornpark_reminder_minutes>0 then now()+make_interval(mins=>drabornpark_reminder_minutes) else null end)
  returning * into drabornpark_park;
  drabornpark_desc := concat_ws(' • ',drabornpark_park.place_name,drabornpark_park.floor_code,drabornpark_park.zone_color,concat_ws('',drabornpark_park.row_code,drabornpark_park.bay_code));
  insert into public.drabornpark_timeline_events(owner_user_id,vehicle_id,event_type,title,description,metadata)
  values(drabornpark_uid,drabornpark_vehicle_id,'PARKED','Park edildi',nullif(drabornpark_desc,''),jsonb_build_object('parkId',drabornpark_park.id));
  return to_jsonb(drabornpark_park);
end; $$;

create or replace function public.drabornpark_end_park(drabornpark_vehicle_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare drabornpark_uid uuid:=auth.uid(); drabornpark_count integer;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  update public.drabornpark_parks set ended_at=now(),archived_at=now(),updated_at=now() where owner_user_id=drabornpark_uid and vehicle_id=drabornpark_vehicle_id and ended_at is null;
  get diagnostics drabornpark_count=row_count;
  if drabornpark_count>0 then insert into public.drabornpark_timeline_events(owner_user_id,vehicle_id,event_type,title,description) values(drabornpark_uid,drabornpark_vehicle_id,'PARK_ENDED','Park kaydı bitirildi','Araç tekrar kullanılmaya başlandı.'); end if;
  return drabornpark_count>0;
end; $$;

create or replace function public.drabornpark_owner_reply(drabornpark_report_id uuid, drabornpark_message text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare drabornpark_uid uuid:=auth.uid(); drabornpark_session public.drabornpark_contact_sessions%rowtype; drabornpark_safe text; drabornpark_message_row public.drabornpark_messages%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  drabornpark_safe:=left(trim(coalesce(drabornpark_message,'')),700); if drabornpark_safe='' then raise exception 'message_required'; end if;
  drabornpark_safe:=regexp_replace(drabornpark_safe,'(\+?90[[:space:]]*)?(0[[:space:]]*)?5[0-9]{2}[[:space:].-]*[0-9]{3}[[:space:].-]*[0-9]{2}[[:space:].-]*[0-9]{2}','[telefon numarası gizlendi]','gi');
  drabornpark_safe:=regexp_replace(drabornpark_safe,'[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}','[e-posta gizlendi]','gi');
  select * into drabornpark_session from public.drabornpark_contact_sessions where report_id=drabornpark_report_id and owner_user_id=drabornpark_uid order by created_at desc limit 1 for update;
  if drabornpark_session.id is null then raise exception 'session_not_found'; end if;
  if drabornpark_session.status<>'open' or drabornpark_session.expires_at<=now() then raise exception 'session_closed'; end if;
  insert into public.drabornpark_messages(session_id,sender_role,sender_user_id,body_original,body_safe) values(drabornpark_session.id,'owner',drabornpark_uid,left(trim(drabornpark_message),700),drabornpark_safe) returning * into drabornpark_message_row;
  update public.drabornpark_contact_sessions set last_activity_at=now(),updated_at=now() where id=drabornpark_session.id;
  update public.drabornpark_reports set status='responded',seen_at=coalesce(seen_at,now()),updated_at=now() where id=drabornpark_report_id and owner_user_id=drabornpark_uid;
  return jsonb_build_object('id',drabornpark_message_row.id,'message',drabornpark_safe,'createdAt',drabornpark_message_row.created_at);
end; $$;

create or replace function public.drabornpark_start_tag_transfer(drabornpark_tag_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare drabornpark_uid uuid:=auth.uid(); drabornpark_token text:=upper(encode(gen_random_bytes(6),'hex')); drabornpark_tag public.drabornpark_tags%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  select * into drabornpark_tag from public.drabornpark_tags where id=drabornpark_tag_id and owner_user_id=drabornpark_uid for update;
  if drabornpark_tag.id is null then raise exception 'tag_not_found'; end if;
  update public.drabornpark_tags set status='TRANSFER_PENDING',transfer_token_hash=encode(digest(drabornpark_token,'sha256'),'hex'),transfer_started_at=now(),transfer_expires_at=now()+interval '24 hours',updated_at=now() where id=drabornpark_tag_id;
  insert into public.drabornpark_factory_events(tag_id,actor_user_id,event_type,metadata) values(drabornpark_tag_id,drabornpark_uid,'TRANSFER_STARTED',jsonb_build_object('expiresAt',now()+interval '24 hours'));
  return jsonb_build_object('tagCode',drabornpark_tag.tag_code,'transferCode',drabornpark_token,'expiresAt',now()+interval '24 hours');
end; $$;

create or replace function public.drabornpark_claim_tag_transfer(drabornpark_tag_code text, drabornpark_transfer_code text, drabornpark_vehicle_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare drabornpark_uid uuid:=auth.uid(); drabornpark_tag public.drabornpark_tags%rowtype; drabornpark_old_owner uuid;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.drabornpark_vehicles where id=drabornpark_vehicle_id and owner_user_id=drabornpark_uid) then raise exception 'vehicle_not_found'; end if;
  select * into drabornpark_tag from public.drabornpark_tags where tag_code=upper(trim(drabornpark_tag_code)) for update;
  if drabornpark_tag.id is null then raise exception 'tag_not_found'; end if;
  if drabornpark_tag.status<>'TRANSFER_PENDING' or drabornpark_tag.transfer_expires_at is null or drabornpark_tag.transfer_expires_at<=now() then raise exception 'transfer_expired'; end if;
  if drabornpark_tag.transfer_token_hash is distinct from encode(digest(upper(trim(drabornpark_transfer_code)),'sha256'),'hex') then raise exception 'invalid_transfer_code'; end if;
  drabornpark_old_owner:=drabornpark_tag.owner_user_id;
  update public.drabornpark_tags set owner_user_id=drabornpark_uid,vehicle_id=drabornpark_vehicle_id,status='ACTIVATED',activated_at=coalesce(activated_at,now()),transfer_token_hash=null,transfer_started_at=null,transfer_expires_at=null,updated_at=now() where id=drabornpark_tag.id;
  insert into public.drabornpark_timeline_events(owner_user_id,vehicle_id,event_type,title,description,metadata) values(drabornpark_uid,drabornpark_vehicle_id,'TAG_TRANSFERRED_IN','DraBornPark etiketi devralındı',drabornpark_tag.tag_code,jsonb_build_object('tagId',drabornpark_tag.id));
  if drabornpark_old_owner is not null then insert into public.drabornpark_timeline_events(owner_user_id,vehicle_id,event_type,title,description,metadata) values(drabornpark_old_owner,drabornpark_tag.vehicle_id,'TAG_TRANSFERRED_OUT','DraBornPark etiketi devredildi',drabornpark_tag.tag_code,jsonb_build_object('tagId',drabornpark_tag.id)); end if;
  return jsonb_build_object('tagId',drabornpark_tag.id,'tagCode',drabornpark_tag.tag_code,'status','ACTIVATED');
end; $$;

create or replace function public.drabornpark_reset_tag(drabornpark_tag_id uuid, drabornpark_vehicle_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare drabornpark_uid uuid:=auth.uid(); drabornpark_tag public.drabornpark_tags%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  select * into drabornpark_tag from public.drabornpark_tags where id=drabornpark_tag_id and owner_user_id=drabornpark_uid for update;
  if drabornpark_tag.id is null then raise exception 'tag_not_found'; end if;
  if drabornpark_vehicle_id is not null and not exists(select 1 from public.drabornpark_vehicles where id=drabornpark_vehicle_id and owner_user_id=drabornpark_uid) then raise exception 'vehicle_not_found'; end if;
  update public.drabornpark_tags set vehicle_id=drabornpark_vehicle_id,status='ACTIVATED',disabled_at=null,transfer_token_hash=null,transfer_started_at=null,transfer_expires_at=null,updated_at=now() where id=drabornpark_tag_id;
  return jsonb_build_object('tagId',drabornpark_tag_id,'vehicleId',drabornpark_vehicle_id,'status','ACTIVATED');
end; $$;

create or replace function public.drabornpark_disable_tag(drabornpark_tag_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare drabornpark_uid uuid:=auth.uid(); drabornpark_count integer;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  update public.drabornpark_tags set status='DISABLED',disabled_at=now(),updated_at=now() where id=drabornpark_tag_id and (owner_user_id=drabornpark_uid or public.drabornpark_is_admin());
  get diagnostics drabornpark_count=row_count; return drabornpark_count>0;
end; $$;

create or replace function public.drabornpark_factory_set_status(drabornpark_tag_id uuid, drabornpark_status text, drabornpark_note text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare drabornpark_uid uuid:=auth.uid(); drabornpark_tag public.drabornpark_tags%rowtype; drabornpark_allowed text[]:=array['CREATED','NFC_PENDING','NFC_VERIFIED','QR_VERIFIED','PACKED','READY_FOR_SALE','SOLD','ACTIVATED','DISABLED','TRANSFER_PENDING'];
begin
  if drabornpark_uid is null or not public.drabornpark_is_admin() then raise exception 'admin_required'; end if;
  if not (upper(trim(drabornpark_status))=any(drabornpark_allowed)) then raise exception 'invalid_status'; end if;
  update public.drabornpark_tags set status=upper(trim(drabornpark_status)),factory_notes=case when nullif(trim(drabornpark_note),'') is null then factory_notes else concat_ws(E'\n',factory_notes,trim(drabornpark_note)) end,last_verified_at=case when upper(trim(drabornpark_status)) in('NFC_VERIFIED','QR_VERIFIED') then now() else last_verified_at end,sold_at=case when upper(trim(drabornpark_status))='SOLD' then coalesce(sold_at,now()) else sold_at end,disabled_at=case when upper(trim(drabornpark_status))='DISABLED' then now() else disabled_at end,updated_at=now() where id=drabornpark_tag_id returning * into drabornpark_tag;
  if drabornpark_tag.id is null then raise exception 'tag_not_found'; end if;
  insert into public.drabornpark_factory_events(tag_id,actor_user_id,event_type,metadata) values(drabornpark_tag_id,drabornpark_uid,'STATUS_CHANGED',jsonb_build_object('status',drabornpark_tag.status,'note',drabornpark_note));
  return to_jsonb(drabornpark_tag)-'activation_pin_hash'-'transfer_token_hash';
end; $$;

revoke all on function public.drabornpark_bootstrap_user(text) from public,anon;
revoke all on function public.drabornpark_save_park(uuid,text,double precision,double precision,double precision,text,text,text,text,text,text,text,integer,text) from public,anon;
revoke all on function public.drabornpark_end_park(uuid) from public,anon;
revoke all on function public.drabornpark_owner_reply(uuid,text) from public,anon;
revoke all on function public.drabornpark_start_tag_transfer(uuid) from public,anon;
revoke all on function public.drabornpark_claim_tag_transfer(text,text,uuid) from public,anon;
revoke all on function public.drabornpark_reset_tag(uuid,uuid) from public,anon;
revoke all on function public.drabornpark_disable_tag(uuid) from public,anon;
revoke all on function public.drabornpark_factory_set_status(uuid,text,text) from public,anon;

grant execute on function public.drabornpark_bootstrap_user(text) to authenticated;
grant execute on function public.drabornpark_save_park(uuid,text,double precision,double precision,double precision,text,text,text,text,text,text,text,integer,text) to authenticated;
grant execute on function public.drabornpark_end_park(uuid) to authenticated;
grant execute on function public.drabornpark_owner_reply(uuid,text) to authenticated;
grant execute on function public.drabornpark_start_tag_transfer(uuid) to authenticated;
grant execute on function public.drabornpark_claim_tag_transfer(text,text,uuid) to authenticated;
grant execute on function public.drabornpark_reset_tag(uuid,uuid) to authenticated;
grant execute on function public.drabornpark_disable_tag(uuid) to authenticated;
grant execute on function public.drabornpark_factory_set_status(uuid,text,text) to authenticated;
