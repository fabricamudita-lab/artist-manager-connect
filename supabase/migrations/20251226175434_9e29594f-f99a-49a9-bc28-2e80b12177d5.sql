-- ==========================================
-- ADVANCED FINANCIAL LIFECYCLE MIGRATION
-- ==========================================

-- 1. Payment Schedule Table for split payments (Deposit/Balance)
CREATE TABLE public.payment_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'balance', 'full')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2), -- Percentage of total fee (e.g., 50% deposit)
  due_date DATE,
  invoice_status TEXT NOT NULL DEFAULT 'pending' CHECK (invoice_status IN ('pending', 'sent', 'received')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'received', 'overdue')),
  invoice_number TEXT,
  invoice_url TEXT,
  received_date DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT payment_schedule_reference CHECK (
    (booking_id IS NOT NULL AND budget_id IS NULL) OR 
    (booking_id IS NULL AND budget_id IS NOT NULL) OR
    (booking_id IS NOT NULL AND budget_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment schedules" ON public.payment_schedules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create payment schedules" ON public.payment_schedules
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update payment schedules" ON public.payment_schedules
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete payment schedules" ON public.payment_schedules
  FOR DELETE USING (auth.role() = 'authenticated');

-- 2. Add invoice_status to budget_items for provider tracking
ALTER TABLE public.budget_items 
  ADD COLUMN IF NOT EXISTS provider_invoice_status TEXT DEFAULT 'pending' 
    CHECK (provider_invoice_status IN ('pending', 'requested', 'received', 'verified')),
  ADD COLUMN IF NOT EXISTS provider_invoice_requested_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS provider_invoice_received_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS provider_email TEXT,
  ADD COLUMN IF NOT EXISTS is_reconciled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reconciled_by UUID;

-- 3. Budget Versions/Snapshots Table
CREATE TABLE public.budget_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  version_type TEXT NOT NULL CHECK (version_type IN ('estimated', 'locked', 'actual', 'final')),
  version_name TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  snapshot_data JSONB NOT NULL DEFAULT '{}',
  total_income NUMERIC(12,2) DEFAULT 0,
  total_expenses NUMERIC(12,2) DEFAULT 0,
  net_profit NUMERIC(12,2) DEFAULT 0,
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by UUID,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budget versions" ON public.budget_versions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create budget versions" ON public.budget_versions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update budget versions" ON public.budget_versions
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. Add settlement/closing status to budgets
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'open' 
    CHECK (settlement_status IN ('open', 'pending_invoices', 'pending_payments', 'pending_income', 'accountant_review', 'closed', 'locked')),
  ADD COLUMN IF NOT EXISTS accountant_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS accountant_verified_by UUID,
  ADD COLUMN IF NOT EXISTS estimated_version_id UUID,
  ADD COLUMN IF NOT EXISTS final_version_id UUID;

-- 5. Quick Expense Capture Table (for mobile uploads)
CREATE TABLE public.quick_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploader_id UUID NOT NULL,
  artist_id UUID REFERENCES public.artists(id),
  booking_id UUID REFERENCES public.booking_offers(id),
  budget_id UUID REFERENCES public.budgets(id),
  budget_item_id UUID REFERENCES public.budget_items(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  amount NUMERIC(12,2),
  description TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  auto_linked BOOLEAN DEFAULT false,
  auto_link_confidence NUMERIC(3,2), -- 0.00 to 1.00 confidence score
  status TEXT NOT NULL DEFAULT 'unreconciled' CHECK (status IN ('unreconciled', 'reviewed', 'approved', 'rejected', 'linked')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quick_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quick expenses" ON public.quick_expenses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create quick expenses" ON public.quick_expenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update quick expenses" ON public.quick_expenses
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete quick expenses" ON public.quick_expenses
  FOR DELETE USING (auth.role() = 'authenticated');

-- 6. Payment Alerts Table (for due date reminders)
CREATE TABLE public.payment_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_schedule_id UUID REFERENCES public.payment_schedules(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('deposit_due', 'balance_due', 'invoice_reminder', 'overdue')),
  alert_date DATE NOT NULL,
  days_before INTEGER DEFAULT 3,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  dismissed BOOLEAN DEFAULT false,
  dismissed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment alerts" ON public.payment_alerts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create payment alerts" ON public.payment_alerts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update payment alerts" ON public.payment_alerts
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 7. Create function to auto-link quick expenses based on context
CREATE OR REPLACE FUNCTION public.auto_link_quick_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_artist_binding RECORD;
  v_booking RECORD;
  v_budget RECORD;
  v_confidence NUMERIC(3,2) := 0;
BEGIN
  -- Get user's artist bindings
  SELECT arb.artist_id INTO v_artist_binding
  FROM public.artist_role_bindings arb
  WHERE arb.user_id = NEW.uploader_id
  LIMIT 1;
  
  -- If user is linked to an artist
  IF v_artist_binding.artist_id IS NOT NULL THEN
    NEW.artist_id := v_artist_binding.artist_id;
    v_confidence := v_confidence + 0.3;
    
    -- Check for confirmed booking within +/- 1 day of expense date
    SELECT bo.id, b.id as budget_id INTO v_booking
    FROM public.booking_offers bo
    LEFT JOIN public.budgets b ON b.id = (bo.id::text)::uuid OR b.project_id = bo.project_id
    WHERE bo.artist_id = v_artist_binding.artist_id
      AND bo.estado = 'confirmado'
      AND bo.fecha BETWEEN (NEW.expense_date - INTERVAL '1 day') AND (NEW.expense_date + INTERVAL '1 day')
    ORDER BY ABS(bo.fecha - NEW.expense_date)
    LIMIT 1;
    
    IF v_booking.id IS NOT NULL THEN
      NEW.booking_id := v_booking.id;
      v_confidence := v_confidence + 0.5;
      NEW.auto_linked := true;
      
      -- Also link to budget if found
      IF v_booking.budget_id IS NOT NULL THEN
        NEW.budget_id := v_booking.budget_id;
        v_confidence := v_confidence + 0.2;
      END IF;
    END IF;
  END IF;
  
  NEW.auto_link_confidence := LEAST(v_confidence, 1.0);
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-linking
DROP TRIGGER IF EXISTS trigger_auto_link_quick_expense ON public.quick_expenses;
CREATE TRIGGER trigger_auto_link_quick_expense
  BEFORE INSERT ON public.quick_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_quick_expense();

-- 8. Function to create payment schedule from booking
CREATE OR REPLACE FUNCTION public.create_default_payment_schedule(
  p_booking_id UUID,
  p_fee NUMERIC,
  p_event_date DATE,
  p_created_by UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create deposit payment (50% due 30 days before event)
  INSERT INTO public.payment_schedules (
    booking_id,
    payment_type,
    amount,
    percentage,
    due_date,
    created_by
  ) VALUES (
    p_booking_id,
    'deposit',
    p_fee * 0.5,
    50,
    p_event_date - INTERVAL '30 days',
    p_created_by
  );
  
  -- Create balance payment (50% due on show day)
  INSERT INTO public.payment_schedules (
    booking_id,
    payment_type,
    amount,
    percentage,
    due_date,
    created_by
  ) VALUES (
    p_booking_id,
    'balance',
    p_fee * 0.5,
    50,
    p_event_date,
    p_created_by
  );
  
  -- Create alert for balance invoice (3 days before show)
  INSERT INTO public.payment_alerts (
    booking_id,
    alert_type,
    alert_date,
    days_before
  ) VALUES (
    p_booking_id,
    'balance_due',
    p_event_date - INTERVAL '3 days',
    3
  );
END;
$$;

-- 9. Function to check if budget can be closed
CREATE OR REPLACE FUNCTION public.can_close_budget(p_budget_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_pending_invoices INTEGER;
  v_pending_payments INTEGER;
  v_pending_income INTEGER;
  v_items_without_invoice INTEGER;
  v_can_close BOOLEAN := true;
BEGIN
  -- Check for items without provider invoice
  SELECT COUNT(*) INTO v_items_without_invoice
  FROM public.budget_items
  WHERE budget_id = p_budget_id
    AND provider_invoice_status != 'received'
    AND provider_invoice_status != 'verified';
  
  -- Check for unpaid items
  SELECT COUNT(*) INTO v_pending_payments
  FROM public.budget_items
  WHERE budget_id = p_budget_id
    AND billing_status != 'pagado'
    AND billing_status != 'cancelado';
  
  -- Check for pending income from payment schedules
  SELECT COUNT(*) INTO v_pending_income
  FROM public.payment_schedules
  WHERE budget_id = p_budget_id
    AND payment_status != 'received';
  
  IF v_items_without_invoice > 0 THEN
    v_can_close := false;
  END IF;
  
  IF v_pending_payments > 0 THEN
    v_can_close := false;
  END IF;
  
  IF v_pending_income > 0 THEN
    v_can_close := false;
  END IF;
  
  v_result := jsonb_build_object(
    'can_close', v_can_close,
    'items_without_invoice', v_items_without_invoice,
    'pending_payments', v_pending_payments,
    'pending_income', v_pending_income
  );
  
  RETURN v_result;
END;
$$;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_schedules_booking ON public.payment_schedules(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_budget ON public.payment_schedules(budget_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON public.payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_quick_expenses_uploader ON public.quick_expenses(uploader_id);
CREATE INDEX IF NOT EXISTS idx_quick_expenses_booking ON public.quick_expenses(booking_id);
CREATE INDEX IF NOT EXISTS idx_quick_expenses_status ON public.quick_expenses(status);
CREATE INDEX IF NOT EXISTS idx_budget_versions_budget ON public.budget_versions(budget_id);
CREATE INDEX IF NOT EXISTS idx_payment_alerts_date ON public.payment_alerts(alert_date);
CREATE INDEX IF NOT EXISTS idx_budget_items_provider_status ON public.budget_items(provider_invoice_status);