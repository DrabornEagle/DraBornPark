create table if not exists public.drabornpark_account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','processing','completed','rejected')),
  requested_ip_hash text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.drabornpark_account_deletion_requests enable row level security;
revoke all on public.drabornpark_account_deletion_requests from anon, authenticated;
create index if not exists drabornpark_account_deletion_requests_status_created_idx on public.drabornpark_account_deletion_requests(status, created_at desc);

create table if not exists public.drabornpark_public_support_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open','answered','closed','spam')),
  requested_ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.drabornpark_public_support_requests enable row level security;
revoke all on public.drabornpark_public_support_requests from anon, authenticated;
create index if not exists drabornpark_public_support_requests_status_created_idx on public.drabornpark_public_support_requests(status, created_at desc);

create or replace function public.drabornpark_factory_create_tag(drabornpark_serial_number text default null::text)
returns table(tag_code text, serial_number text, nfc_url text, activation_pin text)
language plpgsql security definer set search_path to 'public','extensions'
as $function$
declare
  drabornpark_code text;
  drabornpark_serial text;
  drabornpark_pin text;
  drabornpark_tag_id uuid;
  drabornpark_public_url text;
begin
  if not public.drabornpark_is_admin() then raise exception 'DraBornPark admin role required'; end if;
  loop
    drabornpark_code := 'DP-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
    exit when not exists (select 1 from public.drabornpark_tags dpt where dpt.tag_code = drabornpark_code);
  end loop;
  drabornpark_serial := coalesce(nullif(trim(drabornpark_serial_number), ''), 'DPS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8)));
  drabornpark_pin := lpad((floor(random() * 100000000))::bigint::text, 8, '0');
  drabornpark_public_url := 'https://draborneagle.com/DraBornPark/?tag=' || replace(drabornpark_code, 'DP-', '');
  insert into public.drabornpark_tags(tag_code, serial_number, nfc_url, activation_pin_hash, status)
  values (drabornpark_code, drabornpark_serial, drabornpark_public_url, extensions.crypt(drabornpark_pin, extensions.gen_salt('bf')), 'NFC_PENDING') returning id into drabornpark_tag_id;
  insert into public.drabornpark_factory_events(tag_id, actor_user_id, event_type, metadata)
  values (drabornpark_tag_id, auth.uid(), 'TAG_CREATED', jsonb_build_object('serialNumber', drabornpark_serial, 'publicUrl', drabornpark_public_url));
  return query select drabornpark_code, drabornpark_serial, drabornpark_public_url, drabornpark_pin;
end;
$function$;

update public.drabornpark_tags
set nfc_url = 'https://draborneagle.com/DraBornPark/?tag=' || replace(tag_code, 'DP-', ''), updated_at = now()
where nfc_url is distinct from ('https://draborneagle.com/DraBornPark/?tag=' || replace(tag_code, 'DP-', ''));
