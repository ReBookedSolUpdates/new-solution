-- Migration: Business Subscription System additions
-- Adds subscription_active_until and subscription_test_mode columns to profiles
-- These supplement the subscription_tier column added in the previous migration

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_active_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_test_mode BOOLEAN DEFAULT TRUE;

-- Add index for fast tier lookups (used by get_seller_payout_rate)
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier
  ON public.profiles (subscription_tier)
  WHERE is_business = TRUE;

-- Comment explaining test mode behaviour
COMMENT ON COLUMN public.profiles.subscription_test_mode IS
  'When TRUE, Tier 1 features are active regardless of payment status. Set FALSE before public launch.';

COMMENT ON COLUMN public.profiles.subscription_active_until IS
  'UTC timestamp until which the paid Tier 1 subscription is valid. NULL = not subscribed.';

COMMENT ON COLUMN public.profiles.auto_responder_message IS
  'Tier 1 Business only: message automatically sent to buyers when a new chat is received.';
