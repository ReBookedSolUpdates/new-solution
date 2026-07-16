-- Migration: Add dispute flow, timeline events, and TCG courier pull update tracking to orders
-- Created: 2026-07-17

-- 1. Add dispute and tracking columns to orders table if they do not exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS commission_rate_applied NUMERIC,
ADD COLUMN IF NOT EXISTS dispute_timer_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS dispute_escalated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dispute_escalated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_courier_refresh_at timestamp with time zone;

-- 2. Create order_events table for tracking timeline history
CREATE TABLE IF NOT EXISTS public.order_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
    event_type text NOT NULL, -- 'placed', 'paid', 'dispatched', 'delivered', 'buyer_confirmed', 'issue_reported', 'resolved', 'escalated', 'cancelled', 'courier_pulled'
    timestamp timestamp with time zone DEFAULT now(),
    actor text NOT NULL, -- 'buyer', 'seller', 'system', 'admin'
    details jsonb DEFAULT '{}'::jsonb
);

-- Enable Row Level Security (RLS) on order_events
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists
DROP POLICY IF EXISTS "Users can view events for their own orders" ON public.order_events;

-- Create policy for users to view their own order events
CREATE POLICY "Users can view events for their own orders" ON public.order_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_events.order_id
            AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
        )
    );

-- Create policy for system insert
DROP POLICY IF EXISTS "System/Service insert events" ON public.order_events;
CREATE POLICY "System/Service insert events" ON public.order_events
    FOR INSERT WITH CHECK (true);

-- 3. Function to automatically check and escalate expired dispute timers
CREATE OR REPLACE FUNCTION public.check_and_escalate_disputes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_escalated_count integer := 0;
    v_order RECORD;
BEGIN
    FOR v_order IN 
        SELECT id FROM public.orders
        WHERE status = 'disputed' 
          AND dispute_timer_expires_at <= NOW()
          AND dispute_escalated = false
    LOOP
        -- Update order status
        UPDATE public.orders
        SET dispute_escalated = true,
            dispute_escalated_at = NOW(),
            updated_at = NOW()
        WHERE id = v_order.id;

        -- Log event
        INSERT INTO public.order_events (order_id, event_type, actor, details)
        VALUES (
            v_order.id,
            'escalated',
            'system',
            jsonb_build_object('reason', 'Auto-escalated after 48-hour resolution window expired')
        );

        v_escalated_count := v_escalated_count + 1;
    END LOOP;

    RETURN v_escalated_count;
END;
$$;
