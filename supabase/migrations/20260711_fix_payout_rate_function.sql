-- Migration: Fix get_seller_payout_rate to remove subscription_test_mode bypass
-- The test_mode flag was a dev convenience that should not be in production.
-- The function now relies solely on business_subscriptions.tier and status.

CREATE OR REPLACE FUNCTION get_seller_payout_rate(p_seller_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_is_business BOOLEAN := FALSE;
    v_profile_tier TEXT := 'free';
    v_sub_tier TEXT := 'free';
    v_sub_status TEXT := 'inactive';
    v_active_until TIMESTAMPTZ;
BEGIN
    -- 1. Check if seller is a business account and get profile-level tier
    SELECT COALESCE(is_business, FALSE), COALESCE(subscription_tier::text, 'free')
    INTO v_is_business, v_profile_tier
    FROM public.profiles
    WHERE id = p_seller_id;

    IF NOT v_is_business THEN
        RETURN 90.0; -- 10% commission (90% payout) for standard/free individual sellers
    END IF;

    -- 2. Fast-path: if profile tier is tier1, check business_subscriptions for validation
    -- Read live subscription status from business_subscriptions table
    SELECT tier, status, current_period_end
    INTO v_sub_tier, v_sub_status, v_active_until
    FROM public.business_subscriptions
    WHERE business_id = p_seller_id;

    -- 3. Determine payout rate based on subscription status
    -- Active subscription or within 5-day grace period for past_due
    IF v_sub_tier = 'tier1' AND (
        v_sub_status = 'active' OR
        (v_sub_status = 'past_due' AND v_active_until + INTERVAL '5 days' >= now())
    ) THEN
        RETURN 93.5; -- 6.5% commission (93.5% payout) for Tier 1
    END IF;

    -- 4. Fallback: check profile-level tier for promo-code granted subscriptions
    -- (These may not have a business_subscriptions row)
    IF v_profile_tier = 'tier1' THEN
        RETURN 93.5; -- 6.5% commission (93.5% payout) for Tier 1
    END IF;

    RETURN 90.0; -- 10% commission (90% payout) for Business Free
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
