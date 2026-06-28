-- Migration: Optimize Function Security Context
-- Changes appropriate SECURITY DEFINER functions to SECURITY INVOKER to align with security best practices and clear warnings.

-- 1. get_seller_average_rating
CREATE OR REPLACE FUNCTION public.get_seller_average_rating(p_seller_id uuid)
 RETURNS TABLE(average_rating numeric, review_count bigint)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT 
    ROUND(AVG(rating)::numeric, 1) as average_rating,
    COUNT(*)::bigint as review_count
  FROM public.seller_reviews
  WHERE seller_id = p_seller_id;
$function$;

-- 2. validate_coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_subtotal numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_coupon RECORD;
  v_discount_amount DECIMAL;
BEGIN
  -- Fetch coupon (case-insensitive)
  SELECT * INTO v_coupon FROM public.coupons 
  WHERE UPPER(code) = UPPER(TRIM(p_code));
  
  -- Check if coupon exists
  IF v_coupon IS NULL THEN
    RETURN json_build_object(
      'error', 'Coupon code not found',
      'isValid', false
    );
  END IF;
  
  -- Check if active
  IF NOT v_coupon.is_active THEN
    RETURN json_build_object(
      'error', 'This coupon is no longer active',
      'isValid', false
    );
  END IF;
  
  -- Check if expired
  IF CURRENT_TIMESTAMP > v_coupon.valid_until THEN
    RETURN json_build_object(
      'error', 'This coupon has expired',
      'isValid', false
    );
  END IF;
  
  -- Check if not yet valid
  IF CURRENT_TIMESTAMP < v_coupon.valid_from THEN
    RETURN json_build_object(
      'error', 'This coupon is not yet valid',
      'isValid', false
    );
  END IF;
  
  -- Check usage limit (using usage_count, NOT redemption_count)
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.usage_count >= v_coupon.max_uses THEN
    RETURN json_build_object(
      'error', 'This coupon has reached its usage limit',
      'isValid', false
    );
  END IF;
  
  -- Check minimum order amount
  IF v_coupon.min_order_amount IS NOT NULL AND p_subtotal < v_coupon.min_order_amount THEN
    RETURN json_build_object(
      'error', 'Minimum order amount of R' || v_coupon.min_order_amount || ' required',
      'isValid', false
    );
  END IF;
  
  -- Calculate discount
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount_amount := (p_subtotal * v_coupon.discount_value) / 100;
    IF v_coupon.max_discount_amount IS NOT NULL THEN
      v_discount_amount := LEAST(v_discount_amount, v_coupon.max_discount_amount);
    END IF;
  ELSE
    v_discount_amount := v_coupon.discount_value;
  END IF;
  
  RETURN json_build_object(
    'isValid', true,
    'coupon', json_build_object(
      'id', v_coupon.id,
      'code', v_coupon.code,
      'discount_type', v_coupon.discount_type,
      'discount_value', v_coupon.discount_value,
      'description', v_coupon.description,
      'max_uses', v_coupon.max_uses,
      'usage_count', v_coupon.usage_count,
      'min_order_amount', v_coupon.min_order_amount,
      'max_discount_amount', v_coupon.max_discount_amount,
      'valid_from', v_coupon.valid_from,
      'valid_until', v_coupon.valid_until,
      'is_active', v_coupon.is_active
    ),
    'discountAmount', v_discount_amount
  );
END;
$function$;

-- 3. get_wallet_summary
CREATE OR REPLACE FUNCTION public.get_wallet_summary(p_user_id uuid)
 RETURNS TABLE(available_balance bigint, pending_balance bigint, total_earned bigint, total_withdrawn bigint)
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        uw.available_balance,
        uw.pending_balance,
        uw.total_earned,
        COALESCE(SUM(pr.amount) FILTER (WHERE pr.status IN ('approved', 'paid')), 0)::BIGINT
    FROM user_wallets uw
    LEFT JOIN payout_requests pr ON uw.user_id = pr.user_id
    WHERE uw.user_id = p_user_id
    GROUP BY uw.id, uw.available_balance, uw.pending_balance, uw.total_earned;
END;
$function$;

-- 4. has_completed_order_from_seller
CREATE OR REPLACE FUNCTION public.has_completed_order_from_seller(p_buyer_id uuid, p_seller_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.seller_id = p_seller_id
        AND (o.status = 'paid' OR o.status = 'completed')
        AND o.buyer_email = (SELECT email FROM public.profiles WHERE id = p_buyer_id LIMIT 1)
    );
END;
$function$;

-- 5. is_admin
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY INVOKER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = uid AND is_admin = true)
$function$;

-- 6. is_current_user_admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT COALESCE(
    (SELECT true FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'),
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$function$;
