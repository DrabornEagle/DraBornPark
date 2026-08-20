create or replace function public.drabornpark_hit_rate_limit(
  drabornpark_bucket_key text,
  drabornpark_limit integer default 6,
  drabornpark_window_seconds integer default 600,
  drabornpark_block_seconds integer default 1800
)
returns table(blocked boolean, retry_after integer, request_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  drabornpark_now timestamptz := clock_timestamp();
  drabornpark_row public.drabornpark_abuse_limits%rowtype;
begin
  if drabornpark_bucket_key is null or length(trim(drabornpark_bucket_key)) = 0 then
    raise exception 'bucket_key_required';
  end if;

  insert into public.drabornpark_abuse_limits as drabornpark_limits (
    bucket_key, window_started_at, request_count, blocked_until, updated_at
  ) values (
    drabornpark_bucket_key, drabornpark_now, 1, null, drabornpark_now
  )
  on conflict (bucket_key) do update
  set
    window_started_at = case
      when drabornpark_limits.blocked_until is not null and drabornpark_limits.blocked_until > drabornpark_now
        then drabornpark_limits.window_started_at
      when drabornpark_limits.window_started_at <= drabornpark_now - make_interval(secs => drabornpark_window_seconds)
        then drabornpark_now
      else drabornpark_limits.window_started_at
    end,
    request_count = case
      when drabornpark_limits.blocked_until is not null and drabornpark_limits.blocked_until > drabornpark_now
        then drabornpark_limits.request_count
      when drabornpark_limits.window_started_at <= drabornpark_now - make_interval(secs => drabornpark_window_seconds)
        then 1
      else drabornpark_limits.request_count + 1
    end,
    blocked_until = case
      when drabornpark_limits.blocked_until is not null and drabornpark_limits.blocked_until > drabornpark_now
        then drabornpark_limits.blocked_until
      when drabornpark_limits.window_started_at <= drabornpark_now - make_interval(secs => drabornpark_window_seconds)
        then null
      when drabornpark_limits.request_count + 1 > drabornpark_limit
        then drabornpark_now + make_interval(secs => drabornpark_block_seconds)
      else null
    end,
    updated_at = drabornpark_now
  returning drabornpark_limits.* into drabornpark_row;

  blocked := drabornpark_row.blocked_until is not null and drabornpark_row.blocked_until > drabornpark_now;
  retry_after := case
    when blocked then greatest(1, ceil(extract(epoch from (drabornpark_row.blocked_until - drabornpark_now)))::integer)
    else 0
  end;
  request_count := drabornpark_row.request_count;
  return next;
end;
$$;

revoke all on function public.drabornpark_hit_rate_limit(text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.drabornpark_hit_rate_limit(text, integer, integer, integer) to service_role;
