-- Migration: Consolidate Remaining Permissive Policies and Optimize payout_audit_log RLS InitPlan

-- 1. payout_audit_log
DROP POLICY IF EXISTS "System can insert audit logs" ON public.payout_audit_log;
CREATE POLICY "System can insert audit logs" ON public.payout_audit_log
    FOR INSERT TO public
    WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR is_current_user_admin());

-- 2. order_intents
DROP POLICY IF EXISTS "Buyers view own intents" ON public.order_intents;
DROP POLICY IF EXISTS "Sellers view own intents" ON public.order_intents;
CREATE POLICY "Buyers and sellers view own intents" ON public.order_intents
    FOR SELECT TO public
    USING (((SELECT auth.uid()) = buyer_id) OR ((SELECT auth.uid()) = seller_id));

-- 3. orders
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

-- 4. profiles
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;

-- 5. school_supplies
DROP POLICY IF EXISTS "school_supplies_admin_all" ON public.school_supplies;
DROP POLICY IF EXISTS "school_supplies_seller_delete_own" ON public.school_supplies;
DROP POLICY IF EXISTS "school_supplies_seller_insert_own" ON public.school_supplies;
DROP POLICY IF EXISTS "school_supplies_seller_update_own" ON public.school_supplies;
DROP POLICY IF EXISTS "school_supplies_public_read_available" ON public.school_supplies;

CREATE POLICY "school_supplies_seller_delete_own" ON public.school_supplies
    FOR DELETE TO authenticated
    USING (seller_id = (SELECT auth.uid()) OR is_current_user_admin());

CREATE POLICY "school_supplies_seller_insert_own" ON public.school_supplies
    FOR INSERT TO authenticated
    WITH CHECK (seller_id = (SELECT auth.uid()) OR is_current_user_admin());

CREATE POLICY "school_supplies_seller_update_own" ON public.school_supplies
    FOR UPDATE TO authenticated
    USING (seller_id = (SELECT auth.uid()) OR is_current_user_admin())
    WITH CHECK (seller_id = (SELECT auth.uid()) OR is_current_user_admin());

CREATE POLICY "school_supplies_public_read_available" ON public.school_supplies
    FOR SELECT TO public
    USING (availability = 'available'::text OR is_current_user_admin());

-- 6. uniforms
DROP POLICY IF EXISTS "uniforms_admin_all" ON public.uniforms;
DROP POLICY IF EXISTS "uniforms_seller_delete_own" ON public.uniforms;
DROP POLICY IF EXISTS "uniforms_seller_insert_own" ON public.uniforms;
DROP POLICY IF EXISTS "uniforms_seller_update_own" ON public.uniforms;
DROP POLICY IF EXISTS "uniforms_public_read_available" ON public.uniforms;

CREATE POLICY "uniforms_seller_delete_own" ON public.uniforms
    FOR DELETE TO authenticated
    USING (seller_id = (SELECT auth.uid()) OR is_current_user_admin());

CREATE POLICY "uniforms_seller_insert_own" ON public.uniforms
    FOR INSERT TO authenticated
    WITH CHECK (seller_id = (SELECT auth.uid()) OR is_current_user_admin());

CREATE POLICY "uniforms_seller_update_own" ON public.uniforms
    FOR UPDATE TO authenticated
    USING (seller_id = (SELECT auth.uid()) OR is_current_user_admin())
    WITH CHECK (seller_id = (SELECT auth.uid()) OR is_current_user_admin());

CREATE POLICY "uniforms_public_read_available" ON public.uniforms
    FOR SELECT TO public
    USING (availability = 'available'::text OR is_current_user_admin());

-- 7. wallet_credits
DROP POLICY IF EXISTS "Admins can select wallet_credits" ON public.wallet_credits;
DROP POLICY IF EXISTS "Users can view own credits" ON public.wallet_credits;

CREATE POLICY "Users can view own credits" ON public.wallet_credits
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()) OR is_current_user_admin());
