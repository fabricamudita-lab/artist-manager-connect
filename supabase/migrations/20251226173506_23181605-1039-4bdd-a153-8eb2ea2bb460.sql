-- =============================================================
-- ARCHITECTURAL REFACTOR: PHASE 2 - ACTION CENTER (Unified Requests)
-- =============================================================

-- 1. Create action_item_type enum for unified requests
CREATE TYPE public.action_item_type AS ENUM (
  'booking_request',    -- Booking/concert requests
  'budget_approval',    -- Budget approval requests
  'expense_approval',   -- Expense approval requests
  'vacation_request',   -- Vacation/time-off requests
  'interview_request',  -- Interview/press requests
  'collaboration',      -- Collaboration requests
  'general'             -- General requests
);

-- 2. Create action_item_status enum
CREATE TYPE public.action_item_status AS ENUM (
  'draft',
  'pending',
  'in_review',
  'approved',
  'rejected',
  'cancelled'
);

-- 3. Create action_item_priority enum
CREATE TYPE public.action_item_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

-- 4. Create the unified action_center table
CREATE TABLE public.action_center (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  item_type action_item_type NOT NULL DEFAULT 'general',
  status action_item_status NOT NULL DEFAULT 'pending',
  priority action_item_priority NOT NULL DEFAULT 'normal',
  
  -- Relationships
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.booking_offers(id) ON DELETE SET NULL,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
  
  -- Assignment
  created_by UUID NOT NULL,
  assigned_to UUID, -- Profile ID of assignee
  decided_by UUID, -- Who approved/rejected
  decided_at TIMESTAMP WITH TIME ZONE,
  
  -- Financial fields (for budget/expense approvals)
  amount NUMERIC,
  currency TEXT DEFAULT 'EUR',
  
  -- Request-specific data
  requester_name TEXT,
  requester_email TEXT,
  requester_company TEXT,
  
  -- Scheduling
  requested_date DATE,
  deadline DATE,
  
  -- Decision
  decision_comment TEXT,
  conditions TEXT, -- Conditions for approval
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create action_center_comments table for discussion
CREATE TABLE public.action_center_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.action_center(id) ON DELETE CASCADE,
  author_id UUID NOT NULL, -- Profile ID
  message TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Create action_center_history for audit trail
CREATE TABLE public.action_center_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.action_center(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'created', 'status_change', 'updated', 'comment'
  from_status action_item_status,
  to_status action_item_status,
  changes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Create indexes
CREATE INDEX idx_action_center_artist ON public.action_center(artist_id);
CREATE INDEX idx_action_center_type ON public.action_center(item_type);
CREATE INDEX idx_action_center_status ON public.action_center(status);
CREATE INDEX idx_action_center_assigned ON public.action_center(assigned_to);
CREATE INDEX idx_action_center_created_by ON public.action_center(created_by);
CREATE INDEX idx_action_center_project ON public.action_center(project_id);
CREATE INDEX idx_action_center_booking ON public.action_center(booking_id);
CREATE INDEX idx_action_center_comments_action ON public.action_center_comments(action_id);
CREATE INDEX idx_action_center_history_action ON public.action_center_history(action_id);

-- 8. Enable RLS
ALTER TABLE public.action_center ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_center_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_center_history ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for action_center
CREATE POLICY "Users can view action items for their artists"
ON public.action_center FOR SELECT
USING (
  auth.role() = 'authenticated' AND (
    -- Creator can always see
    created_by = auth.uid() OR
    -- Assigned user can see
    assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
    -- Users with artist access can see
    EXISTS (
      SELECT 1 FROM public.artists a
      LEFT JOIN public.artist_role_bindings arb ON arb.artist_id = a.id
      LEFT JOIN public.workspace_memberships wm ON wm.workspace_id = a.workspace_id
      WHERE a.id = action_center.artist_id
      AND (arb.user_id = auth.uid() OR wm.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can create action items"
ON public.action_center FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update action items they have access to"
ON public.action_center FOR UPDATE
USING (
  auth.role() = 'authenticated' AND (
    created_by = auth.uid() OR
    assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Creators can delete action items"
ON public.action_center FOR DELETE
USING (created_by = auth.uid());

-- 10. RLS Policies for comments
CREATE POLICY "Users can view comments on accessible action items"
ON public.action_center_comments FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create comments"
ON public.action_center_comments FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authors can delete their comments"
ON public.action_center_comments FOR DELETE
USING (author_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 11. RLS Policies for history
CREATE POLICY "Users can view history"
ON public.action_center_history FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert history"
ON public.action_center_history FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 12. Triggers for updated_at
CREATE TRIGGER update_action_center_updated_at
BEFORE UPDATE ON public.action_center
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Function to log action center history
CREATE OR REPLACE FUNCTION public.log_action_center_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changes JSONB;
  v_event_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.action_center_history (action_id, changed_by, event_type, to_status, changes)
    VALUES (NEW.id, NEW.created_by, 'created', NEW.status, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := CASE WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'status_change' ELSE 'updated' END;
    
    INSERT INTO public.action_center_history (
      action_id, changed_by, event_type, from_status, to_status, changes
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.decided_by, auth.uid()),
      v_event_type,
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'old', jsonb_build_object('status', OLD.status, 'title', OLD.title),
        'new', jsonb_build_object('status', NEW.status, 'title', NEW.title)
      )
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER action_center_history_trigger
AFTER INSERT OR UPDATE ON public.action_center
FOR EACH ROW
EXECUTE FUNCTION public.log_action_center_history();