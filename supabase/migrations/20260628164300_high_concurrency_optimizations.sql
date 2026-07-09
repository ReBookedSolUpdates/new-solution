-- Migration: High Concurrency Optimizations for Orders, Commits, and Purchases
-- Created: 2026-06-28

-- 1. Create a partial unique index on orders.payment_reference to enforce database-level idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_reference_unique 
ON public.orders (payment_reference) 
WHERE payment_reference IS NOT NULL;

-- 2. Create/Update atomic order creation with wallet deduction, SKIP LOCKED, and statement timeout
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
    p_platform_fee NUMERIC
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
BEGIN
    -- Set a strict local statement timeout to prevent pool starvation
    SET local statement_timeout = '5000'; -- 5 seconds

    -- 1. Try to lock the inventory item immediately using FOR UPDATE SKIP LOCKED
    IF p_item_type = 'book' THEN
        SELECT id INTO v_locked_item_id
        FROM books
        WHERE id = p_book_id AND NOT sold AND available_quantity >= 1
        FOR UPDATE SKIP LOCKED;
    ELSIF p_item_type = 'uniform' THEN
        SELECT id INTO v_locked_item_id
        FROM uniforms
        WHERE id = p_book_id AND NOT sold AND available_quantity >= 1
        FOR UPDATE SKIP LOCKED;
    ELSIF p_item_type = 'school_supply' THEN
        SELECT id INTO v_locked_item_id
        FROM school_supplies
        WHERE id = p_book_id AND NOT sold AND available_quantity >= 1
        FOR UPDATE SKIP LOCKED;
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid item type'
        );
    END IF;

    -- If no row could be locked (already sold, quantity is 0, or locked by another transaction), fail instantly
    IF v_locked_item_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Item is no longer available or is currently being purchased by another user.'
        );
    END IF;

    -- 1b. Decrement inventory / mark sold, still holding the lock to ensure atomicity
    IF p_item_type = 'book' THEN
        UPDATE books 
        SET available_quantity = available_quantity - 1,
            sold = (available_quantity - 1 <= 0),
            updated_at = NOW()
        WHERE id = v_locked_item_id;
    ELSIF p_item_type = 'uniform' THEN
        UPDATE uniforms 
        SET available_quantity = available_quantity - 1,
            sold = (available_quantity - 1 <= 0),
            updated_at = NOW()
        WHERE id = v_locked_item_id;
    ELSIF p_item_type = 'school_supply' THEN
        UPDATE school_supplies 
        SET available_quantity = available_quantity - 1,
            sold = (available_quantity - 1 <= 0),
            updated_at = NOW()
        WHERE id = v_locked_item_id;
    END IF;

    -- 2. If using wallet, check balance
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

    -- 3. Deduct from wallet if applicable
    IF v_wallet_deducted_amount > 0 THEN
        UPDATE user_wallets
        SET available_balance = available_balance - v_wallet_deducted_amount
        WHERE user_id = p_buyer_id;
    END IF;

    -- 4. Insert order (will fail and catch duplicate key if idempotency violation occurs)
    BEGIN
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
            v_wallet_deducted_amount, v_wallet_deducted_total, CASE WHEN v_payment_status = 'paid' THEN NOW() ELSE NULL END,
            p_platform_fee
        ) RETURNING id INTO v_final_order_id;
    EXCEPTION WHEN unique_violation THEN
        -- Catch unique constraint on payment_reference to enforce idempotency
        -- Return details of the existing order
        SELECT id, status, payment_status INTO v_final_order_id, v_order_status, v_payment_status
        FROM orders
        WHERE payment_reference = p_payment_reference
        LIMIT 1;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Order already exists',
            'order_id', p_order_id,
            'id', v_final_order_id,
            'status', v_order_status,
            'payment_status', v_payment_status,
            'wallet_deducted_amount', 0,
            'wallet_deducted_total', 0
        );
    END;

    -- 5. Log wallet transaction if applicable
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

-- 3. Dedicated lock function for order commitments (SKIP LOCKED)
CREATE OR REPLACE FUNCTION lock_order_for_commitment(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
BEGIN
    SET local statement_timeout = '5000'; -- 5 seconds

    -- Attempt to lock the order using SKIP LOCKED
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id AND status IN ('paid', 'pending', 'pending_commit')
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order is no longer available to commit (it may already be committed or locked by another transaction)'
        );
    END IF;

    -- Update order status to committed inside the lock block
    UPDATE orders 
    SET status = 'committed', 
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order', row_to_json(v_order)
    );
END;
$$;

-- 4. Atomic decline and restore inventory function (SKIP LOCKED)
CREATE OR REPLACE FUNCTION decline_order_and_restore_inventory(
    p_order_id UUID,
    p_seller_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_item_table TEXT;
    v_book_id UUID;
    v_locked_item_id UUID;
BEGIN
    SET local statement_timeout = '5000'; -- 5 seconds

    -- 1. Lock and retrieve order using FOR UPDATE SKIP LOCKED
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id AND seller_id = p_seller_id AND status IN ('pending', 'pending_commit')
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found, not authorized, or already processed'
        );
    END IF;

    -- 2. Update order status to declined
    UPDATE orders
    SET status = 'declined',
        declined_at = NOW(),
        decline_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- 3. Resolve item and table
    v_book_id := v_order.book_id;
    v_item_table := CASE v_order.item_type
        WHEN 'book' THEN 'books'
        WHEN 'uniform' THEN 'uniforms'
        WHEN 'school_supply' THEN 'school_supplies'
        ELSE NULL
    END;

    -- 4. Lock item and restore availability
    IF v_item_table IS NOT NULL AND v_book_id IS NOT NULL THEN
        -- Lock row using SKIP LOCKED
        EXECUTE format('SELECT id FROM %I WHERE id = $1 FOR UPDATE SKIP LOCKED', v_item_table)
        INTO v_locked_item_id
        USING v_book_id;

        IF v_locked_item_id IS NOT NULL THEN
            -- Restore item quantities
            EXECUTE format('
                UPDATE %I 
                SET sold_quantity = GREATEST(0, COALESCE(sold_quantity, 0) - 1),
                    available_quantity = COALESCE(available_quantity, 0) + 1,
                    sold = false,
                    updated_at = NOW()
                WHERE id = $1
            ', v_item_table)
            USING v_book_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order', row_to_json(v_order)
    );
END;
$$;

-- 5. Atomic single book purchase function (SKIP LOCKED)
CREATE OR REPLACE FUNCTION process_book_purchase_atomic(
    p_book_id UUID,
    p_buyer_id UUID,
    p_seller_id UUID,
    p_amount NUMERIC,
    p_payment_reference TEXT,
    p_buyer_email TEXT,
    p_shipping_address JSONB,
    p_item_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_locked_item_id UUID;
    v_item_table TEXT;
    v_order_id UUID;
    v_item_title TEXT;
    v_item_author TEXT;
    v_item_price NUMERIC;
    v_item_condition TEXT;
    v_order RECORD;
BEGIN
    SET local statement_timeout = '5000'; -- 5 seconds

    -- 1. Resolve table name
    v_item_table := CASE p_item_type
        WHEN 'book' THEN 'books'
        WHEN 'uniform' THEN 'uniforms'
        WHEN 'school_supply' THEN 'school_supplies'
        ELSE NULL
    END;

    IF v_item_table IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid item type');
    END IF;

    -- 2. Lock item using FOR UPDATE SKIP LOCKED
    EXECUTE format('
        SELECT id, COALESCE(title, name), COALESCE(author, category), price, condition 
        FROM %I 
        WHERE id = $1 AND NOT sold 
        FOR UPDATE SKIP LOCKED
    ', v_item_table)
    INTO v_locked_item_id, v_item_title, v_item_author, v_item_price, v_item_condition
    USING p_book_id;

    IF v_locked_item_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Item is no longer available or is locked by another transaction'
        );
    END IF;

    -- 3. Mark item as sold
    EXECUTE format('
        UPDATE %I 
        SET sold = true, 
            updated_at = NOW() 
        WHERE id = $1
    ', v_item_table)
    USING p_book_id;

    -- 4. Insert order
    INSERT INTO orders (
        buyer_id, buyer_email, seller_id, items, amount, total_amount,
        status, payment_status, payment_reference, shipping_address,
        commit_deadline, paid_at, created_at, metadata, book_id, item_id, item_type
    ) VALUES (
        p_buyer_id, p_buyer_email, p_seller_id, 
        jsonb_build_array(jsonb_build_object(
            'id', p_book_id,
            'title', v_item_title,
            'reference', v_item_author,
            'price', p_amount,
            'condition', v_item_condition,
            'seller_id', p_seller_id,
            'category', v_item_table
        )),
        ROUND(p_amount * 100)::integer, p_amount,
        'pending_commit', 'paid', p_payment_reference, p_shipping_address,
        NOW() + INTERVAL '48 hours', NOW(), NOW(),
        jsonb_build_object('created_from', 'single_book_purchase', 'item_count', 1, 'book_id', p_book_id),
        p_book_id, p_book_id, p_item_type
    ) RETURNING id INTO v_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'item_title', v_item_title,
        'item_reference', v_item_author
    );
EXCEPTION WHEN unique_violation THEN
    -- Handle unique constraint on payment_reference (idempotency)
    SELECT id INTO v_order_id FROM orders WHERE payment_reference = p_payment_reference LIMIT 1;
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Order already exists',
        'order_id', v_order_id
    );
WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
