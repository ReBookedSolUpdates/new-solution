-- Secure RLS Policies and Function Execution Privileges
-- Migration created on 2026-06-26

-- 1. Correct overly permissive INSERT/UPDATE/DELETE RLS policies on tracking and cache tables
DROP POLICY IF EXISTS "Enable insert for all users" ON public.checkout_events;
CREATE POLICY "Enable insert for all users" ON public.checkout_events FOR INSERT WITH CHECK (session_id IS NOT NULL);

DROP POLICY IF EXISTS "Enable insert for all users" ON public.listing_views;
CREATE POLICY "Enable insert for all users" ON public.listing_views FOR INSERT WITH CHECK (session_id IS NOT NULL);

DROP POLICY IF EXISTS "Enable insert for all users" ON public.search_queries;
CREATE POLICY "Enable insert for all users" ON public.search_queries FOR INSERT WITH CHECK (session_id IS NOT NULL);

-- Restrict static_map_cache: Remove public delete/update, secure insert to require valid map_image_url
DROP POLICY IF EXISTS "Allow public delete on static_map_cache" ON public.static_map_cache;
DROP POLICY IF EXISTS "Allow public update on static_map_cache" ON public.static_map_cache;
DROP POLICY IF EXISTS "Allow public insert on static_map_cache" ON public.static_map_cache;
CREATE POLICY "Allow public insert on static_map_cache" ON public.static_map_cache FOR INSERT WITH CHECK (map_image_url IS NOT NULL);

-- 2. Revoke execute privileges on all public schema functions by default and grant only to client-facing RPCs
DO $$
BEGIN
    -- Revoke execute on all functions in schema public from public/anon/authenticated
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM public, anon, authenticated;
    REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public, anon, authenticated CASCADE;

    -- Dynamically grant execute back to client-facing RPC functions if they exist
    
    -- 1. get_wallet_summary
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public' AND proname = 'get_wallet_summary') THEN
        GRANT EXECUTE ON FUNCTION public.get_wallet_summary(uuid) TO authenticated;
    END IF;

    -- 2. create_payout_request
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public' AND proname = 'create_payout_request') THEN
        GRANT EXECUTE ON FUNCTION public.create_payout_request(uuid, bigint) TO authenticated;
    END IF;

    -- 3. cancel_payout_request
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public' AND proname = 'cancel_payout_request') THEN
        GRANT EXECUTE ON FUNCTION public.cancel_payout_request(uuid, bigint) TO authenticated;
    END IF;

    -- 4. create_sale_commitment
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public' AND proname = 'create_sale_commitment') THEN
        GRANT EXECUTE ON FUNCTION public.create_sale_commitment(uuid, uuid, numeric, text) TO authenticated;
    END IF;

    -- 5. commit_to_sale
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public' AND proname = 'commit_to_sale') THEN
        GRANT EXECUTE ON FUNCTION public.commit_to_sale(uuid, uuid) TO authenticated;
    END IF;

    -- 6. decline_sale
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public' AND proname = 'decline_sale') THEN
        GRANT EXECUTE ON FUNCTION public.decline_sale(uuid, uuid) TO authenticated;
    END IF;

    -- 7. expire_old_commitments
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public' AND proname = 'expire_old_commitments') THEN
        GRANT EXECUTE ON FUNCTION public.expire_old_commitments() TO authenticated;
    END IF;

    -- 8. get_seller_wishlist_contacts
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public' AND proname = 'get_seller_wishlist_contacts') THEN
        GRANT EXECUTE ON FUNCTION public.get_seller_wishlist_contacts(uuid) TO authenticated;
    END IF;

    -- 9. confirm_order_pickup
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public' AND proname = 'confirm_order_pickup') THEN
        GRANT EXECUTE ON FUNCTION public.confirm_order_pickup(uuid, uuid) TO authenticated;
    END IF;

    -- 10. has_completed_order_from_seller
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public' AND proname = 'has_completed_order_from_seller') THEN
        GRANT EXECUTE ON FUNCTION public.has_completed_order_from_seller(uuid, uuid) TO authenticated;
    END IF;

    -- 11. get_seller_average_rating
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public' AND proname = 'get_seller_average_rating') THEN
        GRANT EXECUTE ON FUNCTION public.get_seller_average_rating(uuid) TO authenticated, anon;
    END IF;

    -- 12. validate_coupon
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public' AND proname = 'validate_coupon') THEN
        GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO authenticated, anon;
    END IF;
END;
$$;
