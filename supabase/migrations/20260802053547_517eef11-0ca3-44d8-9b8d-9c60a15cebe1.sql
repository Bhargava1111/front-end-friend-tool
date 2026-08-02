REVOKE ALL ON FUNCTION public.guard_profile_self_verify() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_profile_self_verify() FROM anon;
REVOKE ALL ON FUNCTION public.guard_profile_self_verify() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.guard_profile_self_verify() TO service_role;