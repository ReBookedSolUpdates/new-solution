-- Migration: Fix orders timeline triggers causing FK constraint violation on order insertion/materialization
-- Created: 2026-07-23

-- 1. Drop invalid BEFORE INSERT triggers that attempted to insert into order_events before orders row existed
DROP TRIGGER IF EXISTS trigger_log_order_timeline ON public.orders;
DROP TRIGGER IF EXISTS trigger_log_order_timeline_events ON public.orders;

-- 2. Update log_order_timeline_before function to safely compute commission rate without inserting events or referencing non-existent columns
CREATE OR REPLACE FUNCTION public.log_order_timeline_before()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_commission_rate NUMERIC := 0.10;
    v_seller_is_business BOOLEAN := false;
    v_seller_is_tier1 BOOLEAN := false;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        SELECT COALESCE(is_business, false), COALESCE(subscription_tier::text = 'tier1', false)
        INTO v_seller_is_business, v_seller_is_tier1
        FROM public.profiles
        WHERE id = NEW.seller_id;

        IF v_seller_is_business THEN
            IF v_seller_is_tier1 THEN
                v_commission_rate := 0.065;
            ELSE
                v_commission_rate := 0.10;
            END IF;
        ELSE
            v_commission_rate := 0.10;
        END IF;

        NEW.commission_rate_applied := v_commission_rate;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'disputed' THEN
            NEW.dispute_timer_expires_at := NOW() + INTERVAL '48 hours';
            NEW.dispute_status := 'open';
            NEW.disputed_at := NOW();
        END IF;
        IF OLD.status = 'disputed' AND NEW.status IS DISTINCT FROM 'disputed' THEN
            NEW.dispute_status := 'resolved';
            NEW.dispute_resolved_at := NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
