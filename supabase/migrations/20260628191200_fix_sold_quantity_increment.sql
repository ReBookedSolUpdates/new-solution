-- Migration: Fix sold_quantity increments to satisfy books_qty_consistency constraint
-- Created: 2026-06-28

-- 1. Update create_order_with_wallet_deduction to increment sold_quantity
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
    p_use_wallet BOOLEAN,
    p_platform_fee NUMERIC,
    p_max_wallet_deduction INTEGER DEFAULT NULL
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
    v_locked_item_id UUID;
    v_is_fully_paid BOOLEAN := false;
    v_intent_payload JSONB;
    v_intent_id UUID;
BEGIN
    SET local statement_timeout = '5000'; -- 5 seconds

    -- 1. Check wallet deduction if applicable
    IF p_use_wallet THEN
        SELECT COALESCE(available_balance, 0) INTO v_wallet_balance
        FROM user_wallets
        WHERE user_id = p_buyer_id;
        
        -- Cap the available balance to the custom maximum in cents if provided
        IF p_max_wallet_deduction IS NOT NULL AND p_max_wallet_deduction >= 0 THEN
            IF v_wallet_balance > p_max_wallet_deduction THEN
                v_wallet_balance := p_max_wallet_deduction;
            END IF;
        END IF;
        
        IF v_wallet_balance > 0 THEN
            IF v_wallet_balance >= p_amount THEN
                -- Wallet covers the full price
                v_wallet_deducted_amount := p_amount;
                v_wallet_deducted_total := p_total_amount;
                v_order_status := 'pending_commit'; -- bypasses payment gateway
                v_payment_status := 'paid';
                v_is_fully_paid := true;
            ELSE
                -- Partial payment
                v_wallet_deducted_amount := v_wallet_balance;
                v_wallet_deducted_total := v_wallet_balance::numeric / 100.00;
            END IF;
        END IF;
    END IF;

    -- 2. If fully paid via wallet, create order immediately
    IF v_is_fully_paid THEN
        -- Lock and decrement inventory
        IF p_item_type = 'book' THEN
            SELECT id INTO v_locked_item_id FROM books WHERE id = p_book_id AND NOT sold AND available_quantity >= 1 FOR UPDATE SKIP LOCKED;
        ELSIF p_item_type = 'uniform' THEN
            SELECT id INTO v_locked_item_id FROM uniforms WHERE id = p_book_id AND NOT sold AND available_quantity >= 1 FOR UPDATE SKIP LOCKED;
        ELSIF p_item_type = 'school_supply' THEN
            SELECT id INTO v_locked_item_id FROM school_supplies WHERE id = p_book_id AND NOT sold AND available_quantity >= 1 FOR UPDATE SKIP LOCKED;
        END IF;

        IF v_locked_item_id IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Item is no longer available.'
            );
        END IF;

        -- Decrement inventory and increment sold_quantity to maintain constraint consistency
        IF p_item_type = 'book' THEN
            UPDATE books SET available_quantity = available_quantity - 1, sold_quantity = COALESCE(sold_quantity, 0) + 1, sold = (available_quantity - 1 <= 0), updated_at = NOW() WHERE id = v_locked_item_id;
        ELSIF p_item_type = 'uniform' THEN
            UPDATE uniforms SET available_quantity = available_quantity - 1, sold_quantity = COALESCE(sold_quantity, 0) + 1, sold = (available_quantity - 1 <= 0), updated_at = NOW() WHERE id = v_locked_item_id;
        ELSIF p_item_type = 'school_supply' THEN
            UPDATE school_supplies SET available_quantity = available_quantity - 1, sold_quantity = COALESCE(sold_quantity, 0) + 1, sold = (available_quantity - 1 <= 0), updated_at = NOW() WHERE id = v_locked_item_id;
        END IF;

        -- Deduct from wallet
        UPDATE user_wallets
        SET available_balance = available_balance - v_wallet_deducted_amount
        WHERE user_id = p_buyer_id;

        -- Create order
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
            wallet_deducted_amount, wallet_deducted_total, paid_at, platform_fee
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
            v_wallet_deducted_amount, v_wallet_deducted_total, NOW(), p_platform_fee
        ) RETURNING id INTO v_final_order_id;

        -- Log wallet transaction
        INSERT INTO wallet_transactions (
            user_id, type, amount, reason, reference_order_id, status
        ) VALUES (
            p_buyer_id, 'debit', v_wallet_deducted_amount, 'Paid for order ' || p_order_id, v_final_order_id, 'completed'
        );

        RETURN jsonb_build_object(
            'success', true,
            'type', 'order',
            'order_id', p_order_id,
            'id', v_final_order_id,
            'status', v_order_status,
            'payment_status', v_payment_status,
            'wallet_deducted_amount', v_wallet_deducted_amount,
            'wallet_deducted_total', v_wallet_deducted_total
        );
    ELSE
        -- 3. Needs external payment -> Save as checkout INTENT instead of order
        v_intent_payload := jsonb_build_object(
            'order_id', p_order_id,
            'buyer_id', p_buyer_id,
            'seller_id', p_seller_id,
            'book_id', p_book_id,
            'item_type', p_item_type,
            'buyer_full_name', p_buyer_full_name,
            'seller_full_name', p_seller_full_name,
            'buyer_email', p_buyer_email,
            'seller_email', p_seller_email,
            'buyer_phone_number', p_buyer_phone_number,
            'seller_phone_number', p_seller_phone_number,
            'pickup_address_encrypted', p_pickup_address_encrypted,
            'shipping_address_encrypted', p_shipping_address_encrypted,
            'delivery_option', p_delivery_option,
            'pickup_type', p_pickup_type,
            'pickup_locker_data', p_pickup_locker_data,
            'pickup_locker_location_id', p_pickup_locker_location_id,
            'pickup_locker_provider_slug', p_pickup_locker_provider_slug,
            'delivery_type', p_delivery_type,
            'delivery_locker_data', p_delivery_locker_data,
            'delivery_locker_location_id', p_delivery_locker_location_id,
            'delivery_locker_provider_slug', p_delivery_locker_provider_slug,
            'delivery_data', p_delivery_data,
            'payment_reference', p_payment_reference,
            'paystack_reference', p_paystack_reference,
            'selected_courier_slug', p_selected_courier_slug,
            'selected_service_code', p_selected_service_code,
            'selected_courier_name', p_selected_courier_name,
            'selected_service_name', p_selected_service_name,
            'selected_shipping_cost', p_selected_shipping_cost,
            'status', p_status,
            'payment_status', p_payment_status,
            'amount', p_amount,
            'total_amount', p_total_amount,
            'items', p_items,
            'order_type', p_order_type,
            'use_wallet', p_use_wallet,
            'platform_fee', p_platform_fee,
            'wallet_deducted_amount', v_wallet_deducted_amount,
            'wallet_deducted_total', v_wallet_deducted_total
        );

        INSERT INTO order_intents (
            payment_reference, buyer_id, seller_id, book_id, payload, status, expires_at
        ) VALUES (
            p_payment_reference, p_buyer_id, p_seller_id, p_book_id, v_intent_payload, 'pending', NOW() + INTERVAL '1 hour'
        ) RETURNING id INTO v_intent_id;

        RETURN jsonb_build_object(
            'success', true,
            'type', 'intent',
            'intent_id', v_intent_id,
            'order_id', p_order_id,
            'payment_reference', p_payment_reference,
            'status', 'pending_payment',
            'payment_status', 'pending',
            'wallet_deducted_amount', v_wallet_deducted_amount,
            'wallet_deducted_total', v_wallet_deducted_total
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;


-- 2. Update materialize_order_from_intent to increment sold_quantity
CREATE OR REPLACE FUNCTION materialize_order_from_intent(
    p_payment_reference TEXT,
    p_paystack_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_intent RECORD;
    v_payload JSONB;
    v_locked_item_id UUID;
    v_final_order_id UUID;
    v_item_type TEXT;
    v_book_id UUID;
    v_buyer_id UUID;
    v_wallet_deducted_amount BIGINT;
BEGIN
    SET local statement_timeout = '5000'; -- 5 seconds

    -- 1. Lock the intent row using FOR UPDATE SKIP LOCKED
    SELECT * INTO v_intent
    FROM order_intents
    WHERE payment_reference = p_payment_reference
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        -- Check if it was already materialized in a concurrent thread
        SELECT materialized_order_id INTO v_final_order_id
        FROM order_intents
        WHERE payment_reference = p_payment_reference;

        IF v_final_order_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'message', 'Order already materialized',
                'order_id', v_final_order_id
            );
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Intent not found or locked by another transaction'
            );
        END IF;
    END IF;

    -- If already materialized, return success
    IF v_intent.materialized_order_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Order already materialized',
            'order_id', v_intent.materialized_order_id
        );
    END IF;

    v_payload := v_intent.payload;
    v_item_type := v_payload->>'item_type';
    v_book_id := (v_payload->>'book_id')::uuid;
    v_buyer_id := (v_payload->>'buyer_id')::uuid;
    v_wallet_deducted_amount := (v_payload->>'wallet_deducted_amount')::bigint;

    -- 2. Lock item row using SKIP LOCKED
    IF v_item_type = 'book' THEN
        SELECT id INTO v_locked_item_id FROM books WHERE id = v_book_id AND NOT sold AND available_quantity >= 1 FOR UPDATE SKIP LOCKED;
    ELSIF v_item_type = 'uniform' THEN
        SELECT id INTO v_locked_item_id FROM uniforms WHERE id = v_book_id AND NOT sold AND available_quantity >= 1 FOR UPDATE SKIP LOCKED;
    ELSIF v_item_type = 'school_supply' THEN
        SELECT id INTO v_locked_item_id FROM school_supplies WHERE id = v_book_id AND NOT sold AND available_quantity >= 1 FOR UPDATE SKIP LOCKED;
    END IF;

    IF v_locked_item_id IS NULL THEN
        -- Update intent to failed
        UPDATE order_intents SET status = 'failed', updated_at = NOW() WHERE id = v_intent.id;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Item is no longer available'
        );
    END IF;

    -- 3. Decrement inventory and increment sold_quantity to maintain constraint consistency
    IF v_item_type = 'book' THEN
        UPDATE books SET available_quantity = available_quantity - 1, sold_quantity = COALESCE(sold_quantity, 0) + 1, sold = (available_quantity - 1 <= 0), updated_at = NOW() WHERE id = v_locked_item_id;
    ELSIF v_item_type = 'uniform' THEN
        UPDATE uniforms SET available_quantity = available_quantity - 1, sold_quantity = COALESCE(sold_quantity, 0) + 1, sold = (available_quantity - 1 <= 0), updated_at = NOW() WHERE id = v_locked_item_id;
    ELSIF v_item_type = 'school_supply' THEN
        UPDATE school_supplies SET available_quantity = available_quantity - 1, sold_quantity = COALESCE(sold_quantity, 0) + 1, sold = (available_quantity - 1 <= 0), updated_at = NOW() WHERE id = v_locked_item_id;
    END IF;

    -- 4. Deduct wallet if there was a partial wallet payment
    IF v_wallet_deducted_amount > 0 THEN
        UPDATE user_wallets
        SET available_balance = available_balance - v_wallet_deducted_amount
        WHERE user_id = v_buyer_id;
    END IF;

    -- 5. Insert order row
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
        wallet_deducted_amount, wallet_deducted_total, paid_at, platform_fee
    ) VALUES (
        v_payload->>'order_id', v_buyer_id, (v_payload->>'seller_id')::uuid, v_book_id, v_book_id, v_item_type,
        v_payload->>'buyer_full_name', v_payload->>'seller_full_name', v_payload->>'buyer_email', v_payload->>'seller_email',
        v_payload->>'buyer_phone_number', v_payload->>'seller_phone_number', v_payload->>'pickup_address_encrypted',
        v_payload->>'shipping_address_encrypted', v_payload->>'delivery_option', v_payload->>'pickup_type',
        COALESCE(v_payload->'pickup_locker_data', 'null'::jsonb), v_payload->>'pickup_locker_location_id', v_payload->>'pickup_locker_provider_slug',
        v_payload->>'delivery_type', COALESCE(v_payload->'delivery_locker_data', 'null'::jsonb), v_payload->>'delivery_locker_location_id',
        v_payload->>'delivery_locker_provider_slug', COALESCE(v_payload->'delivery_data', 'null'::jsonb), p_payment_reference,
        COALESCE(p_paystack_reference, v_payload->>'paystack_reference'), v_payload->>'selected_courier_slug', v_payload->>'selected_service_code',
        v_payload->>'selected_courier_name', v_payload->>'selected_service_name', (v_payload->>'selected_shipping_cost')::numeric,
        'pending_commit', 'paid', (v_payload->>'amount')::integer, (v_payload->>'total_amount')::numeric, COALESCE(v_payload->'items', '[]'::jsonb), v_payload->>'order_type',
        CASE WHEN v_payload->>'order_type' = 'pickup' THEN 'pending_pickup' ELSE NULL END,
        v_wallet_deducted_amount, (v_payload->>'wallet_deducted_total')::numeric, NOW(), (v_payload->>'platform_fee')::numeric
    ) RETURNING id INTO v_final_order_id;

    -- Log wallet transaction if applicable
    IF v_wallet_deducted_amount > 0 THEN
        INSERT INTO wallet_transactions (
            user_id, type, amount, reason, reference_order_id, status
        ) VALUES (
            v_buyer_id, 'debit', v_wallet_deducted_amount, 'Paid for order ' || (v_payload->>'order_id'), v_final_order_id, 'completed'
        );
    END IF;

    -- 6. Update intent status
    UPDATE order_intents
    SET status = 'materialized',
        materialized_order_id = v_final_order_id,
        updated_at = NOW()
    WHERE id = v_intent.id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_final_order_id,
        'message', 'Order materialized successfully'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
