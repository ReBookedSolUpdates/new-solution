-- Migration: Grant EXECUTE permissions on RLS policy helper functions
-- Created: 2026-06-28

-- Grant EXECUTE on has_role helper functions to prevent RLS permission errors for users
GRANT EXECUTE ON FUNCTION public.has_role(bigint, text) TO public, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO public, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO public, authenticated, anon;

-- Grant EXECUTE on is_current_user_admin helper function
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO public, authenticated, anon;
