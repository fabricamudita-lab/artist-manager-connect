-- Create enums for approval types and statuses
CREATE TYPE public.approval_type AS ENUM ('BUDGET', 'PR_REQUEST', 'LOGISTICS');
CREATE TYPE public.approval_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
CREATE TYPE public.approval_event_type AS ENUM ('CREATED', 'UPDATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'COMMENTED', 'ASSIGN_CHANGED');

-- Create approvals table
CREATE TABLE public.approvals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL,
    type approval_type NOT NULL,
    status approval_status NOT NULL DEFAULT 'DRAFT',
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC,
    assigned_to_user_id UUID REFERENCES auth.users(id),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create approval_comments table
CREATE TABLE public.approval_comments (
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

-- Enable RLS
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for approvals
CREATE POLICY "Users can view approvals for projects they have access to"
ON public.approvals FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects p
        LEFT JOIN artist_role_bindings arb ON arb.artist_id = p.artist_id
        LEFT JOIN project_role_bindings prb ON prb.project_id = p.id
        LEFT JOIN artists a ON a.id = p.artist_id
        LEFT JOIN workspace_memberships wm ON wm.workspace_id = a.workspace_id
        WHERE p.id = approvals.project_id
        AND (arb.user_id = auth.uid() OR prb.user_id = auth.uid() OR wm.user_id = auth.uid())
    )
);

CREATE POLICY "Project editors can create approvals"
ON public.approvals FOR INSERT
WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
        SELECT 1 FROM project_role_bindings prb
        WHERE prb.project_id = approvals.project_id
        AND prb.user_id = auth.uid()
        AND prb.role = 'EDITOR'
    )
);

CREATE POLICY "Project editors can update their own approvals"
ON public.approvals FOR UPDATE
USING (
    auth.uid() = created_by
    AND EXISTS (
        SELECT 1 FROM project_role_bindings prb
        WHERE prb.project_id = approvals.project_id
        AND prb.user_id = auth.uid()
        AND prb.role = 'EDITOR'
    )
);

CREATE POLICY "Assigned users can update approval status"
ON public.approvals FOR UPDATE
USING (auth.uid() = assigned_to_user_id OR auth.uid() = created_by);

-- RLS Policies for approval_comments
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
    v_user_roles RECORD;
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

-- Create trigger function to log approval changes
CREATE OR REPLACE FUNCTION public.log_approval_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes JSONB;
    action_type text;
BEGIN
    IF TG_OP = 'INSERT' THEN
        action_type := 'approval_created';
        changes := jsonb_build_object('new', to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'approval_updated';
        changes := jsonb_build_object(
            'old', jsonb_build_object(
                'status', OLD.status,
                'assigned_to_user_id', OLD.assigned_to_user_id,
                'title', OLD.title,
                'description', OLD.description
            ),
            'new', jsonb_build_object(
                'status', NEW.status,
                'assigned_to_user_id', NEW.assigned_to_user_id,
                'title', NEW.title,
                'description', NEW.description
            )
        );
        
        -- Specific action types for status changes
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            CASE NEW.status
                WHEN 'SUBMITTED' THEN action_type := 'approval_submitted';
                WHEN 'APPROVED' THEN action_type := 'approval_approved';
                WHEN 'REJECTED' THEN action_type := 'approval_rejected';
                ELSE action_type := 'approval_status_changed';
            END CASE;
        END IF;
    END IF;

    INSERT INTO public.audit_logs (
        actor_user_id,
        action,
        resource_type,
        resource_id,
        metadata
    ) VALUES (
        auth.uid(),
        action_type,
        'APPROVAL',
        COALESCE(NEW.id, OLD.id),
        changes
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER approval_changes_audit_trigger
    AFTER INSERT OR UPDATE ON public.approvals
    FOR EACH ROW EXECUTE FUNCTION public.log_approval_changes();

-- Create trigger to update updated_at
CREATE TRIGGER update_approvals_updated_at
    BEFORE UPDATE ON public.approvals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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