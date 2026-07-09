-- Migration: Grant permissions on order_intents and materialization functions
-- Created: 2026-06-28

-- Grant access on order_intents table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_intents TO public, authenticated, anon;

-- Grant EXECUTE on materialize_order_from_intent RPC
GRANT EXECUTE ON FUNCTION public.materialize_order_from_intent(text, text) TO public, authenticated, anon;
