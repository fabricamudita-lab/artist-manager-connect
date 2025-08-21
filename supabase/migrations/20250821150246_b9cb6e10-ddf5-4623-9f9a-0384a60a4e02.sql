-- Create task status enum
CREATE TYPE public.task_status AS ENUM (
  'PENDING',
  'IN_PROGRESS', 
  'BLOCKED',
  'IN_REVIEW',
  'COMPLETED',
  'CANCELLED'
);

-- Add status column to project_checklist_items
ALTER TABLE public.project_checklist_items 
ADD COLUMN status public.task_status NOT NULL DEFAULT 'PENDING';

-- Migrate existing data: completed=true -> COMPLETED, false -> PENDING
UPDATE public.project_checklist_items 
SET status = CASE 
  WHEN is_completed = true THEN 'COMPLETED'::public.task_status
  ELSE 'PENDING'::public.task_status
END;

-- Create index for status filtering
CREATE INDEX idx_project_checklist_items_status ON public.project_checklist_items(status);
CREATE INDEX idx_project_checklist_items_project_status ON public.project_checklist_items(project_id, status);