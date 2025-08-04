-- Crear enum para tipos de presupuesto
CREATE TYPE budget_type AS ENUM (
  'concierto',
  'produccion_musical',
  'campana_promocional', 
  'videoclip',
  'otros'
);

-- Crear enum para estados de presupuesto
CREATE TYPE budget_status AS ENUM (
  'nacional',
  'internacional'
);

-- Crear enum para estados de show
CREATE TYPE show_status AS ENUM (
  'confirmado',
  'pendiente',
  'cancelado'
);

-- Crear enum para estados de facturación
CREATE TYPE billing_status AS ENUM (
  'pendiente',
  'pagado',
  'facturado',
  'cancelado'
);

-- Tabla principal de presupuestos
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  artist_id UUID,
  name TEXT NOT NULL,
  type budget_type NOT NULL,
  city TEXT,
  country TEXT,
  venue TEXT,
  budget_status budget_status,
  show_status show_status,
  internal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para elementos de presupuesto
CREATE TABLE public.budget_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'equipo_artistico', 'equipo_tecnico', 'transporte', etc.
  subcategory TEXT, -- 'artista', 'banda_01', 'avion', etc.
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2) DEFAULT 0,
  iva_percentage NUMERIC(5,2) DEFAULT 21,
  is_attendee BOOLEAN DEFAULT false,
  billing_status billing_status DEFAULT 'pendiente',
  invoice_link TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para archivos adjuntos
CREATE TABLE public.budget_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas para budgets
CREATE POLICY "Users can view budgets" 
ON public.budgets 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create budgets" 
ON public.budgets 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can update budgets" 
ON public.budgets 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can delete budgets" 
ON public.budgets 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Políticas para budget_items
CREATE POLICY "Users can view budget items" 
ON public.budget_items 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create budget items" 
ON public.budget_items 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can update budget items" 
ON public.budget_items 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can delete budget items" 
ON public.budget_items 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Políticas para budget_attachments
CREATE POLICY "Users can view budget attachments" 
ON public.budget_attachments 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create budget attachments" 
ON public.budget_attachments 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can delete budget attachments" 
ON public.budget_attachments 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Triggers para actualizar updated_at
CREATE TRIGGER update_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_items_updated_at
BEFORE UPDATE ON public.budget_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();