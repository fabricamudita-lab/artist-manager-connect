-- Add date, time and fee fields to budgets table
ALTER TABLE public.budgets 
ADD COLUMN event_date DATE,
ADD COLUMN event_time TIME,
ADD COLUMN fee NUMERIC DEFAULT 0;

-- Add index for better performance when ordering by date
CREATE INDEX idx_budgets_event_date ON public.budgets(event_date);
CREATE INDEX idx_budgets_name ON public.budgets(name);