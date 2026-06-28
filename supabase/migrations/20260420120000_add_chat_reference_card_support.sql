-- Add support for system-generated chat reference cards
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reference_card jsonb;

-- Ensure new columns can be used safely in RLS policies if needed.
-- No policy changes are added here; if your project has strict row-level security,
-- update policies to permit inserting/updating these columns for authorized users.
