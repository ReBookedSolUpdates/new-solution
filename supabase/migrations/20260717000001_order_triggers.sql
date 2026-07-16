-- Migration: Add automated triggers to log timeline events on order creations and status updates
-- Created: 2026-07-17

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.log_order_timeline_events()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_rate NUMERIC := 0.10; -- Default 10%
    v_seller_is_business BOOLEAN := false;
    v_seller_is_tier1 BOOLEAN := false;
BEGIN
    -- On INSERT: Log initial creation and payment
    IF (TG_OP = 'INSERT') THEN
        -- Resolve seller's commission rate at transaction time
        SELECT COALESCE(is_business, false)
        INTO v_seller_is_business
        FROM public.profiles
        WHERE id = NEW.seller_id;

        IF v_seller_is_business THEN
            -- Check if they have an active business subscription
            SELECT EXISTS (
                SELECT 1 FROM public.business_subscriptions
                WHERE business_id = NEW.seller_id AND status = 'active' AND tier = 'tier1'
            ) INTO v_seller_is_tier1;

            -- Or if subscription_tier is 'tier1' (promo code fallback)
            IF NOT v_seller_is_tier1 THEN
                SELECT COALESCE(subscription_tier::text = 'tier1', false) INTO v_seller_is_tier1
                FROM public.profiles WHERE id = NEW.seller_id;
            END IF;

            IF v_seller_is_tier1 THEN
                v_commission_rate := 0.065; -- 6.5% for business tier 1
            ELSE
                v_commission_rate := 0.10;  -- 10% for business free
            END IF;
        ELSE
            v_commission_rate := 0.10; -- 10% for standard
        END IF;

        -- Save transaction-time commission rate
        NEW.commission_rate_applied := v_commission_rate;

        -- Log placing event
        INSERT INTO public.order_events (order_id, event_type, actor, details)
        VALUES (NEW.id, 'placed', 'buyer', jsonb_build_object('amount', NEW.total_amount));

        -- Log payment if paid
        IF NEW.payment_status = 'paid' THEN
            INSERT INTO public.order_events (order_id, event_type, actor, details)
            VALUES (NEW.id, 'paid', 'system', jsonb_build_object('reference', NEW.payment_reference));
        END IF;

    -- On UPDATE: Log status shifts
    ELSIF (TG_OP = 'UPDATE') THEN
        -- 1. Log Payment status transition (if transitioned from unpaid to paid)
        IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'paid' THEN
            INSERT INTO public.order_events (order_id, event_type, actor, details)
            VALUES (NEW.id, 'paid', 'system', jsonb_build_object('reference', NEW.payment_reference));
        END IF;

        -- 2. Log Order lifecycle status transition
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            IF NEW.status = 'dispatched' THEN
                INSERT INTO public.order_events (order_id, event_type, actor, details)
                VALUES (NEW.id, 'dispatched', 'seller', jsonb_build_object('tracking_number', NEW.tracking_number));
            
            ELSIF NEW.status = 'delivered' THEN
                INSERT INTO public.order_events (order_id, event_type, actor, details)
                VALUES (NEW.id, 'delivered', 'system', jsonb_build_object('courier', NEW.selected_courier_name));
            
            ELSIF NEW.status = 'completed' THEN
                INSERT INTO public.order_events (order_id, event_type, actor, details)
                VALUES (NEW.id, 'buyer_confirmed', 'buyer', jsonb_build_object('confirmed_at', NEW.buyer_confirmed_at));
            
            ELSIF NEW.status = 'cancelled' THEN
                INSERT INTO public.order_events (order_id, event_type, actor, details)
                VALUES (NEW.id, 'cancelled', 'seller', jsonb_build_object('reason', NEW.cancellation_reason, 'cancelled_at', NEW.cancelled_at));
            
            ELSIF NEW.status = 'disputed' THEN
                -- When a buyer disputes/reports an issue, start the 48-hour countdown timer
                NEW.dispute_timer_expires_at := NOW() + INTERVAL '48 hours';
                NEW.dispute_status := 'open';
                NEW.disputed_at := NOW();

                INSERT INTO public.order_events (order_id, event_type, actor, details)
                VALUES (NEW.id, 'issue_reported', 'buyer', jsonb_build_object('reason', NEW.dispute_reason, 'timer_expires_at', NEW.dispute_timer_expires_at));
            END IF;
        END IF;

        -- 3. Log Dispute Resolution (when transitioned from disputed status)
        IF OLD.status = 'disputed' AND NEW.status IS DISTINCT FROM 'disputed' THEN
            NEW.dispute_status := 'resolved';
            NEW.dispute_resolved_at := NOW();
            
            INSERT INTO public.order_events (order_id, event_type, actor, details)
            VALUES (NEW.id, 'resolved', 'seller', jsonb_build_object('resolution', NEW.dispute_resolution));
        END IF;

        -- 4. Log Dispute Manual Escalation changes
        IF OLD.dispute_escalated = false AND NEW.dispute_escalated = true THEN
            INSERT INTO public.order_events (order_id, event_type, actor, details)
            VALUES (NEW.id, 'escalated', 'system', jsonb_build_object('reason', 'Auto-escalated after 48-hour resolution window expired'));
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop trigger if exists and create
DROP TRIGGER IF EXISTS trigger_log_order_timeline ON public.orders;
CREATE TRIGGER trigger_log_order_timeline
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_timeline_events();
