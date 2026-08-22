alter table public.drabornpark_vehicles replica identity full;
alter table public.drabornpark_tags replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='drabornpark_vehicles') then
    execute 'alter publication supabase_realtime add table public.drabornpark_vehicles';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='drabornpark_tags') then
    execute 'alter publication supabase_realtime add table public.drabornpark_tags';
  end if;
end $$;
