-- Demo seed data for approvals module
INSERT INTO public.approvals (id, project_id, type, status, title, description, amount, assigned_to_user_id, created_by, created_at, updated_at) VALUES
  (gen_random_uuid(), (SELECT id FROM projects WHERE name = 'Gira 2025' LIMIT 1), 'BUDGET', 'DRAFT', 'Presupuesto Barcelona', 'Presupuesto para el concierto en Barcelona con todos los gastos de producción', 25000, NULL, (SELECT user_id FROM profiles LIMIT 1), now() - interval '2 days', now() - interval '2 days'),
  (gen_random_uuid(), (SELECT id FROM projects WHERE name = 'Gira 2025' LIMIT 1), 'LOGISTICS', 'SUBMITTED', 'Transporte de equipos', 'Solicitud de aprobación para el transporte especializado de equipos de sonido', 8500, (SELECT user_id FROM profiles LIMIT 1), (SELECT user_id FROM profiles LIMIT 1), now() - interval '1 day', now() - interval '1 day'),
  (gen_random_uuid(), (SELECT id FROM projects WHERE name LIKE '%PR%' LIMIT 1), 'PR_REQUEST', 'APPROVED', 'Campaña redes sociales', 'Aprobación para la campaña de marketing digital y redes sociales', 12000, (SELECT user_id FROM profiles LIMIT 1), (SELECT user_id FROM profiles LIMIT 1), now() - interval '3 days', now() - interval '1 day');

-- Demo comments
INSERT INTO public.approval_comments (approval_id, author_user_id, body, created_at) VALUES
  ((SELECT id FROM approvals WHERE title = 'Transporte de equipos'), (SELECT user_id FROM profiles LIMIT 1), 'Necesitamos confirmar las fechas exactas de carga y descarga', now() - interval '4 hours'),
  ((SELECT id FROM approvals WHERE title = 'Campaña redes sociales'), (SELECT user_id FROM profiles LIMIT 1), 'Excelente propuesta, aprobado para continuar', now() - interval '1 day');

-- Demo events
INSERT INTO public.approval_events (approval_id, actor_user_id, event_type, from_status, to_status, diff, created_at) VALUES
  ((SELECT id FROM approvals WHERE title = 'Presupuesto Barcelona'), (SELECT user_id FROM profiles LIMIT 1), 'CREATED', NULL, 'DRAFT', '{"new": {"title": "Presupuesto Barcelona"}}', now() - interval '2 days'),
  ((SELECT id FROM approvals WHERE title = 'Transporte de equipos'), (SELECT user_id FROM profiles LIMIT 1), 'SUBMITTED', 'DRAFT', 'SUBMITTED', '{"old": {"status": "DRAFT"}, "new": {"status": "SUBMITTED"}}', now() - interval '1 day'),
  ((SELECT id FROM approvals WHERE title = 'Campaña redes sociales'), (SELECT user_id FROM profiles LIMIT 1), 'APPROVED', 'SUBMITTED', 'APPROVED', '{"old": {"status": "SUBMITTED"}, "new": {"status": "APPROVED"}}', now() - interval '1 day');