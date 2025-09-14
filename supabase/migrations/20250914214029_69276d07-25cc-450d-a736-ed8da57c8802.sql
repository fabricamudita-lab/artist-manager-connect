-- Create budget categories table
CREATE TABLE public.budget_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon_name TEXT NOT NULL DEFAULT 'DollarSign',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, created_by)
);

-- Enable RLS
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for budget categories
CREATE POLICY "Users can create budget categories" 
ON public.budget_categories 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view budget categories" 
ON public.budget_categories 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can update budget categories" 
ON public.budget_categories 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete budget categories" 
ON public.budget_categories 
FOR DELETE 
USING (auth.uid() = created_by);

-- Add foreign key to budget_items table
ALTER TABLE public.budget_items 
ADD COLUMN category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_budget_items_category_id ON public.budget_items(category_id);
CREATE INDEX idx_budget_categories_created_by ON public.budget_categories(created_by);

-- Insert default categories for existing users
INSERT INTO public.budget_categories (name, icon_name, created_by)
SELECT 'Promoción', 'Music', auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT (name, created_by) DO NOTHING;

INSERT INTO public.budget_categories (name, icon_name, created_by)
SELECT 'Comisiones', 'Calculator', auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT (name, created_by) DO NOTHING;

INSERT INTO public.budget_categories (name, icon_name, created_by)
SELECT 'Otros Gastos', 'DollarSign', auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT (name, created_by) DO NOTHING;

-- Create trigger to update updated_at column
CREATE TRIGGER update_budget_categories_updated_at
BEFORE UPDATE ON public.budget_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();