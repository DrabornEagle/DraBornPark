create or replace function public.drabornpark_owner_reply(drabornpark_report_id uuid, drabornpark_message text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  drabornpark_uid uuid := auth.uid();
  drabornpark_session public.drabornpark_contact_sessions%rowtype;
  drabornpark_safe text;
  drabornpark_message_row public.drabornpark_messages%rowtype;
begin
  if drabornpark_uid is null then raise exception 'authentication_required'; end if;
  drabornpark_safe := left(trim(coalesce(drabornpark_message, '')), 700);
  if drabornpark_safe = '' then raise exception 'message_required'; end if;
  drabornpark_safe := regexp_replace(drabornpark_safe, '(\\+?90[[:space:]]*)?(0[[:space:]]*)?5[0-9]{2}[[:space:].-]*[0-9]{3}[[:space:].-]*[0-9]{2}[[:space:].-]*[0-9]{2}', '[telefon numarası gizlendi]', 'gi');
  drabornpark_safe := regexp_replace(drabornpark_safe, '[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}', '[e-posta gizlendi]', 'gi');

  select * into drabornpark_session
  from public.drabornpark_contact_sessions
  where report_id = drabornpark_report_id and owner_user_id = drabornpark_uid
  order by created_at desc limit 1 for update;

  if drabornpark_session.id is null then raise exception 'session_not_found'; end if;
  if drabornpark_session.status <> 'open' or drabornpark_session.expires_at <= now() then raise exception 'session_closed'; end if;

  insert into public.drabornpark_messages(session_id, sender_role, sender_user_id, body_original, body_safe)
  values (drabornpark_session.id, 'owner', drabornpark_uid, left(trim(drabornpark_message), 700), drabornpark_safe)
  returning * into drabornpark_message_row;

  update public.drabornpark_contact_sessions set last_activity_at = now(), updated_at = now() where id = drabornpark_session.id;
  update public.drabornpark_reports set status = 'replied', seen_at = coalesce(seen_at, now()), updated_at = now() where id = drabornpark_report_id and owner_user_id = drabornpark_uid;

  return jsonb_build_object('id', drabornpark_message_row.id, 'message', drabornpark_safe, 'createdAt', drabornpark_message_row.created_at);
end;
$$;

update public.drabornpark_reports set category='blocked_exit', updated_at=now() where category='blocking_exit';
