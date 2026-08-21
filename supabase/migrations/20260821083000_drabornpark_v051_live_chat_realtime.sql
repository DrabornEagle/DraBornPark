alter table public.drabornpark_messages replica identity full;

create index if not exists drabornpark_messages_session_created_idx
  on public.drabornpark_messages(session_id, created_at);

create index if not exists drabornpark_contact_sessions_report_idx
  on public.drabornpark_contact_sessions(report_id, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='drabornpark_messages'
  ) then
    alter publication supabase_realtime add table public.drabornpark_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='drabornpark_contact_sessions'
  ) then
    alter publication supabase_realtime add table public.drabornpark_contact_sessions;
  end if;
end $$;
