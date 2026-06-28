-- Add pickup_enabled to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pickup_enabled boolean DEFAULT false;

-- Add pickup and wallet columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'delivery';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_committed_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_confirmed_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_confirmed_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS meetup_location text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS meetup_time timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS wallet_deducted_amount integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS wallet_deducted_total numeric DEFAULT 0.00;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_order_type_check CHECK (order_type IN ('delivery', 'pickup'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_pickup_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_pickup_status_check CHECK (
    pickup_status IS NULL OR pickup_status IN (
        'pending_pickup',
        'awaiting_buyer_confirmation',
        'awaiting_seller_confirmation',
        'completed',
        'expired',
        'disputed'
    )
);

UPDATE public.orders
SET pickup_status = CASE
    WHEN status = 'completed' OR (buyer_confirmed_at IS NOT NULL AND seller_confirmed_at IS NOT NULL) THEN 'completed'
    WHEN pickup_committed_at IS NOT NULL AND buyer_confirmed_at IS NOT NULL AND seller_confirmed_at IS NULL THEN 'awaiting_seller_confirmation'
    WHEN pickup_committed_at IS NOT NULL AND seller_confirmed_at IS NOT NULL AND buyer_confirmed_at IS NULL THEN 'awaiting_buyer_confirmation'
    WHEN pickup_committed_at IS NOT NULL THEN 'pending_pickup'
    ELSE COALESCE(pickup_status, 'pending_pickup')
END
WHERE order_type = 'pickup' AND pickup_status IS NULL;

UPDATE public.orders
SET pickup_status = NULL
WHERE order_type <> 'pickup';

CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_status ON public.orders(pickup_status);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_expiry ON public.orders(order_type, pickup_status, pickup_committed_at)
WHERE order_type = 'pickup';

-- Update status check constraint on orders
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status = ANY (ARRAY['pending_payment'::text, 'pending'::text, 'paid'::text, 'pending_commit'::text, 'committed'::text, 'pickup_scheduled'::text, 'pickup_attempted'::text, 'in_transit'::text, 'delivered'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'declined'::text, 'awaiting_confirmation'::text]));

-- Atomic function to create order with wallet deduction
CREATE OR REPLACE FUNCTION create_order_with_wallet_deduction(
    p_order_id TEXT,
    p_buyer_id UUID,
    p_seller_id UUID,
    p_book_id UUID,
    p_item_type TEXT,
    p_buyer_full_name TEXT,
    p_seller_full_name TEXT,
    p_buyer_email TEXT,
    p_seller_email TEXT,
    p_buyer_phone_number TEXT,
    p_seller_phone_number TEXT,
    p_pickup_address_encrypted TEXT,
    p_shipping_address_encrypted TEXT,
    p_delivery_option TEXT,
    p_pickup_type TEXT,
    p_pickup_locker_data JSONB,
    p_pickup_locker_location_id TEXT,
    p_pickup_locker_provider_slug TEXT,
    p_delivery_type TEXT,
    p_delivery_locker_data JSONB,
    p_delivery_locker_location_id TEXT,
    p_delivery_locker_provider_slug TEXT,
    p_delivery_data JSONB,
    p_payment_reference TEXT,
    p_paystack_reference TEXT,
    p_selected_courier_slug TEXT,
    p_selected_service_code TEXT,
    p_selected_courier_name TEXT,
    p_selected_service_name TEXT,
    p_selected_shipping_cost NUMERIC,
    p_status TEXT,
    p_payment_status TEXT,
    p_amount INTEGER,
    p_total_amount NUMERIC,
    p_items JSONB,
    p_order_type TEXT,
    p_use_wallet BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_balance BIGINT := 0;
    v_wallet_deducted_amount BIGINT := 0;
    v_wallet_deducted_total NUMERIC := 0.00;
    v_final_order_id UUID;
    v_order_status TEXT := p_status;
    v_payment_status TEXT := p_payment_status;
BEGIN
    -- 1. If using wallet, check balance
    IF p_use_wallet THEN
        SELECT COALESCE(available_balance, 0) INTO v_wallet_balance
        FROM user_wallets
        WHERE user_id = p_buyer_id;
        
        IF v_wallet_balance > 0 THEN
            IF v_wallet_balance >= p_amount THEN
                -- Wallet covers the full price
                v_wallet_deducted_amount := p_amount;
                v_wallet_deducted_total := p_total_amount;
                v_order_status := 'pending_commit'; -- bypasses payment gateway
                v_payment_status := 'paid';
            ELSE
                -- Partial payment
                v_wallet_deducted_amount := v_wallet_balance;
                v_wallet_deducted_total := v_wallet_balance::numeric / 100.00;
            END IF;
        END IF;
    END IF;

    -- 2. Deduct from wallet if applicable
    IF v_wallet_deducted_amount > 0 THEN
        UPDATE user_wallets
        SET available_balance = available_balance - v_wallet_deducted_amount
        WHERE user_id = p_buyer_id;
    END IF;

    -- 3. Insert order
    INSERT INTO orders (
        order_id, buyer_id, seller_id, book_id, item_id, item_type,
        buyer_full_name, seller_full_name, buyer_email, seller_email,
        buyer_phone_number, seller_phone_number, pickup_address_encrypted,
        shipping_address_encrypted, delivery_option, pickup_type,
        pickup_locker_data, pickup_locker_location_id, pickup_locker_provider_slug,
        delivery_type, delivery_locker_data, delivery_locker_location_id,
        delivery_locker_provider_slug, delivery_data, payment_reference,
        paystack_reference, selected_courier_slug, selected_service_code,
        selected_courier_name, selected_service_name, selected_shipping_cost,
        status, payment_status, amount, total_amount, items, order_type, pickup_status,
        wallet_deducted_amount, wallet_deducted_total, paid_at
    ) VALUES (
        p_order_id, p_buyer_id, p_seller_id, p_book_id, p_book_id, p_item_type,
        p_buyer_full_name, p_seller_full_name, p_buyer_email, p_seller_email,
        p_buyer_phone_number, p_seller_phone_number, p_pickup_address_encrypted,
        p_shipping_address_encrypted, p_delivery_option, p_pickup_type,
        p_pickup_locker_data, p_pickup_locker_location_id, p_pickup_locker_provider_slug,
        p_delivery_type, p_delivery_locker_data, p_delivery_locker_location_id,
        p_delivery_locker_provider_slug, p_delivery_data, p_payment_reference,
        p_paystack_reference, p_selected_courier_slug, p_selected_service_code,
        p_selected_courier_name, p_selected_service_name, p_selected_shipping_cost,
        v_order_status, v_payment_status, p_amount, p_total_amount, p_items, p_order_type,
        CASE WHEN p_order_type = 'pickup' THEN 'pending_pickup' ELSE NULL END,
        v_wallet_deducted_amount, v_wallet_deducted_total, CASE WHEN v_payment_status = 'paid' THEN NOW() ELSE NULL END
    ) RETURNING id INTO v_final_order_id;

    -- 4. Log wallet transaction if applicable
    IF v_wallet_deducted_amount > 0 THEN
        INSERT INTO wallet_transactions (
            user_id, type, amount, reason, reference_order_id, status
        ) VALUES (
            p_buyer_id, 'debit', v_wallet_deducted_amount, 'Paid for order ' || p_order_id, v_final_order_id, 'completed'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'id', v_final_order_id,
        'status', v_order_status,
        'payment_status', v_payment_status,
        'wallet_deducted_amount', v_wallet_deducted_amount,
        'wallet_deducted_total', v_wallet_deducted_total
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Function for dual confirmation of pickup orders
CREATE OR REPLACE FUNCTION confirm_order_pickup(
    p_order_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
    v_order RECORD;
    v_has_bank BOOLEAN := FALSE;
    v_amount_to_release BIGINT;
    v_new_balance BIGINT;
BEGIN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
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
        UPDATE orders
        SET buyer_confirmed_at = NOW(),
            pickup_status = CASE WHEN seller_confirmed_at IS NULL THEN 'awaiting_seller_confirmation' ELSE pickup_status END,
            updated_at = NOW()
        WHERE id = p_order_id;
        v_order.buyer_confirmed_at := NOW();
    ELSIF p_user_id = v_order.seller_id THEN
        UPDATE orders
        SET seller_confirmed_at = NOW(),
            pickup_status = CASE WHEN buyer_confirmed_at IS NULL THEN 'awaiting_buyer_confirmation' ELSE pickup_status END,
            updated_at = NOW()
        WHERE id = p_order_id;
        v_order.seller_confirmed_at := NOW();
    END IF;

    -- Fix: Insert into existing activity_logs instead of non-existent order_activity_log using correct column name 'metadata'
    INSERT INTO activity_logs (user_id, action, metadata, entity_type, entity_id)
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
        SELECT EXISTS(
            SELECT 1 FROM banking_subaccounts 
            WHERE user_id = v_order.seller_id AND status = 'active'
        ) INTO v_has_bank;

        UPDATE orders 
        SET status = 'completed',
            pickup_status = 'completed',
            updated_at = NOW()
        WHERE id = p_order_id;

        IF v_has_bank THEN
            RETURN jsonb_build_object(
                'success', true, 
                'completed', true, 
                'payout_method', 'bank_transfer',
                'amount', v_order.total_amount
            );
        ELSE
            v_amount_to_release := v_order.amount - 2000;

            INSERT INTO user_wallets (user_id, available_balance, total_earned)
            VALUES (v_order.seller_id, v_amount_to_release, v_amount_to_release)
            ON CONFLICT (user_id) DO UPDATE
            SET available_balance = user_wallets.available_balance + v_amount_to_release,
                total_earned = user_wallets.total_earned + v_amount_to_release;

            SELECT available_balance INTO v_new_balance
            FROM user_wallets
            WHERE user_id = v_order.seller_id;

            INSERT INTO wallet_transactions (
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
        END IF;
    ELSE
        UPDATE orders
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
$;

-- Function to credit wallet when an order is refunded
CREATE OR REPLACE FUNCTION credit_wallet_on_refund(
    p_user_id UUID,
    p_amount BIGINT,
    p_order_id UUID,
    p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_wallets (user_id, available_balance, total_earned)
    VALUES (p_user_id, p_amount, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET available_balance = user_wallets.available_balance + p_amount;

    INSERT INTO wallet_transactions (
        user_id, type, amount, reason, reference_order_id, status
    ) VALUES (
        p_user_id, 'credit', p_amount, p_reason, p_order_id, 'completed'
    );

    RETURN TRUE;
END;
$$;



