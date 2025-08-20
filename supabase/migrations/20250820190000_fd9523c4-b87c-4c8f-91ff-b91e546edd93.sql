-- Create missing enum for approval events
CREATE TYPE public.approval_event_type AS ENUM ('CREATED', 'UPDATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'COMMENTED', 'ASSIGN_CHANGED');

-- Create approval_comments table (if not exists)
CREATE TABLE IF NOT EXISTS public.approval_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    approval_id UUID NOT NULL REFERENCES public.approvals(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES auth.users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create approval_events table for audit trail
CREATE TABLE public.approval_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    approval_id UUID NOT NULL REFERENCES public.approvals(id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL REFERENCES auth.users(id),
    event_type approval_event_type NOT NULL,
    from_status approval_status,
    to_status approval_status,
    diff JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to approvals table if they don't exist
DO $$
BEGIN
    -- Check and add amount column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'approvals' AND column_name = 'amount') THEN
        ALTER TABLE public.approvals ADD COLUMN amount NUMERIC;
    END IF;
    
    -- Check and add updated_by column  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'approvals' AND column_name = 'updated_by') THEN
        ALTER TABLE public.approvals ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.approval_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for approval_comments
DROP POLICY IF EXISTS "Users can view comments for approvals they can see" ON public.approval_comments;
CREATE POLICY "Users can view comments for approvals they can see"
ON public.approval_comments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM approvals a
        WHERE a.id = approval_comments.approval_id
        AND EXISTS (
            SELECT 1 FROM projects p
            LEFT JOIN artist_role_bindings arb ON arb.artist_id = p.artist_id
            LEFT JOIN project_role_bindings prb ON prb.project_id = p.id
            LEFT JOIN artists ar ON ar.id = p.artist_id
            LEFT JOIN workspace_memberships wm ON wm.workspace_id = ar.workspace_id
            WHERE p.id = a.project_id
            AND (arb.user_id = auth.uid() OR prb.user_id = auth.uid() OR wm.user_id = auth.uid())
        )
    )
);

DROP POLICY IF EXISTS "Users can create comments on approvals they can see" ON public.approval_comments;
CREATE POLICY "Users can create comments on approvals they can see"
ON public.approval_comments FOR INSERT
WITH CHECK (
    auth.uid() = author_user_id
    AND EXISTS (
        SELECT 1 FROM approvals a
        WHERE a.id = approval_comments.approval_id
        AND EXISTS (
            SELECT 1 FROM projects p
            LEFT JOIN artist_role_bindings arb ON arb.artist_id = p.artist_id
            LEFT JOIN project_role_bindings prb ON prb.project_id = p.id
            LEFT JOIN artists ar ON ar.id = p.artist_id
            LEFT JOIN workspace_memberships wm ON wm.workspace_id = ar.workspace_id
            WHERE p.id = a.project_id
            AND (arb.user_id = auth.uid() OR prb.user_id = auth.uid() OR wm.user_id = auth.uid())
        )
    )
);

-- RLS Policies for approval_events
CREATE POLICY "Users can view events for approvals they can see"
ON public.approval_events FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM approvals a
        WHERE a.id = approval_events.approval_id
        AND EXISTS (
            SELECT 1 FROM projects p
            LEFT JOIN artist_role_bindings arb ON arb.artist_id = p.artist_id
            LEFT JOIN project_role_bindings prb ON prb.project_id = p.id
            LEFT JOIN artists ar ON ar.id = p.artist_id
            LEFT JOIN workspace_memberships wm ON wm.workspace_id = ar.workspace_id
            WHERE p.id = a.project_id
            AND (arb.user_id = auth.uid() OR prb.user_id = auth.uid() OR wm.user_id = auth.uid())
        )
    )
);

CREATE POLICY "System can insert approval events"
ON public.approval_events FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create function to validate approval transitions
CREATE OR REPLACE FUNCTION public.validate_approval_transition(
    p_approval_id UUID,
    p_action TEXT,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_approval RECORD;
    v_result JSONB := '{"valid": false, "error": "Unknown error"}'::JSONB;
    v_can_edit BOOLEAN := false;
    v_can_approve BOOLEAN := false;
    v_is_assigned BOOLEAN := false;
    v_is_manager BOOLEAN := false;
BEGIN
    -- Get approval details
    SELECT * INTO v_approval FROM public.approvals WHERE id = p_approval_id;
    
    IF v_approval IS NULL THEN
        RETURN '{"valid": false, "error": "Approval not found"}'::JSONB;
    END IF;
    
    -- Check if user is assigned to this approval
    v_is_assigned := (v_approval.assigned_to_user_id = p_user_id);
    
    -- Check if user has EDITOR role on project
    SELECT COUNT(*) > 0 INTO v_can_edit
    FROM project_role_bindings prb
    WHERE prb.project_id = v_approval.project_id
    AND prb.user_id = p_user_id
    AND prb.role = 'EDITOR';
    
    -- Check if user has ARTIST_MANAGER role
    SELECT COUNT(*) > 0 INTO v_is_manager
    FROM projects p
    JOIN artists a ON a.id = p.artist_id
    JOIN artist_role_bindings arb ON arb.artist_id = a.id
    WHERE p.id = v_approval.project_id
    AND arb.user_id = p_user_id
    AND arb.role = 'MANAGER';
    
    -- Check if user can approve (assigned_to or manager)
    v_can_approve := (v_is_assigned OR v_is_manager);
    
    -- Validate transitions based on current status and action
    CASE p_action
        WHEN 'submit' THEN
            IF v_approval.status != 'DRAFT' THEN
                v_result := '{"valid": false, "error": "Can only submit DRAFT approvals"}'::JSONB;
            ELSIF NOT (v_can_edit OR v_is_manager) THEN
                v_result := '{"valid": false, "error": "No permission to submit"}'::JSONB;
            ELSE
                v_result := '{"valid": true}'::JSONB;
            END IF;
            
        WHEN 'approve' THEN
            IF v_approval.status != 'SUBMITTED' THEN
                v_result := '{"valid": false, "error": "Can only approve SUBMITTED approvals"}'::JSONB;
            ELSIF NOT v_can_approve THEN
                v_result := '{"valid": false, "error": "No permission to approve"}'::JSONB;
            ELSE
                v_result := '{"valid": true}'::JSONB;
            END IF;
            
        WHEN 'reject' THEN
            IF v_approval.status NOT IN ('SUBMITTED', 'DRAFT') THEN
                v_result := '{"valid": false, "error": "Can only reject SUBMITTED or DRAFT approvals"}'::JSONB;
            ELSIF v_approval.status = 'DRAFT' AND NOT v_is_manager THEN
                v_result := '{"valid": false, "error": "Only managers can reject DRAFT approvals"}'::JSONB;
            ELSIF v_approval.status = 'SUBMITTED' AND NOT v_can_approve THEN
                v_result := '{"valid": false, "error": "No permission to reject"}'::JSONB;
            ELSE
                v_result := '{"valid": true}'::JSONB;
            END IF;
            
        WHEN 'update' THEN
            IF v_approval.status != 'DRAFT' THEN
                v_result := '{"valid": false, "error": "Can only update DRAFT approvals"}'::JSONB;
            ELSIF NOT (v_can_edit OR v_is_manager OR v_approval.created_by = p_user_id) THEN
                v_result := '{"valid": false, "error": "No permission to update"}'::JSONB;
            ELSE
                v_result := '{"valid": true}'::JSONB;
            END IF;
            
        ELSE
            v_result := '{"valid": false, "error": "Invalid action"}'::JSONB;
    END CASE;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log approval events
CREATE OR REPLACE FUNCTION public.log_approval_event(
    p_approval_id UUID,
    p_event_type approval_event_type,
    p_from_status approval_status DEFAULT NULL,
    p_to_status approval_status DEFAULT NULL,
    p_diff JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.approval_events (
        approval_id,
        actor_user_id,
        event_type,
        from_status,
        to_status,
        diff
    ) VALUES (
        p_approval_id,
        auth.uid(),
        p_event_type,
        p_from_status,
        p_to_status,
        p_diff
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;