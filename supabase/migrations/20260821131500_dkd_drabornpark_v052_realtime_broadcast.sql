create or replace function public.dkd_drabornpark_broadcast_message_v052()
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

  if dkd_session.id is null then
    return new;
  end if;

  dkd_payload := jsonb_build_object(
    'id', new.id,
    'session_id', new.session_id,
    'report_id', dkd_session.report_id,
    'sender_role', new.sender_role,
    'body_safe', new.body_safe,
    'created_at', new.created_at
  );

  perform realtime.send(
    dkd_payload,
    'message',
    'drabornpark-session:' || dkd_session.public_token::text,
    false
  );

  perform realtime.send(
    dkd_payload,
    'message',
    'drabornpark-owner:' || dkd_session.owner_user_id::text,
    true
  );

  return new;
end;
$$;

revoke all on function public.dkd_drabornpark_broadcast_message_v052() from public, anon, authenticated;

drop trigger if exists dkd_drabornpark_messages_realtime_v052 on public.drabornpark_messages;
create trigger dkd_drabornpark_messages_realtime_v052
after insert on public.drabornpark_messages
for each row execute function public.dkd_drabornpark_broadcast_message_v052();

create or replace function public.dkd_drabornpark_broadcast_report_v052()
returns trigger
language plpgsql
security definer
set search_path = public, realtime, pg_temp
as $$
declare
  dkd_payload jsonb;
begin
  if new.owner_user_id is null then
    return new;
  end if;

  dkd_payload := jsonb_build_object(
    'id', new.id,
    'owner_user_id', new.owner_user_id,
    'category', new.category,
    'priority', new.priority,
    'message_safe', new.message_safe,
    'status', new.status,
    'created_at', new.created_at
  );

  perform realtime.send(
    dkd_payload,
    'report',
    'drabornpark-owner:' || new.owner_user_id::text,
    true
  );

  return new;
end;
$$;

revoke all on function public.dkd_drabornpark_broadcast_report_v052() from public, anon, authenticated;

drop trigger if exists dkd_drabornpark_reports_realtime_v052 on public.drabornpark_reports;
create trigger dkd_drabornpark_reports_realtime_v052
after insert on public.drabornpark_reports
for each row execute function public.dkd_drabornpark_broadcast_report_v052();

drop policy if exists dkd_drabornpark_owner_broadcast_receive_v052 on realtime.messages;
create policy dkd_drabornpark_owner_broadcast_receive_v052
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and (select realtime.topic()) = 'drabornpark-owner:' || (select auth.uid())::text
);
