-- Create function to get the payout rate for a seller (90 for standard, 93 for qualifying business)
CREATE OR REPLACE FUNCTION get_seller_payout_rate(p_seller_id UUID)
RETURNS INT AS $$
DECLARE
    v_is_business BOOLEAN := FALSE;
    v_listings_count INT := 0;
BEGIN
    -- Check if seller is a business account
    SELECT COALESCE(is_business, FALSE) INTO v_is_business
    FROM profiles
    WHERE id = p_seller_id;

    IF v_is_business THEN
        -- Count distinct listings
        SELECT COUNT(*) INTO v_listings_count
        FROM books
        WHERE seller_id = p_seller_id;

        IF v_listings_count >= 30 THEN
            RETURN 93; -- 93% payout (7% commission)
        END IF;
    END IF;

    RETURN 90; -- 90% payout (10% commission)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update wallet crediting function to use dynamic payout rate
CREATE OR REPLACE FUNCTION credit_wallet_on_collection(
    p_seller_id UUID,
    p_order_id UUID,
    p_book_price BIGINT
)
RETURNS TABLE (
    success BOOLEAN,
    credit_amount BIGINT,
    new_balance BIGINT,
    error_message TEXT
) AS $$
DECLARE
    v_amount_to_credit BIGINT;
    v_new_balance BIGINT;
    v_payout_rate INT;
BEGIN
    -- Validate inputs
    IF p_seller_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, 0::BIGINT, 'seller_id is required'::TEXT;
        RETURN;
    END IF;

    IF p_book_price IS NULL OR p_book_price <= 0 THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, 0::BIGINT, 'book_price must be greater than 0'::TEXT;
        RETURN;
    END IF;

    -- Get dynamic payout rate
    v_payout_rate := get_seller_payout_rate(p_seller_id);

    -- Calculate payout based on the rate
    v_amount_to_credit := (p_book_price * v_payout_rate) / 100;

    -- Check if seller exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_seller_id) THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, 0::BIGINT, 'seller_id does not exist'::TEXT;
        RETURN;
    END IF;

    -- Ensure wallet exists or create it
    INSERT INTO user_wallets (user_id, available_balance, total_earned)
    VALUES (p_seller_id, v_amount_to_credit, v_amount_to_credit)
    ON CONFLICT (user_id) DO UPDATE
    SET available_balance = user_wallets.available_balance + v_amount_to_credit,
        total_earned = user_wallets.total_earned + v_amount_to_credit;

    -- Get the new balance
    SELECT available_balance INTO v_new_balance
    FROM user_wallets
    WHERE user_id = p_seller_id;

    -- Log transaction
    INSERT INTO wallet_transactions (
        user_id, type, amount, reason, reference_order_id, status
    ) VALUES (
        p_seller_id, 'credit', v_amount_to_credit, 'Book received', p_order_id, 'completed'
    );

    RETURN QUERY SELECT TRUE, v_amount_to_credit, v_new_balance, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 0::BIGINT, 0::BIGINT, 'Database error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;
