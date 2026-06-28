
-- Unschedule any prior job to avoid duplicates
DO $$ BEGIN
  PERFORM cron.unschedule('check-expired-orders-10min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'check-expired-orders-10min',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kbpjqzaqbqukutflwixf.supabase.co/functions/v1/check-expired-orders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGpxemFxYnF1a3V0Zmx3aXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1NjMzNzcsImV4cCI6MjA2MzEzOTM3N30.3EdAkGlyFv1JRaRw9OFMyA5AkkKoXp0hdX1bFWpLVMc"}'::jsonb,
    body := jsonb_build_object('time', now())
  ) AS request_id;
  $$
);
