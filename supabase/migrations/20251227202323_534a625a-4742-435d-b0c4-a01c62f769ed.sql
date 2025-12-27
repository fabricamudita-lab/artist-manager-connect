-- Add expense_budget field to budgets table for planned expenses (flights, hotels, etc.)
ALTER TABLE public.budgets 
ADD COLUMN expense_budget numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.budgets.expense_budget IS 'Presupuesto de gastos planificados (vuelos, hoteles, dietas, etc.)';