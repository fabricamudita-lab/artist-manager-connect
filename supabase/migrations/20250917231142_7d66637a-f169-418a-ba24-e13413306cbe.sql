-- Add fecha_emision column to budget_items table
ALTER TABLE public.budget_items 
ADD COLUMN fecha_emision date;