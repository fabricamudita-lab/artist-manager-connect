-- =============================================================
-- ARCHITECTURAL REFACTOR: PHASE 3 - TRANSACTIONS TABLE (Finanzas P&L)
-- =============================================================

-- 1. Create transaction_type enum
CREATE TYPE public.transaction_type AS ENUM (
  'income',
  'expense',
  'transfer',
  'refund'
);

-- 2. Create transaction_status enum
CREATE TYPE public.transaction_status AS ENUM (
  'pending',
  'confirmed',
  'invoiced',
  'paid',
  'cancelled'
);

-- 3. Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Core fields
  transaction_type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  
  -- Relationships
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.booking_offers(id) ON DELETE SET NULL,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
  budget_item_id UUID REFERENCES public.budget_items(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL, -- Vendor/Client
  
  -- Financial data
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  iva_percentage NUMERIC DEFAULT 0,
  irpf_percentage NUMERIC DEFAULT 0,
  net_amount NUMERIC, -- Calculated: amount after taxes
  
  -- Details
  description TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  
  -- Invoice tracking
  invoice_number TEXT,
  invoice_url TEXT,
  invoice_date DATE,
  payment_date DATE,
  due_date DATE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create indexes
CREATE INDEX idx_transactions_artist ON public.transactions(artist_id);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_booking ON public.transactions(booking_id);
CREATE INDEX idx_transactions_budget ON public.transactions(budget_id);
CREATE INDEX idx_transactions_project ON public.transactions(project_id);
CREATE INDEX idx_transactions_date ON public.transactions(created_at);

-- 5. Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Users can view transactions"
ON public.transactions FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update transactions"
ON public.transactions FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete transactions"
ON public.transactions FOR DELETE
USING (auth.role() = 'authenticated');

-- 7. Trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Function to calculate net amount
CREATE OR REPLACE FUNCTION public.calculate_transaction_net_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate net amount: amount + IVA - IRPF
  NEW.net_amount := NEW.amount + (NEW.amount * COALESCE(NEW.iva_percentage, 0) / 100) - (NEW.amount * COALESCE(NEW.irpf_percentage, 0) / 100);
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_net_amount_trigger
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.calculate_transaction_net_amount();

-- 9. Function to sync budget_items to transactions
CREATE OR REPLACE FUNCTION public.sync_budget_item_to_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget RECORD;
  v_transaction_id UUID;
BEGIN
  -- Get budget info for artist_id and project_id
  SELECT b.*, b.artist_id, b.project_id INTO v_budget
  FROM public.budgets b
  WHERE b.id = NEW.budget_id;

  -- Only sync if billing_status is 'pagado' (paid)
  IF NEW.billing_status = 'pagado' THEN
    -- Check if transaction already exists
    SELECT id INTO v_transaction_id
    FROM public.transactions
    WHERE budget_item_id = NEW.id;

    IF v_transaction_id IS NULL THEN
      -- Create new transaction
      INSERT INTO public.transactions (
        transaction_type,
        status,
        artist_id,
        project_id,
        budget_id,
        budget_item_id,
        contact_id,
        amount,
        iva_percentage,
        irpf_percentage,
        description,
        category,
        subcategory,
        invoice_date,
        created_by
      )
      VALUES (
        'expense',
        'paid',
        (SELECT p.id FROM profiles p WHERE p.user_id = v_budget.artist_id LIMIT 1),
        v_budget.project_id,
        NEW.budget_id,
        NEW.id,
        NEW.contact_id,
        COALESCE(NEW.unit_price, 0) * COALESCE(NEW.quantity, 1),
        COALESCE(NEW.iva_percentage, 0),
        COALESCE(NEW.irpf_percentage, 0),
        NEW.name,
        NEW.category,
        NEW.subcategory,
        NEW.fecha_emision,
        auth.uid()
      );
    ELSE
      -- Update existing transaction
      UPDATE public.transactions
      SET
        amount = COALESCE(NEW.unit_price, 0) * COALESCE(NEW.quantity, 1),
        iva_percentage = COALESCE(NEW.iva_percentage, 0),
        irpf_percentage = COALESCE(NEW.irpf_percentage, 0),
        description = NEW.name,
        category = NEW.category,
        invoice_date = NEW.fecha_emision,
        status = 'paid',
        updated_at = now()
      WHERE id = v_transaction_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 10. View for P&L calculation
CREATE OR REPLACE VIEW public.profit_and_loss AS
SELECT 
  t.artist_id,
  t.project_id,
  t.booking_id,
  DATE_TRUNC('month', t.created_at) as period,
  SUM(CASE WHEN t.transaction_type = 'income' THEN t.net_amount ELSE 0 END) as total_income,
  SUM(CASE WHEN t.transaction_type = 'expense' THEN t.net_amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN t.transaction_type = 'income' THEN t.net_amount ELSE -t.net_amount END) as net_profit,
  COUNT(*) as transaction_count
FROM public.transactions t
WHERE t.status IN ('confirmed', 'invoiced', 'paid')
GROUP BY t.artist_id, t.project_id, t.booking_id, DATE_TRUNC('month', t.created_at);