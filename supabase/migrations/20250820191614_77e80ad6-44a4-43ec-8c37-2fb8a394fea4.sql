-- Temporarily disable audit trigger for seeding
ALTER TABLE public.approvals DISABLE TRIGGER approval_changes_audit_trigger;

-- Demo seed data for approvals module
DO $$
DECLARE
    project1_id UUID;
    project2_id UUID;
    user1_id UUID;
BEGIN
    -- Get existing project IDs
    SELECT id INTO project1_id FROM projects LIMIT 1 OFFSET 0;
    SELECT id INTO project2_id FROM projects LIMIT 1 OFFSET 1;
    
    -- Get a user ID
    SELECT user_id INTO user1_id FROM profiles LIMIT 1;
    
    -- Insert demo approvals (bypassing trigger)
    INSERT INTO public.approvals (project_id, type, status, title, description, amount, assigned_to_user_id, created_by) VALUES
      (project1_id, 'BUDGET', 'DRAFT', 'Presupuesto del concierto', 'Presupuesto completo para la producción del evento', 25000, NULL, user1_id),
      (project1_id, 'LOGISTICS', 'SUBMITTED', 'Transporte de equipos', 'Solicitud de transporte especializado para equipos de sonido', 8500, user1_id, user1_id),
      (project2_id, 'PR_REQUEST', 'APPROVED', 'Campaña de marketing', 'Campaña de promoción en redes sociales', 12000, user1_id, user1_id);
    
    -- Insert demo comments
    INSERT INTO public.approval_comments (approval_id, author_user_id, body) VALUES
      ((SELECT id FROM approvals WHERE title = 'Transporte de equipos'), user1_id, 'Necesitamos confirmar las fechas exactas de carga y descarga'),
      ((SELECT id FROM approvals WHERE title = 'Campaña de marketing'), user1_id, 'Excelente propuesta, aprobado para continuar');
    
    -- Insert demo events
    INSERT INTO public.approval_events (approval_id, actor_user_id, event_type, from_status, to_status, diff) VALUES
      ((SELECT id FROM approvals WHERE title = 'Presupuesto del concierto'), user1_id, 'CREATED', NULL, 'DRAFT', '{"new": {"title": "Presupuesto del concierto"}}'),
      ((SELECT id FROM approvals WHERE title = 'Transporte de equipos'), user1_id, 'SUBMITTED', 'DRAFT', 'SUBMITTED', '{"old": {"status": "DRAFT"}, "new": {"status": "SUBMITTED"}}'),
      ((SELECT id FROM approvals WHERE title = 'Campaña de marketing'), user1_id, 'APPROVED', 'SUBMITTED', 'APPROVED', '{"old": {"status": "SUBMITTED"}, "new": {"status": "APPROVED"}}');
END $$;

-- Re-enable audit trigger
ALTER TABLE public.approvals ENABLE TRIGGER approval_changes_audit_trigger;