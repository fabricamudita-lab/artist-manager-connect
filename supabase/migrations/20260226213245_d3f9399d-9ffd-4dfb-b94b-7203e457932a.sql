
-- Enable required extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the evaluate-automations edge function every 6 hours
SELECT cron.schedule(
  'evaluate-automations-6h',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://hptjzbaiclmgbvxlmllo.supabase.co/functions/v1/evaluate-automations',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwdGp6YmFpY2xtZ2J2eGxtbGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNzQ1NjksImV4cCI6MjA2OTc1MDU2OX0.kUMKL4MrXFa2qSMjAQtsQP_EZalaTUAdE7WP6j33bb0"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
