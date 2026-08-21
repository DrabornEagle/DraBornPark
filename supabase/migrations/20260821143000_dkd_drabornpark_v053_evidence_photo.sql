alter table public.drabornpark_messages
  add column if not exists attachment_kind text,
  add column if not exists attachment_path text,
  add column if not exists attachment_captured_at timestamptz,
  add column if not exists attachment_mime text;

alter table public.drabornpark_messages
  drop constraint if exists dkd_drabornpark_messages_attachment_kind_check;
alter table public.drabornpark_messages
  add constraint dkd_drabornpark_messages_attachment_kind_check
  check (attachment_kind is null or attachment_kind = 'evidence_photo');

alter table public.drabornpark_messages
  drop constraint if exists dkd_drabornpark_messages_attachment_mime_check;
alter table public.drabornpark_messages
  add constraint dkd_drabornpark_messages_attachment_mime_check
  check (attachment_mime is null or attachment_mime = 'image/jpeg');

create index if not exists dkd_drabornpark_messages_attachment_path_idx
  on public.drabornpark_messages (attachment_path)
  where attachment_path is not null;

create or replace function public.dkd_drabornpark_broadcast_message_v053()
returns trigger
language plpgsql
security definer
set search_path = public, realtime, pg_temp
as $$
declare
  dkd_session record;
  dkd_payload jsonb;
begin
  select id, report_id, owner_user_id, public_token
    into dkd_session
  from public.drabornpark_contact_sessions
  where id = new.session_id;

  if dkd_session.id is null then return new; end if;

  dkd_payload := jsonb_build_object(
    'id', new.id,
    'session_id', new.session_id,
    'report_id', dkd_session.report_id,
    'sender_role', new.sender_role,
    'body_safe', new.body_safe,
    'created_at', new.created_at,
    'attachment_kind', new.attachment_kind,
    'attachment_path', new.attachment_path,
    'attachment_captured_at', new.attachment_captured_at,
    'attachment_mime', new.attachment_mime
  );

  perform realtime.send(dkd_payload,'message','drabornpark-session:' || dkd_session.public_token::text,false);
  perform realtime.send(dkd_payload,'message','drabornpark-owner:' || dkd_session.owner_user_id::text,true);
  return new;
end;
$$;

revoke all on function public.dkd_drabornpark_broadcast_message_v053() from public, anon, authenticated;

drop trigger if exists dkd_drabornpark_messages_realtime_v052 on public.drabornpark_messages;
drop trigger if exists dkd_drabornpark_messages_realtime_v053 on public.drabornpark_messages;
create trigger dkd_drabornpark_messages_realtime_v053
after insert on public.drabornpark_messages
for each row execute function public.dkd_drabornpark_broadcast_message_v053();
