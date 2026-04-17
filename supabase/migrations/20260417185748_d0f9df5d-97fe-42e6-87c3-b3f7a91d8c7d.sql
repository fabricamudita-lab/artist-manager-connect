ALTER TABLE public.projects
ADD COLUMN card_display_config jsonb NOT NULL DEFAULT '{
  "show_releases": true,
  "show_budgets": true,
  "show_events": true,
  "show_dates": true,
  "show_epk": true,
  "show_description": false
}'::jsonb;