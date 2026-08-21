do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='drabornpark_reports'
  ) then
    alter publication supabase_realtime add table public.drabornpark_reports;
  end if;
end $$;
