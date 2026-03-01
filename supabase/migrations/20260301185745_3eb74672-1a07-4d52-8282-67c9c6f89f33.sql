
SELECT cron.schedule(
  'auto-booking-transitions',
  '5 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hptjzbaiclmgbvxlmllo.supabase.co/functions/v1/auto-booking-transitions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwdGp6YmFpY2xtZ2J2eGxtbGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNzQ1NjksImV4cCI6MjA2OTc1MDU2OX0.kUMKL4MrXFa2qSMjAQtsQP_EZalaTUAdE7WP6j33bb0"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
