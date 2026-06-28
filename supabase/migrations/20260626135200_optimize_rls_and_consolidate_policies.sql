-- Migration: Optimize RLS InitPlans and Consolidate Permissive Policies

-- 1. analytics_events (INSERT & SELECT)
DROP POLICY IF EXISTS "Analytics events insert" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow anonymous analytics inserts" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow authenticated analytics inserts" ON public.analytics_events;
DROP POLICY IF EXISTS "Analytics events access" ON public.analytics_events;

CREATE POLICY "Analytics events insert anon" ON public.analytics_events
    FOR INSERT TO anon
    WITH CHECK (user_id IS NULL AND event_name IS NOT NULL AND event_category IS NOT NULL);

CREATE POLICY "Analytics events insert authenticated" ON public.analytics_events
    FOR INSERT TO authenticated
    WITH CHECK (((user_id IS NULL) OR (user_id = (SELECT auth.uid()))) AND event_name IS NOT NULL AND event_category IS NOT NULL);

CREATE POLICY "Analytics events select" ON public.analytics_events
    FOR SELECT TO public
    USING (((SELECT auth.uid()) IS NOT NULL) AND ((user_id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid()))));

-- 2. order_notifications
DROP POLICY IF EXISTS "Users can view their own order notifications" ON public.order_notifications;
DROP POLICY IF EXISTS "Users can update their own order notifications" ON public.order_notifications;
DROP POLICY IF EXISTS "Users can create their own order notifications" ON public.order_notifications;

CREATE POLICY "Users can view their own order notifications" ON public.order_notifications
    FOR SELECT TO public
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own order notifications" ON public.order_notifications
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create their own order notifications" ON public.order_notifications
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- 3. refund_transactions
DROP POLICY IF EXISTS "refund_transactions_admin_insert" ON public.refund_transactions;
DROP POLICY IF EXISTS "refund_transactions_unified_update" ON public.refund_transactions;
DROP POLICY IF EXISTS "refund_transactions_unified_select" ON public.refund_transactions;

CREATE POLICY "refund_transactions_admin_insert" ON public.refund_transactions
    FOR INSERT TO public
    WITH CHECK (is_current_user_admin() OR ((SELECT auth.role()) = 'service_role'::text));

CREATE POLICY "refund_transactions_unified_update" ON public.refund_transactions
    FOR UPDATE TO public
    USING (is_current_user_admin() OR ((SELECT auth.role()) = 'service_role'::text) OR (EXISTS (SELECT 1 FROM orders WHERE orders.id = refund_transactions.order_id AND (orders.buyer_id = (SELECT auth.uid()) OR orders.seller_id = (SELECT auth.uid())))))
    WITH CHECK (is_current_user_admin() OR ((SELECT auth.role()) = 'service_role'::text) OR (EXISTS (SELECT 1 FROM orders WHERE orders.id = refund_transactions.order_id AND (orders.buyer_id = (SELECT auth.uid()) OR orders.seller_id = (SELECT auth.uid())))));

CREATE POLICY "refund_transactions_unified_select" ON public.refund_transactions
    FOR SELECT TO public
    USING ((EXISTS (SELECT 1 FROM orders WHERE orders.id = refund_transactions.order_id AND (orders.buyer_id = (SELECT auth.uid()) OR orders.seller_id = (SELECT auth.uid())))) OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true)));

-- 4. user_wallets
DROP POLICY IF EXISTS "user_wallets_admin_update" ON public.user_wallets;
DROP POLICY IF EXISTS "User wallets select" ON public.user_wallets;

CREATE POLICY "user_wallets_admin_update" ON public.user_wallets
    FOR UPDATE TO public
    USING (is_current_user_admin() OR ((SELECT auth.role()) = 'service_role'::text))
    WITH CHECK (is_current_user_admin() OR ((SELECT auth.role()) = 'service_role'::text));

CREATE POLICY "User wallets select" ON public.user_wallets
    FOR SELECT TO public
    USING ((user_id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

-- 5. cart_abandonment_logs
DROP POLICY IF EXISTS "Admins view all cart abandonment" ON public.cart_abandonment_logs;
DROP POLICY IF EXISTS "Users view own cart abandonment" ON public.cart_abandonment_logs;
DROP POLICY IF EXISTS "Users can insert their own cart abandonment" ON public.cart_abandonment_logs;
DROP POLICY IF EXISTS "Users can mark their own cart abandonment as recovered" ON public.cart_abandonment_logs;

CREATE POLICY "Users view own cart abandonment" ON public.cart_abandonment_logs
    FOR SELECT TO authenticated
    USING (((SELECT auth.uid()) = user_id) OR is_current_user_admin());

CREATE POLICY "Users can insert their own cart abandonment" ON public.cart_abandonment_logs
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can mark their own cart abandonment as recovered" ON public.cart_abandonment_logs
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- 6. wishlists
DROP POLICY IF EXISTS "Users can view their own wishlists" ON public.wishlists;
DROP POLICY IF EXISTS "Users can add to their own wishlist" ON public.wishlists;
DROP POLICY IF EXISTS "Users can remove from their own wishlist" ON public.wishlists;

CREATE POLICY "Users can view their own wishlists" ON public.wishlists
    FOR SELECT TO public
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can add to their own wishlist" ON public.wishlists
    FOR INSERT TO public
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can remove from their own wishlist" ON public.wishlists
    FOR DELETE TO public
    USING ((SELECT auth.uid()) = user_id);

-- 7. order_intents
DROP POLICY IF EXISTS "Buyers create own intents" ON public.order_intents;
DROP POLICY IF EXISTS "Buyers view own intents" ON public.order_intents;
DROP POLICY IF EXISTS "Sellers view own intents" ON public.order_intents;

CREATE POLICY "Buyers create own intents" ON public.order_intents
    FOR INSERT TO public
    WITH CHECK ((SELECT auth.uid()) = buyer_id);

CREATE POLICY "Buyers view own intents" ON public.order_intents
    FOR SELECT TO public
    USING ((SELECT auth.uid()) = buyer_id);

CREATE POLICY "Sellers view own intents" ON public.order_intents
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = seller_id);

-- 8. listing_views
DROP POLICY IF EXISTS "Enable select for admins" ON public.listing_views;
CREATE POLICY "Enable select for admins" ON public.listing_views
    FOR SELECT TO public
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = 'admin'::app_role));

-- 9. seller_funnel_events
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.seller_funnel_events;
DROP POLICY IF EXISTS "Enable select for admins" ON public.seller_funnel_events;

CREATE POLICY "Enable insert for authenticated users" ON public.seller_funnel_events
    FOR INSERT TO public
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Enable select for admins" ON public.seller_funnel_events
    FOR SELECT TO public
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = 'admin'::app_role));

-- 10. checkout_events
DROP POLICY IF EXISTS "Enable select for admins" ON public.checkout_events;
CREATE POLICY "Enable select for admins" ON public.checkout_events
    FOR SELECT TO public
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = 'admin'::app_role));

-- 11. wallet_credits
DROP POLICY IF EXISTS "Users can view own credits" ON public.wallet_credits;
CREATE POLICY "Users can view own credits" ON public.wallet_credits
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- 12. subscription_events
DROP POLICY IF EXISTS "Enable select for admins and own user" ON public.subscription_events;
CREATE POLICY "Enable select for admins and own user" ON public.subscription_events
    FOR SELECT TO public
    USING (((SELECT auth.uid()) = user_id) OR (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = 'admin'::app_role)));

-- 13. search_queries
DROP POLICY IF EXISTS "Enable select for admins" ON public.search_queries;
CREATE POLICY "Enable select for admins" ON public.search_queries
    FOR SELECT TO public
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = 'admin'::app_role));

-- 14. coupon_affiliate_earnings
DROP POLICY IF EXISTS "Admins can view all coupon affiliate earnings" ON public.coupon_affiliate_earnings;
DROP POLICY IF EXISTS "Affiliates can view their own earnings" ON public.coupon_affiliate_earnings;
DROP POLICY IF EXISTS "Admins can update coupon affiliate earnings" ON public.coupon_affiliate_earnings;
DROP POLICY IF EXISTS "Authenticated users can insert coupon affiliate earnings via tr" ON public.coupon_affiliate_earnings;

CREATE POLICY "Affiliates can view their own earnings" ON public.coupon_affiliate_earnings
    FOR SELECT TO public
    USING (((SELECT auth.uid()) = affiliate_id) OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true)));

CREATE POLICY "Admins can update coupon affiliate earnings" ON public.coupon_affiliate_earnings
    FOR UPDATE TO public
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

CREATE POLICY "Authenticated users can insert coupon affiliate earnings via tr" ON public.coupon_affiliate_earnings
    FOR INSERT TO public
    WITH CHECK (((SELECT auth.uid()) = affiliate_id) OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true)));

-- 15. book_interest_logs
DROP POLICY IF EXISTS "Users view own interest logs" ON public.book_interest_logs;
DROP POLICY IF EXISTS "Users create own interest logs" ON public.book_interest_logs;
DROP POLICY IF EXISTS "Users update own interest dwell time" ON public.book_interest_logs;

CREATE POLICY "Users view own interest logs" ON public.book_interest_logs
    FOR SELECT TO public
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users create own interest logs" ON public.book_interest_logs
    FOR INSERT TO public
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users update own interest dwell time" ON public.book_interest_logs
    FOR UPDATE TO public
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- 16. banking_subaccounts (Consolidate SELECT)
DROP POLICY IF EXISTS "Admins can view all banking_subaccounts" ON public.banking_subaccounts;
DROP POLICY IF EXISTS "banking_subaccounts_unified_select" ON public.banking_subaccounts;

CREATE POLICY "banking_subaccounts_unified_select" ON public.banking_subaccounts
    FOR SELECT TO public
    USING (((SELECT auth.uid()) = user_id) OR is_current_user_admin());

-- 17. chat_reports (Consolidate SELECT)
DROP POLICY IF EXISTS "Admins can view all reports" ON public.chat_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.chat_reports;

CREATE POLICY "Users can view their own reports" ON public.chat_reports
    FOR SELECT TO public
    USING ((reported_by = (SELECT auth.uid())) OR is_current_user_admin());
