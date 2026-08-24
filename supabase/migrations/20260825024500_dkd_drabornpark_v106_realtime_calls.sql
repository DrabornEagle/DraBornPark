do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'drabornpark_call_requests'
  ) then
    alter publication supabase_realtime add table public.drabornpark_call_requests;
  end if;
end
$$;
