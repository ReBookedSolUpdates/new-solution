-- Migration: Grant EXECUTE permissions on validation and pg_net helper functions
-- Created: 2026-06-28

-- Grant EXECUTE on validate_payment_amount to prevent check constraint errors on books table
GRANT EXECUTE ON FUNCTION public.validate_payment_amount(numeric) TO public, authenticated, anon;

-- Grant EXECUTE on net.http_post to prevent webhook/trigger permission errors
GRANT EXECUTE ON FUNCTION net.http_post(text, jsonb, jsonb, jsonb, integer) TO public, authenticated, anon;

-- Also grant usage on net schema just in case
GRANT USAGE ON SCHEMA net TO public, authenticated, anon;
