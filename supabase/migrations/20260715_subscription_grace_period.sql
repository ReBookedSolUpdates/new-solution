-- Migration: Subscription Grace Period & Recovery Tracking
-- Adds columns for payment failure tracking, grace period management, and recovery payments
-- Also aligns get_seller_payout_rate grace period from 5 days to 3 days

-- 1. Add grace period tracking columns to business_subscriptions
ALTER TABLE public.business_subscriptions
  ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_reminders_sent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovery_reference TEXT;

COMMENT ON COLUMN public.business_subscriptions.payment_failed_at IS
  'UTC timestamp when the most recent payment failure was detected.';

COMMENT ON COLUMN public.business_subscriptions.grace_period_end IS
  'UTC timestamp when the 3-day grace period expires. After this, auto-cancel.';

COMMENT ON COLUMN public.business_subscriptions.grace_reminders_sent IS
  'Number of grace-period reminder emails sent (0-3). Reset on successful payment.';

COMMENT ON COLUMN public.business_subscriptions.recovery_reference IS
  'Paystack transaction reference for the most recent R79 recovery payment attempt.';

-- 2. Update get_seller_payout_rate: change grace period from 5 days to 3 days
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
    -- If active, or past_due within a 3-day grace period
    IF v_test_mode OR (
        v_sub_tier = 'tier1' AND (
            v_sub_status = 'active' OR 
            (v_sub_status = 'past_due' AND v_active_until + INTERVAL '3 days' >= now())
        )
    ) THEN
        RETURN 93.5; -- 6.5% commission (93.5% payout) for Tier 1
    END IF;

    RETURN 90.0; -- 10% commission (90% payout) for Business Free
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Add index for grace period lookups
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_grace
    ON public.business_subscriptions (status, grace_period_end)
    WHERE status = 'past_due';
