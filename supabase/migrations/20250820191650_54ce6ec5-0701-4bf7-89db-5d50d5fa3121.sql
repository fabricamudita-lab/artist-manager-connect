-- Simple demo seed data for approvals module
DO $$
DECLARE
    project1_id UUID := 'd07d3c7a-deab-4d04-aa4f-b361c822a882'; -- Lucia & Rita
    project2_id UUID := '2f89ea30-46fc-44d6-ad4f-4fecfc32e06f'; -- Pol Batlle LIVE
    user1_id UUID;
BEGIN
    -- Get a user ID
    SELECT user_id INTO user1_id FROM profiles LIMIT 1;
    
    -- Direct inserts without triggers
    INSERT INTO public.approvals (id, project_id, type, status, title, description, amount, assigned_to_user_id, created_by, created_at, updated_at) VALUES
      (gen_random_uuid(), project1_id, 'BUDGET', 'DRAFT', 'Presupuesto del concierto', 'Presupuesto completo para la producción del evento', 25000, NULL, user1_id, now() - interval '2 days', now() - interval '2 days'),
      (gen_random_uuid(), project1_id, 'LOGISTICS', 'SUBMITTED', 'Transporte de equipos', 'Solicitud de transporte especializado para equipos de sonido', 8500, user1_id, user1_id, now() - interval '1 day', now() - interval '1 day'),
      (gen_random_uuid(), project2_id, 'PR_REQUEST', 'APPROVED', 'Campaña de marketing', 'Campaña de promoción en redes sociales', 12000, user1_id, user1_id, now() - interval '3 days', now() - interval '1 day');
    
    -- Demo comments
    INSERT INTO public.approval_comments (approval_id, author_user_id, body, created_at) VALUES
      ((SELECT id FROM approvals WHERE title = 'Transporte de equipos'), user1_id, 'Necesitamos confirmar las fechas exactas de carga y descarga', now() - interval '4 hours'),
      ((SELECT id FROM approvals WHERE title = 'Campaña de marketing'), user1_id, 'Excelente propuesta, aprobado para continuar', now() - interval '1 day');
    
    -- Demo events  
    INSERT INTO public.approval_events (approval_id, actor_user_id, event_type, from_status, to_status, diff, created_at) VALUES
      ((SELECT id FROM approvals WHERE title = 'Presupuesto del concierto'), user1_id, 'CREATED', NULL, 'DRAFT', '{"new": {"title": "Presupuesto del concierto"}}', now() - interval '2 days'),
      ((SELECT id FROM approvals WHERE title = 'Transporte de equipos'), user1_id, 'SUBMITTED', 'DRAFT', 'SUBMITTED', '{"old": {"status": "DRAFT"}, "new": {"status": "SUBMITTED"}}', now() - interval '1 day'),
      ((SELECT id FROM approvals WHERE title = 'Campaña de marketing'), user1_id, 'APPROVED', 'SUBMITTED', 'APPROVED', '{"old": {"status": "SUBMITTED"}, "new": {"status": "APPROVED"}}', now() - interval '1 day');
    
    RAISE NOTICE 'Demo data created successfully for % approvals', (SELECT COUNT(*) FROM approvals);
END $$;