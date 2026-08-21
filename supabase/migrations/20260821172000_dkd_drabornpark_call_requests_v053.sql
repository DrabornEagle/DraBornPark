create table if not exists public.drabornpark_call_requests (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.drabornpark_reports(id) on delete cascade,
  session_id uuid not null unique references public.drabornpark_contact_sessions(id) on delete cascade,
  tag_id uuid not null references public.drabornpark_tags(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  evidence_path text not null,
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

create index if not exists dkd_drabornpark_call_requests_owner_created_idx on public.drabornpark_call_requests(owner_user_id, created_at desc);
create index if not exists dkd_drabornpark_call_requests_status_idx on public.drabornpark_call_requests(status, expires_at);

alter table public.drabornpark_call_requests enable row level security;

drop policy if exists dkd_drabornpark_call_requests_owner_select on public.drabornpark_call_requests;
create policy dkd_drabornpark_call_requests_owner_select
on public.drabornpark_call_requests
for select
to authenticated
using (auth.uid() = owner_user_id);

create or replace function public.dkd_drabornpark_respond_call_request_v053(
  dkd_report_id uuid,
  dkd_decision text
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dkd_request public.drabornpark_call_requests%rowtype;
  dkd_phone text;
  dkd_message text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into dkd_request
  from public.drabornpark_call_requests
  where report_id = dkd_report_id
  for update;

  if not found or dkd_request.owner_user_id <> auth.uid() then
    raise exception 'call_request_not_found';
  end if;

  if dkd_request.status <> 'pending' then
    return jsonb_build_object('ok', true, 'status', dkd_request.status, 'alreadyDecided', true);
  end if;

  if dkd_request.expires_at <= now() then
    update public.drabornpark_call_requests set status='expired', decided_at=now() where id=dkd_request.id;
    update public.drabornpark_reports set status='closed', closed_at=coalesce(closed_at, now()), updated_at=now() where id=dkd_report_id;
    return jsonb_build_object('ok', true, 'status', 'expired');
  end if;

  if dkd_decision = 'approved' then
    select nullif(trim(phone_e164),'') into dkd_phone from public.drabornpark_profiles where user_id = auth.uid();
    if dkd_phone is null then raise exception 'phone_missing'; end if;
    update public.drabornpark_call_requests set status='approved', decided_at=now() where id=dkd_request.id;
    update public.drabornpark_reports set status='replied', seen_at=coalesce(seen_at, now()), updated_at=now() where id=dkd_report_id;
    dkd_message := 'Arama talebiniz onaylandı. Araç sahibinin telefon numarası güvenli sayfada geçici olarak paylaşıldı.';
  elsif dkd_decision = 'rejected' then
    update public.drabornpark_call_requests set status='rejected', decided_at=now() where id=dkd_request.id;
    update public.drabornpark_reports set status='closed', seen_at=coalesce(seen_at, now()), closed_at=coalesce(closed_at, now()), updated_at=now() where id=dkd_report_id;
    dkd_message := 'Araç sahibi arama talebini reddetti. Telefon numarası paylaşılmadı.';
  else
    raise exception 'invalid_decision';
  end if;

  insert into public.drabornpark_messages(session_id, sender_role, sender_user_id, body_original, body_safe)
  values(dkd_request.session_id, 'owner', auth.uid(), dkd_message, dkd_message);

  update public.drabornpark_contact_sessions set last_activity_at=now(), updated_at=now() where id=dkd_request.session_id;
  return jsonb_build_object('ok', true, 'status', dkd_decision, 'expiresAt', dkd_request.expires_at);
end;
$$;

revoke all on function public.dkd_drabornpark_respond_call_request_v053(uuid,text) from public;
grant execute on function public.dkd_drabornpark_respond_call_request_v053(uuid,text) to authenticated;
grant select on public.drabornpark_call_requests to authenticated;
