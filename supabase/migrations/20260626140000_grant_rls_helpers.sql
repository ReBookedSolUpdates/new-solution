-- Migration: Grant EXECUTE on RLS policy helper functions to public
-- These helper functions are used inside RLS policies and must be executable by all roles evaluating those policies.

GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, public;
