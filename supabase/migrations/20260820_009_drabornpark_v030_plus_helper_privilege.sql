-- Keep the internal Plus entitlement helper unavailable to anonymous/public API callers.
revoke execute on function public.drabornpark_has_plus() from public, anon;
grant execute on function public.drabornpark_has_plus() to authenticated;
