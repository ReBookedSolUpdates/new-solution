-- Create function to get the payout rate for a seller (90 for standard/free, 93.5 for Tier 1 business)
CREATE OR REPLACE FUNCTION get_seller_payout_rate(p_seller_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_is_business BOOLEAN := FALSE;
    v_sub_tier TEXT := 'free';
END;
$$; -- Placeholder to allow dropping/recreating safely

DROP FUNCTION IF EXISTS get_seller_payout_rate(p_seller_id UUID) CASCADE;

CREATE OR REPLACE FUNCTION get_seller_payout_rate(p_seller_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_is_business BOOLEAN := FALSE;
    v_sub_tier TEXT := 'free';
BEGIN
    -- Check if seller is a business account and get subscription tier
    SELECT COALESCE(is_business, FALSE), COALESCE(subscription_tier::TEXT, 'free')
    INTO v_is_business, v_sub_tier
    FROM profiles
    WHERE id = p_seller_id;

    IF v_is_business THEN
        IF v_sub_tier = 'tier1' THEN
            RETURN 93.5; -- 93.5% payout (6.5% commission)
        ELSE
            RETURN 90.0; -- 90.0% payout (10% commission)
        END IF;
    END IF;

    RETURN 90.0; -- 90.0% payout (10% commission)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update wallet crediting function to use dynamic numeric payout rate
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
    v_payout_rate NUMERIC;
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

    -- Calculate payout based on the rate (rounding to nearest integer cents)
    v_amount_to_credit := ROUND((p_book_price::NUMERIC * v_payout_rate) / 100)::BIGINT;

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

-- Add auto-responder column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_responder_message TEXT;

-- Create auto-responder trigger function
CREATE OR REPLACE FUNCTION public.handle_auto_responder()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
    v_buyer_id UUID;
    v_receiver_id UUID;
    v_is_business BOOLEAN := FALSE;
    v_sub_tier TEXT := 'free';
    v_auto_msg TEXT;
BEGIN
    -- Get conversation participants
    SELECT seller_id, buyer_id
    INTO v_seller_id, v_buyer_id
    FROM public.conversations
    WHERE id = NEW.conversation_id;

    -- Determine the receiver
    IF NEW.sender_id = v_buyer_id THEN
        v_receiver_id := v_seller_id;
    ELSE
        v_receiver_id := v_buyer_id;
    END IF;

    -- Check if receiver is a business, is Tier 1, and has auto-responder set
    SELECT COALESCE(is_business, FALSE), COALESCE(subscription_tier::TEXT, 'free'), auto_responder_message
    INTO v_is_business, v_sub_tier, v_auto_msg
    FROM public.profiles
    WHERE id = v_receiver_id;

    -- Only auto-reply if the receiver is a Tier 1 business and has an auto-responder message
    -- AND we are not in an infinite loop (the sender of the current message is not the business itself)
    IF v_is_business AND v_sub_tier = 'tier1' AND v_auto_msg IS NOT NULL AND TRIM(v_auto_msg) <> '' AND NEW.sender_id <> v_receiver_id THEN
        -- Check if the business has already auto-responded recently (e.g., in the last 1 minute) to avoid spamming
        IF NOT EXISTS (
            SELECT 1 FROM public.messages
            WHERE conversation_id = NEW.conversation_id
              AND sender_id = v_receiver_id
              AND created_at > NOW() - INTERVAL '1 minute'
        ) THEN
            INSERT INTO public.messages (conversation_id, sender_id, content)
            VALUES (NEW.conversation_id, v_receiver_id, v_auto_msg);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on messages insertion
DROP TRIGGER IF EXISTS trigger_auto_responder ON public.messages;
CREATE TRIGGER trigger_auto_responder
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_auto_responder();
