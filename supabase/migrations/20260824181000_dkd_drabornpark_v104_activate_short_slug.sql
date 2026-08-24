-- DraBornPark v1.0.4 short public slug activation.
create or replace function public.dkd_drabornpark_activate_public_slug_v104(dkd_public_slug text, dkd_pin text, dkd_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dkd_uid uuid := auth.uid();
  dkd_input text := lower(trim(coalesce(dkd_public_slug,'')));
  dkd_tag_code text;
  dkd_token uuid;
begin
  if dkd_uid is null then raise exception 'authentication_required'; end if;
  if dkd_input='' then raise exception 'tag_not_found'; end if;
  dkd_input:=regexp_replace(dkd_input,'^https://www\.draborneagle\.com/drabornpark/tag/','','i');
  dkd_input:=regexp_replace(dkd_input,'^https://www\.draborneagle\.com/drabornpark/t/','','i');
  begin dkd_token:=dkd_input::uuid; exception when others then dkd_token:=null; end;
  select t.tag_code into dkd_tag_code
  from public.drabornpark_tags t
  where lower(t.public_alias)=dkd_input
     or (dkd_token is not null and t.dkd_public_token=dkd_token)
     or lower(t.tag_code)=lower(dkd_input)
  order by case when lower(t.public_alias)=dkd_input then 0 when dkd_token is not null and t.dkd_public_token=dkd_token then 1 else 2 end
  limit 1;
  if dkd_tag_code is null then raise exception 'tag_not_found'; end if;
  return public.dkd_drabornpark_activate_tag_v054(dkd_tag_code,dkd_pin,dkd_vehicle_id);
end;
$$;
grant execute on function public.dkd_drabornpark_activate_public_slug_v104(text,text,uuid) to authenticated;
