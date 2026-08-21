-- Do not let an activated physical tag be pushed backwards into manufacturing states.
create or replace function public.drabornpark_factory_set_status(drabornpark_tag_id uuid, drabornpark_status text, drabornpark_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  drabornpark_uid uuid := auth.uid();
  drabornpark_tag public.drabornpark_tags%rowtype;
  drabornpark_next text := upper(trim(drabornpark_status));
  drabornpark_allowed text[] := array['CREATED','NFC_PENDING','NFC_VERIFIED','QR_VERIFIED','PACKED','READY_FOR_SALE','SOLD','ACTIVATED','DISABLED','TRANSFER_PENDING'];
  drabornpark_flow text[] := array['CREATED','NFC_PENDING','NFC_VERIFIED','QR_VERIFIED','PACKED','READY_FOR_SALE','SOLD','ACTIVATED'];
  drabornpark_current_pos int;
  drabornpark_next_pos int;
begin
  if drabornpark_uid is null or not public.drabornpark_is_admin() then raise exception 'admin_required'; end if;
  if not (drabornpark_next = any(drabornpark_allowed)) then raise exception 'invalid_status'; end if;
  select * into drabornpark_tag from public.drabornpark_tags where id=drabornpark_tag_id for update;
  if drabornpark_tag.id is null then raise exception 'tag_not_found'; end if;
  if drabornpark_tag.activated_at is not null and drabornpark_next not in ('ACTIVATED','DISABLED') then raise exception 'activated_tag_status_locked'; end if;
  if drabornpark_tag.activated_at is null and drabornpark_next <> 'DISABLED' then
    drabornpark_current_pos := array_position(drabornpark_flow,drabornpark_tag.status);
    drabornpark_next_pos := array_position(drabornpark_flow,drabornpark_next);
    if drabornpark_current_pos is not null and drabornpark_next_pos is not null and drabornpark_next_pos < drabornpark_current_pos then raise exception 'status_cannot_move_backwards'; end if;
  end if;
  update public.drabornpark_tags set status=drabornpark_next,
    factory_notes=case when nullif(trim(drabornpark_note),'') is null then factory_notes else concat_ws(E'\n',factory_notes,trim(drabornpark_note)) end,
    last_verified_at=case when drabornpark_next in ('NFC_VERIFIED','QR_VERIFIED') then now() else last_verified_at end,
    sold_at=case when drabornpark_next='SOLD' then coalesce(sold_at,now()) else sold_at end,
    disabled_at=case when drabornpark_next='DISABLED' then now() when drabornpark_next='ACTIVATED' then null else disabled_at end,
    updated_at=now()
  where id=drabornpark_tag_id returning * into drabornpark_tag;
  insert into public.drabornpark_factory_events(tag_id,actor_user_id,event_type,metadata) values(drabornpark_tag_id,drabornpark_uid,'STATUS_CHANGED',jsonb_build_object('status',drabornpark_tag.status,'note',drabornpark_note));
  return to_jsonb(drabornpark_tag)-'activation_pin_hash'-'transfer_token_hash';
end;
$$;