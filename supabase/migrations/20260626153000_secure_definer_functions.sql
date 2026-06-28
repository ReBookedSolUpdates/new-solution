-- REDEFINE FUNCTIONS TO SECURITY INVOKER WITH EXPLICIT SEARCH_PATH AND CALLER VALIDATION

-- 1. Redefine confirm_order_pickup
CREATE OR REPLACE FUNCTION public.confirm_order_pickup(
    p_order_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_order RECORD;
    v_amount_to_release BIGINT;
    v_new_balance BIGINT;
BEGIN
    -- Authorization Check: The user executing the function must be the one specified or an admin
    IF auth.uid() != p_user_id AND NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized caller');
    END IF;

    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    IF v_order.order_type <> 'pickup' THEN
        RETURN jsonb_build_object('success', false, 'error', 'This confirmation flow is only for pickup orders');
    END IF;

    IF p_user_id != v_order.buyer_id AND p_user_id != v_order.seller_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    IF v_order.pickup_status IN ('completed', 'expired', 'disputed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pickup order is no longer confirmable');
    END IF;

    IF p_user_id = v_order.buyer_id THEN
        UPDATE public.orders
        SET buyer_confirmed_at = NOW(),
            pickup_status = CASE WHEN seller_confirmed_at IS NULL THEN 'awaiting_seller_confirmation' ELSE pickup_status END,
            updated_at = NOW()
        WHERE id = p_order_id;
        v_order.buyer_confirmed_at := NOW();
    ELSIF p_user_id = v_order.seller_id THEN
        UPDATE public.orders
        SET seller_confirmed_at = NOW(),
            pickup_status = CASE WHEN buyer_confirmed_at IS NULL THEN 'awaiting_buyer_confirmation' ELSE pickup_status END,
            updated_at = NOW()
        WHERE id = p_order_id;
        v_order.seller_confirmed_at := NOW();
    END IF;

    -- Insert into activity_logs using metadata column
    INSERT INTO public.activity_logs (user_id, action, metadata, entity_type, entity_id)
    VALUES (
        p_user_id,
        'pickup_confirmation',
        jsonb_build_object(
            'pickup_status', CASE
                WHEN v_order.buyer_confirmed_at IS NOT NULL AND v_order.seller_confirmed_at IS NOT NULL THEN 'completed'
                WHEN v_order.buyer_confirmed_at IS NOT NULL THEN 'awaiting_seller_confirmation'
                WHEN v_order.seller_confirmed_at IS NOT NULL THEN 'awaiting_buyer_confirmation'
                ELSE 'pending_pickup'
            END,
            'buyer_confirmed', v_order.buyer_confirmed_at IS NOT NULL,
            'seller_confirmed', v_order.seller_confirmed_at IS NOT NULL
        ),
        'order',
        p_order_id::text
    );

    IF v_order.buyer_confirmed_at IS NOT NULL AND v_order.seller_confirmed_at IS NOT NULL THEN
        UPDATE public.orders 
        SET status = 'completed',
            pickup_status = 'completed',
            updated_at = NOW()
        WHERE id = p_order_id;

        -- Calculate 90% of item price (amount is total order in cents, less 2000 cents buyer protection fee)
        v_amount_to_release := ((v_order.amount - 2000) * 90) / 100;

        -- Ensure wallet exists or create it
        INSERT INTO public.user_wallets (user_id, available_balance, total_earned)
        VALUES (v_order.seller_id, v_amount_to_release, v_amount_to_release)
        ON CONFLICT (user_id) DO UPDATE
        SET available_balance = user_wallets.available_balance + v_amount_to_release,
            total_earned = user_wallets.total_earned + v_amount_to_release;

        SELECT available_balance INTO v_new_balance
        FROM public.user_wallets
        WHERE user_id = v_order.seller_id;

        INSERT INTO public.wallet_transactions (
            user_id, type, amount, reason, reference_order_id, status
        ) VALUES (
            v_order.seller_id, 'credit', v_amount_to_release, 'Pickup order completed - ' || v_order.order_id, p_order_id, 'completed'
        );

        RETURN jsonb_build_object(
            'success', true, 
            'completed', true, 
            'payout_method', 'wallet',
            'amount', v_amount_to_release::numeric / 100.00,
            'new_balance', v_new_balance::numeric / 100.00
        );
    ELSE
        UPDATE public.orders
        SET status = 'awaiting_confirmation',
            pickup_status = CASE
                WHEN buyer_confirmed_at IS NOT NULL THEN 'awaiting_seller_confirmation'
                WHEN seller_confirmed_at IS NOT NULL THEN 'awaiting_buyer_confirmation'
                ELSE 'pending_pickup'
            END,
            updated_at = NOW()
        WHERE id = p_order_id;

        RETURN jsonb_build_object(
            'success', true, 
            'completed', false, 
            'buyer_confirmed', v_order.buyer_confirmed_at IS NOT NULL,
            'seller_confirmed', v_order.seller_confirmed_at IS NOT NULL
        );
    END IF;
END;
$$;


-- 2. Redefine create_payout_request
CREATE OR REPLACE FUNCTION public.create_payout_request(
    p_user_id UUID,
    p_amount BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_payout_id UUID;
    v_available_balance BIGINT;
BEGIN
    -- Authorization Check: Caller must be the user requesting payout or an admin
    IF auth.uid() != p_user_id AND NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized payout request';
    END IF;

    -- Check available balance
    SELECT available_balance INTO v_available_balance
    FROM public.user_wallets
    WHERE user_id = p_user_id;

    IF v_available_balance IS NULL OR v_available_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Create payout request
    INSERT INTO public.payout_requests (user_id, amount, status)
    VALUES (p_user_id, p_amount, 'pending')
    RETURNING id INTO v_payout_id;

    -- Deduct from available balance (move to pending)
    UPDATE public.user_wallets
    SET available_balance = available_balance - p_amount,
        pending_balance = pending_balance + p_amount
    WHERE user_id = p_user_id;

    -- Log transaction
    INSERT INTO public.wallet_transactions (
        user_id, type, amount, reason, reference_payout_id, status
    ) VALUES (
        p_user_id, 'debit', p_amount, 'Payout request created', v_payout_id, 'pending'
    );

    RETURN v_payout_id;
EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;
