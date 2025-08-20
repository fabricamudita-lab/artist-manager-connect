-- Create approval types enum
CREATE TYPE public.approval_type AS ENUM ('BUDGET', 'PR_REQUEST', 'LOGISTICS');

-- Create approval status enum  
CREATE TYPE public.approval_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- Create approvals table
CREATE TABLE public.approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type public.approval_type NOT NULL,
  status public.approval_status NOT NULL DEFAULT 'DRAFT',
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create approval comments table for discussions
CREATE TABLE public.approval_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  approval_id UUID NOT NULL REFERENCES public.approvals(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on approvals table
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- Enable RLS on approval_comments table  
ALTER TABLE public.approval_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for approvals
CREATE POLICY "Users can view approvals for projects they have access to"
ON public.approvals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.projects p
    LEFT JOIN public.artist_role_bindings arb ON arb.artist_id = p.artist_id
    LEFT JOIN public.project_role_bindings prb ON prb.project_id = p.id
    LEFT JOIN public.artists a ON a.id = p.artist_id
    LEFT JOIN public.workspace_memberships wm ON wm.workspace_id = a.workspace_id
    WHERE p.id = approvals.project_id 
    AND (
      arb.user_id = auth.uid() OR
      prb.user_id = auth.uid() OR
      wm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Project editors can create approvals"
ON public.approvals
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 
    FROM public.project_role_bindings prb
    WHERE prb.project_id = approvals.project_id 
    AND prb.user_id = auth.uid()
    AND prb.role = 'EDITOR'
  )
);

CREATE POLICY "Project editors can update their own approvals"
ON public.approvals  
FOR UPDATE
USING (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 
    FROM public.project_role_bindings prb
    WHERE prb.project_id = approvals.project_id 
    AND prb.user_id = auth.uid()
    AND prb.role = 'EDITOR'
  )
);

CREATE POLICY "Assigned users can update approval status"
ON public.approvals
FOR UPDATE  
USING (
  auth.uid() = assigned_to_user_id OR
  auth.uid() = created_by
);

-- Create RLS policies for approval comments
CREATE POLICY "Users can view comments for approvals they can see"
ON public.approval_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.approvals a
    WHERE a.id = approval_comments.approval_id
    AND EXISTS (
      SELECT 1 
      FROM public.projects p
      LEFT JOIN public.artist_role_bindings arb ON arb.artist_id = p.artist_id
      LEFT JOIN public.project_role_bindings prb ON prb.project_id = p.id
      LEFT JOIN public.artists ar ON ar.id = p.artist_id
      LEFT JOIN public.workspace_memberships wm ON wm.workspace_id = ar.workspace_id
      WHERE p.id = a.project_id 
      AND (
        arb.user_id = auth.uid() OR
        prb.user_id = auth.uid() OR
        wm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can create comments on approvals they can see"
ON public.approval_comments
FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM public.approvals a
    WHERE a.id = approval_comments.approval_id
    AND EXISTS (
      SELECT 1 
      FROM public.projects p
      LEFT JOIN public.artist_role_bindings arb ON arb.artist_id = p.artist_id
      LEFT JOIN public.project_role_bindings prb ON prb.project_id = p.id
      LEFT JOIN public.artists ar ON ar.id = p.artist_id
      LEFT JOIN public.workspace_memberships wm ON wm.workspace_id = ar.workspace_id
      WHERE p.id = a.project_id 
      AND (
        arb.user_id = auth.uid() OR
        prb.user_id = auth.uid() OR
        wm.user_id = auth.uid()
      )
    )
  )
);

-- Create indexes for better performance
CREATE INDEX idx_approvals_project_id ON public.approvals(project_id);
CREATE INDEX idx_approvals_status ON public.approvals(status);
CREATE INDEX idx_approvals_assigned_to ON public.approvals(assigned_to_user_id);
CREATE INDEX idx_approvals_created_by ON public.approvals(created_by);
CREATE INDEX idx_approval_comments_approval_id ON public.approval_comments(approval_id);

-- Create function to update updated_at timestamp
CREATE TRIGGER update_approvals_updated_at
  BEFORE UPDATE ON public.approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to log approval changes to audit_logs
CREATE OR REPLACE FUNCTION public.log_approval_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes jsonb;
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

-- Create triggers for audit logging
CREATE TRIGGER log_approval_changes_trigger
  AFTER INSERT OR UPDATE ON public.approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_approval_changes();