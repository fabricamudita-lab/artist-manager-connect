-- Crear tabla de plantillas de presupuesto
CREATE TABLE public.budget_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.budget_templates ENABLE ROW LEVEL SECURITY;

-- Crear políticas para plantillas
CREATE POLICY "Users can view budget templates" 
ON public.budget_templates 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create budget templates" 
ON public.budget_templates 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can update budget templates" 
ON public.budget_templates 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can delete budget templates" 
ON public.budget_templates 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Crear tabla de elementos de plantilla
CREATE TABLE public.budget_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  unit_price NUMERIC DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  iva_percentage NUMERIC DEFAULT 21,
  is_attendee BOOLEAN DEFAULT false,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.budget_template_items ENABLE ROW LEVEL SECURITY;

-- Crear políticas
CREATE POLICY "Users can view budget template items" 
ON public.budget_template_items 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create budget template items" 
ON public.budget_template_items 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can update budget template items" 
ON public.budget_template_items 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can delete budget template items" 
ON public.budget_template_items 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Agregar foreign key
ALTER TABLE public.budget_template_items
ADD CONSTRAINT budget_template_items_template_id_fkey
FOREIGN KEY (template_id) REFERENCES public.budget_templates(id) ON DELETE CASCADE;

-- Agregar foreign key para created_by
ALTER TABLE public.budget_templates
ADD CONSTRAINT budget_templates_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

-- Agregar campo template_id a budgets (opcional)
ALTER TABLE public.budgets 
ADD COLUMN template_id UUID;

-- Agregar foreign key para template_id
ALTER TABLE public.budgets
ADD CONSTRAINT budgets_template_id_fkey
FOREIGN KEY (template_id) REFERENCES public.budget_templates(id);

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_budget_templates_updated_at
BEFORE UPDATE ON public.budget_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();