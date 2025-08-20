-- Fix function search paths for security compliance
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
    FROM public.project_role_bindings prb
    WHERE prb.project_id = v_approval.project_id
    AND prb.user_id = p_user_id
    AND prb.role = 'EDITOR';
    
    -- Check if user has ARTIST_MANAGER role
    SELECT COUNT(*) > 0 INTO v_is_manager
    FROM public.projects p
    JOIN public.artists a ON a.id = p.artist_id
    JOIN public.artist_role_bindings arb ON arb.artist_id = a.id
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix function search paths for security compliance
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;