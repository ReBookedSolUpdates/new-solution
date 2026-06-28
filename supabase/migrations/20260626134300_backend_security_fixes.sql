-- Supabase Backend Security and Performance Audit Fixes
-- Migration created on 2026-06-26

-- 1. Enable RLS on all tables in public schema
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banking_subaccounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_interest_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_feedback_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_abandonment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashout_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_affiliate_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paystack_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.static_map_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uniforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- 2. Prevent broad listing on public storage buckets (restrict SELECT to authenticated role)
DROP POLICY IF EXISTS "Anyone can view article images" ON storage.objects;
CREATE POLICY "Anyone can view article images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'article-images');

DROP POLICY IF EXISTS "Anyone can view book images" ON storage.objects;
CREATE POLICY "Anyone can view book images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'book-images');

DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;
CREATE POLICY "Anyone can view documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Profile pictures are publicly viewable" ON storage.objects;
CREATE POLICY "Profile pictures are publicly viewable" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'profile-pictures');

DROP POLICY IF EXISTS "Public can view profile pictures" ON storage.objects;
CREATE POLICY "Public can view profile pictures" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'user-profiles');

DROP POLICY IF EXISTS "Public read book images" ON storage.objects;
CREATE POLICY "Public read book images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'book-images');

DROP POLICY IF EXISTS "Public read documents bucket" ON storage.objects;
CREATE POLICY "Public read documents bucket" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Public read school supply images" ON storage.objects;
CREATE POLICY "Public read school supply images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'school-supply-images');

DROP POLICY IF EXISTS "Public read uniform images" ON storage.objects;
CREATE POLICY "Public read uniform images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'uniform-images');

DROP POLICY IF EXISTS "book_images_read" ON storage.objects;
CREATE POLICY "book_images_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'book-images');

-- 3. Set search_path for all functions in the public schema to prevent schema hijacking
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT 
            p.proname,
            pg_catalog.pg_get_function_identity_arguments(p.oid) as args
        FROM 
            pg_catalog.pg_proc p
            JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE 
            n.nspname = 'public'
    LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp', r.proname, r.args);
    END LOOP;
END;
$$;

-- 4. Revoke EXECUTE privilege on trigger functions from public / anon / authenticated roles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT 
            p.proname,
            pg_catalog.pg_get_function_identity_arguments(p.oid) as args
        FROM 
            pg_catalog.pg_proc p
            JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
            JOIN pg_catalog.pg_type t ON t.oid = p.prorettype
        WHERE 
            n.nspname = 'public'
            AND t.typname IN ('trigger', 'event_trigger')
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, authenticated, public CASCADE', r.proname, r.args);
    END LOOP;
END;
$$;

-- 5. Revoke EXECUTE privilege on sensitive admin-only security definer functions
REVOKE EXECUTE ON FUNCTION public.activate_affiliate(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user_safe(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.admin_safe_delete_user_comprehensive(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.approve_affiliate_application(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.approve_seller_payout(uuid, uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.deny_seller_payout(uuid, uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reject_affiliate_application(uuid, text) FROM anon, authenticated, public;

-- 6. Automatically index all foreign key columns in public schema that are currently unindexed
DO $$
DECLARE
    r RECORD;
    index_name TEXT;
BEGIN
    FOR r IN 
        WITH fk_columns AS (
            SELECT 
                ns.nspname AS schema_name,
                t.relname AS table_name,
                con.conname AS fk_name,
                att.attname AS column_name,
                con.conkey,
                att.attnum
            FROM pg_constraint con
            JOIN pg_class t ON t.oid = con.conrelid
            JOIN pg_namespace ns ON ns.oid = t.relnamespace
            JOIN pg_attribute att ON att.attrelid = t.oid AND att.attnum = ANY(con.conkey)
            WHERE con.contype = 'f' AND ns.nspname = 'public'
        ),
        indexed_columns AS (
            SELECT 
                ns.nspname AS schema_name,
                t.relname AS table_name,
                att.attname AS column_name,
                ind.indkey
            FROM pg_index ind
            JOIN pg_class t ON t.oid = ind.indrelid
            JOIN pg_namespace ns ON ns.oid = t.relnamespace
            JOIN pg_attribute att ON att.attrelid = t.oid AND att.attnum = ANY(ind.indkey)
            WHERE ns.nspname = 'public'
        )
        SELECT DISTINCT fk.schema_name, fk.table_name, fk.column_name
        FROM fk_columns fk
        LEFT JOIN indexed_columns idx 
            ON fk.schema_name = idx.schema_name 
            AND fk.table_name = idx.table_name 
            AND fk.column_name = idx.column_name
        WHERE idx.column_name IS NULL
    LOOP
        index_name := 'idx_' || r.table_name || '_' || r.column_name;
        -- Truncate index name if it exceeds Postgres length limit (63 chars)
        IF length(index_name) > 63 THEN
            index_name := substring(index_name from 1 for 50) || '_' || substring(md5(index_name) from 1 for 10);
        END IF;
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I (%I)', index_name, r.schema_name, r.table_name, r.column_name);
    END LOOP;
END;
$$;

-- 7. Drop unused indexes to reclaim storage and write speeds
DROP INDEX IF EXISTS public.idx_order_intents_payment_ref;
DROP INDEX IF EXISTS public.idx_order_intents_buyer;
DROP INDEX IF EXISTS public.idx_order_intents_status;
DROP INDEX IF EXISTS public.idx_payment_transactions_intent;
DROP INDEX IF EXISTS public.idx_listing_views_listing_id;
DROP INDEX IF EXISTS public.idx_listing_views_session_id;
DROP INDEX IF EXISTS public.idx_cart_abandonment_created;
DROP INDEX IF EXISTS public.idx_orders_order_type;
DROP INDEX IF EXISTS public.idx_checkout_events_session_id;
DROP INDEX IF EXISTS public.idx_checkout_events_listing_id;
DROP INDEX IF EXISTS public.idx_subscription_events_type_date;
DROP INDEX IF EXISTS public.idx_orders_paid_at;
DROP INDEX IF EXISTS public.idx_orders_delivery_locker_location;
DROP INDEX IF EXISTS public.idx_search_queries_created_at;
DROP INDEX IF EXISTS public.idx_search_queries_zero_results;
DROP INDEX IF EXISTS public.idx_messages_sender_id;
DROP INDEX IF EXISTS public.idx_coupons_affiliate_id;
DROP INDEX IF EXISTS public.idx_messages_created_at;
DROP INDEX IF EXISTS public.idx_wishlists_listing_id;
DROP INDEX IF EXISTS public.idx_coupon_affiliate_earnings_status;
DROP INDEX IF EXISTS public.idx_wishlists_created_at;
DROP INDEX IF EXISTS public.idx_conversations_buyer_notified;
DROP INDEX IF EXISTS public.idx_conversations_seller_notified;

-- 8. Drop duplicate indexes
DROP INDEX IF EXISTS public.wishlists_user_listing_unique;
