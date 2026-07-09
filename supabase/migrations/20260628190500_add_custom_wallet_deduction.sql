-- Migration: Add custom wallet deduction amount support
-- Created: 2026-06-28

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

        -- Decrement inventory
        IF p_item_type = 'book' THEN
            UPDATE books SET available_quantity = available_quantity - 1, sold = (available_quantity - 1 <= 0), updated_at = NOW() WHERE id = v_locked_item_id;
        ELSIF p_item_type = 'uniform' THEN
            UPDATE uniforms SET available_quantity = available_quantity - 1, sold = (available_quantity - 1 <= 0), updated_at = NOW() WHERE id = v_locked_item_id;
        ELSIF p_item_type = 'school_supply' THEN
            UPDATE school_supplies SET available_quantity = available_quantity - 1, sold = (available_quantity - 1 <= 0), updated_at = NOW() WHERE id = v_locked_item_id;
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
