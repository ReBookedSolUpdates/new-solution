-- Migration: Phase 2 — Paystack Subscription Schema
-- Creates public.business_subscriptions table and updates get_seller_payout_rate to use it

-- 1. Create public.business_subscriptions table if not exists
CREATE TABLE IF NOT EXISTS public.business_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'tier1')),
    status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'unpaid')),
    paystack_subscription_code TEXT,
    paystack_customer_code TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.business_subscriptions;
CREATE POLICY "Users can view their own subscription" 
    ON public.business_subscriptions FOR SELECT 
    USING (auth.uid() = business_id);

DROP POLICY IF EXISTS "Admins can do everything on subscriptions" ON public.business_subscriptions;
CREATE POLICY "Admins can do everything on subscriptions"
    ON public.business_subscriptions FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    ));

-- 4. Recreate get_seller_payout_rate function to check live subscription status
CREATE OR REPLACE FUNCTION get_seller_payout_rate(p_seller_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_is_business BOOLEAN := FALSE;
    v_sub_tier TEXT := 'free';
    v_sub_status TEXT := 'inactive';
    v_active_until TIMESTAMPTZ;
    v_test_mode BOOLEAN := TRUE;
BEGIN
    -- Check if seller is a business account
    SELECT COALESCE(is_business, FALSE), COALESCE(subscription_test_mode, TRUE)
    INTO v_is_business, v_test_mode
    FROM public.profiles
    WHERE id = p_seller_id;

    IF NOT v_is_business THEN
        RETURN 90.0; -- 10% commission (90% payout) for standard/free individual sellers
    END IF;

    -- Read live subscription status from business_subscriptions table
    SELECT tier, status, current_period_end
    INTO v_sub_tier, v_sub_status, v_active_until
    FROM public.business_subscriptions
    WHERE business_id = p_seller_id;

    -- Gating logic (Test mode override OR active/grace period check)
    -- If active, or past_due within a 5-day grace period
    IF v_test_mode OR (
        v_sub_tier = 'tier1' AND (
            v_sub_status = 'active' OR 
            (v_sub_status = 'past_due' AND v_active_until + INTERVAL '5 days' >= now())
        )
    ) THEN
        RETURN 93.5; -- 6.5% commission (93.5% payout) for Tier 1
    END IF;

    RETURN 90.0; -- 10% commission (90% payout) for Business Free
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
