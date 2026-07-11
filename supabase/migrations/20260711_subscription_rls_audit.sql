-- Migration: RLS Policies for subscription_events table and audit of related tables
-- Ensures subscription_events has proper RLS policies

-- 1. Enable RLS on subscription_events (if not already enabled)
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for subscription_events
DROP POLICY IF EXISTS "Users can view their own subscription events" ON public.subscription_events;
CREATE POLICY "Users can view their own subscription events"
    ON public.subscription_events FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can do everything on subscription events" ON public.subscription_events;
CREATE POLICY "Admins can do everything on subscription events"
    ON public.subscription_events FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    ));

-- Service-role (edge functions) bypasses RLS by default, so no INSERT policy needed for webhooks.
-- Regular users should NOT be able to insert/update/delete subscription events.

-- 3. Verify wallet_transactions RLS (add if missing)
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view their own wallet transactions"
    ON public.wallet_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- 4. Verify payout_requests RLS (add if missing)
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payout requests" ON public.payout_requests;
CREATE POLICY "Users can view their own payout requests"
    ON public.payout_requests FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own payout requests" ON public.payout_requests;
CREATE POLICY "Users can create their own payout requests"
    ON public.payout_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 5. Add index for faster subscription_events lookups
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id
    ON public.subscription_events (user_id);
