-- 1. Add email_preferences, inactive_reminders_sent, last_active_at to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_preferences jsonb DEFAULT '{"wishlist_alerts": true, "inactive_reminders": true, "security_alerts": true, "order_updates": true}'::jsonb,
ADD COLUMN IF NOT EXISTS inactive_reminders_sent text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now();

-- 2. Add dispute columns to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS disputed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS dispute_reason text,
ADD COLUMN IF NOT EXISTS dispute_status text DEFAULT 'none', -- 'none', 'open', 'resolved'
ADD COLUMN IF NOT EXISTS dispute_resolved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS dispute_resolution text;

-- 3. Create profile change audit history
CREATE TABLE IF NOT EXISTS public.profile_change_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    changes jsonb NOT NULL, -- e.g., {"email": ["old@a.com", "new@a.com"]}
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on profile_change_history
ALTER TABLE public.profile_change_history ENABLE ROW LEVEL SECURITY;

-- Create policies for profile_change_history
CREATE POLICY "Users can view their own change history" ON public.profile_change_history
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "System can insert change history" ON public.profile_change_history
    FOR INSERT WITH CHECK (true);

-- 4. Trigger to track profile changes for security alerts
CREATE OR REPLACE FUNCTION public.track_profile_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes_json jsonb := '{}'::jsonb;
    has_changes boolean := false;
BEGIN
    -- Check email
    IF COALESCE(OLD.email, '') <> COALESCE(NEW.email, '') THEN
        changes_json := jsonb_set(changes_json, '{email}', jsonb_build_array(OLD.email, NEW.email));
        has_changes := true;
    END IF;

    -- Check phone number
    IF COALESCE(OLD.phone_number, '') <> COALESCE(NEW.phone_number, '') THEN
        changes_json := jsonb_set(changes_json, '{phone_number}', jsonb_build_array(OLD.phone_number, NEW.phone_number));
        has_changes := true;
    END IF;

    -- Check full name
    IF COALESCE(OLD.full_name, '') <> COALESCE(NEW.full_name, '') THEN
        changes_json := jsonb_set(changes_json, '{full_name}', jsonb_build_array(OLD.full_name, NEW.full_name));
        has_changes := true;
    END IF;

    -- Check shipping address
    IF COALESCE(OLD.shipping_address_encrypted, '') <> COALESCE(NEW.shipping_address_encrypted, '') THEN
        changes_json := jsonb_set(changes_json, '{shipping_address}', jsonb_build_array('Updated', 'Updated'));
        has_changes := true;
    END IF;

    -- Check pickup address
    IF COALESCE(OLD.pickup_address_encrypted, '') <> COALESCE(NEW.pickup_address_encrypted, '') THEN
        changes_json := jsonb_set(changes_json, '{pickup_address}', jsonb_build_array('Updated', 'Updated'));
        has_changes := true;
    END IF;

    -- If there are changes, insert history
    IF has_changes THEN
        INSERT INTO public.profile_change_history (profile_id, changed_by, changes)
        VALUES (NEW.id, auth.uid(), changes_json);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_track_profile_changes
    AFTER UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.track_profile_changes();

-- 5. Trigger to automatically update last_active_at from activity logs
CREATE OR REPLACE FUNCTION public.update_profile_last_active()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NOT NULL THEN
        UPDATE public.profiles
        SET last_active_at = NEW.created_at
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_update_profile_last_active
    AFTER INSERT ON public.activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_profile_last_active();
