
-- Add public_share_sections to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS public_share_sections jsonb DEFAULT '["archivos","rider"]'::jsonb;

-- Seed 4 new system checklist templates
-- 1. Gira Nacional
INSERT INTO public.checklist_templates (name, name_es, description, description_es, is_system_template, created_by)
VALUES ('National Tour', 'Gira Nacional', 'Booking, logistics and full tour production', 'Booking, logística y producción de gira completa', true, '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;

-- 2. Lanzamiento Álbum
INSERT INTO public.checklist_templates (name, name_es, description, description_es, is_system_template, created_by)
VALUES ('Album Release', 'Lanzamiento Álbum', 'Full album plan (8-12 weeks)', 'Plan completo para álbum (8–12 semanas)', true, '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;

-- 3. Producción Videoclip
INSERT INTO public.checklist_templates (name, name_es, description, description_es, is_system_template, created_by)
VALUES ('Music Video Production', 'Producción Videoclip', 'Pre-production, shooting and post', 'Pre-producción, rodaje y post', true, '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;

-- 4. Campaña de Sync
INSERT INTO public.checklist_templates (name, name_es, description, description_es, is_system_template, created_by)
VALUES ('Sync Campaign', 'Campaña de Sync', 'Pitching, negotiation and license signing', 'Pitching, negociación y firma de licencias', true, '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;

-- Insert items for Gira Nacional (28 tasks)
WITH tmpl AS (SELECT id FROM public.checklist_templates WHERE name_es = 'Gira Nacional' AND is_system_template = true LIMIT 1)
INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, owner_label_es, sort_order) VALUES
(( SELECT id FROM tmpl), 'BOOKING', 'BOOKING', 'Define tour dates', 'Definir fechas de gira', 'Manager', 0),
((SELECT id FROM tmpl), 'BOOKING', 'BOOKING', 'Contact promoters', 'Contactar promotores', 'Agente', 1),
((SELECT id FROM tmpl), 'BOOKING', 'BOOKING', 'Send availability requests', 'Enviar consultas de disponibilidad', 'Agente', 2),
((SELECT id FROM tmpl), 'BOOKING', 'BOOKING', 'Negotiate fees', 'Negociar cachés', 'Manager', 3),
((SELECT id FROM tmpl), 'BOOKING', 'BOOKING', 'Confirm venues', 'Confirmar salas/venues', 'Agente', 4),
((SELECT id FROM tmpl), 'BOOKING', 'BOOKING', 'Sign contracts', 'Firmar contratos', 'Legal', 5),
((SELECT id FROM tmpl), 'BOOKING', 'BOOKING', 'Collect deposits', 'Cobrar anticipos', 'Administración', 6),
((SELECT id FROM tmpl), 'LOGISTICA', 'LOGÍSTICA', 'Book transportation', 'Reservar transporte', 'Tour Manager', 7),
((SELECT id FROM tmpl), 'LOGISTICA', 'LOGÍSTICA', 'Book hotels', 'Reservar hoteles', 'Tour Manager', 8),
((SELECT id FROM tmpl), 'LOGISTICA', 'LOGÍSTICA', 'Plan route', 'Planificar ruta', 'Tour Manager', 9),
((SELECT id FROM tmpl), 'LOGISTICA', 'LOGÍSTICA', 'Confirm riders', 'Confirmar riders', 'Producción', 10),
((SELECT id FROM tmpl), 'LOGISTICA', 'LOGÍSTICA', 'Prepare road sheets', 'Preparar hojas de ruta', 'Tour Manager', 11),
((SELECT id FROM tmpl), 'LOGISTICA', 'LOGÍSTICA', 'Coordinate catering', 'Coordinar catering', 'Tour Manager', 12),
((SELECT id FROM tmpl), 'LOGISTICA', 'LOGÍSTICA', 'Arrange parking/load-in', 'Gestionar parking/carga', 'Tour Manager', 13),
((SELECT id FROM tmpl), 'PRODUCCION', 'PRODUCCIÓN', 'Hire crew', 'Contratar crew', 'Director de producción', 14),
((SELECT id FROM tmpl), 'PRODUCCION', 'PRODUCCIÓN', 'Prepare backline', 'Preparar backline', 'Técnico', 15),
((SELECT id FROM tmpl), 'PRODUCCION', 'PRODUCCIÓN', 'Sound check schedule', 'Planificar pruebas de sonido', 'Técnico de sonido', 16),
((SELECT id FROM tmpl), 'PRODUCCION', 'PRODUCCIÓN', 'Lighting design', 'Diseño de iluminación', 'Técnico de luces', 17),
((SELECT id FROM tmpl), 'PRODUCCION', 'PRODUCCIÓN', 'Stage plot update', 'Actualizar stage plot', 'Producción', 18),
((SELECT id FROM tmpl), 'PRODUCCION', 'PRODUCCIÓN', 'Merch inventory', 'Inventario de merch', 'Merch Manager', 19),
((SELECT id FROM tmpl), 'PRODUCCION', 'PRODUCCIÓN', 'Event insurance', 'Seguro del evento', 'Administración', 20),
((SELECT id FROM tmpl), 'COMUNICACION', 'COMUNICACIÓN', 'Press releases', 'Enviar notas de prensa', 'Prensa', 21),
((SELECT id FROM tmpl), 'COMUNICACION', 'COMUNICACIÓN', 'Social media plan', 'Plan de redes sociales', 'Community Manager', 22),
((SELECT id FROM tmpl), 'COMUNICACION', 'COMUNICACIÓN', 'Poster/flyer design', 'Diseño de cartelería', 'Diseñador', 23),
((SELECT id FROM tmpl), 'COMUNICACION', 'COMUNICACIÓN', 'Announce tour dates', 'Anunciar fechas', 'Marketing', 24),
((SELECT id FROM tmpl), 'CIERRE', 'CIERRE', 'Collect final payments', 'Cobrar pagos finales', 'Administración', 25),
((SELECT id FROM tmpl), 'CIERRE', 'CIERRE', 'Settlement reports', 'Liquidaciones', 'Administración', 26),
((SELECT id FROM tmpl), 'CIERRE', 'CIERRE', 'Post-tour review', 'Evaluación post-gira', 'Manager', 27);

-- Insert items for Lanzamiento Álbum (38 tasks)
WITH tmpl AS (SELECT id FROM public.checklist_templates WHERE name_es = 'Lanzamiento Álbum' AND is_system_template = true LIMIT 1)
INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, owner_label_es, sort_order) VALUES
((SELECT id FROM tmpl), 'PREPRODUCCION', 'PRE-PRODUCCIÓN', 'Finalize tracklist', 'Cerrar tracklist', 'Artista', 0),
((SELECT id FROM tmpl), 'PREPRODUCCION', 'PRE-PRODUCCIÓN', 'Select producer', 'Seleccionar productor', 'A&R', 1),
((SELECT id FROM tmpl), 'PREPRODUCCION', 'PRE-PRODUCCIÓN', 'Book studio', 'Reservar estudio', 'Manager', 2),
((SELECT id FROM tmpl), 'PREPRODUCCION', 'PRE-PRODUCCIÓN', 'Define budget', 'Definir presupuesto', 'Manager', 3),
((SELECT id FROM tmpl), 'PREPRODUCCION', 'PRE-PRODUCCIÓN', 'Sign splits agreements', 'Firmar acuerdos de splits', 'Legal', 4),
((SELECT id FROM tmpl), 'PRODUCCION', 'PRODUCCIÓN', 'Recording sessions', 'Sesiones de grabación', 'Productor', 5),
((SELECT id FROM tmpl), 'PRODUCCION', 'PRODUCCIÓN', 'Mixing', 'Mezcla', 'Ingeniero de mezcla', 6),
((SELECT id FROM tmpl), 'PRODUCCION', 'PRODUCCIÓN', 'Mastering', 'Mastering', 'Ingeniero de mastering', 7),
((SELECT id FROM tmpl), 'PRODUCCION', 'PRODUCCIÓN', 'Quality control', 'Control de calidad', 'A&R', 8),
((SELECT id FROM tmpl), 'PRODUCCION', 'PRODUCCIÓN', 'Register ISRC codes', 'Registrar códigos ISRC', 'Administración', 9),
((SELECT id FROM tmpl), 'PRODUCCION', 'PRODUCCIÓN', 'Register works in PRO', 'Registrar obras en SGAE', 'Legal', 10),
((SELECT id FROM tmpl), 'DISTRIBUCION', 'DISTRIBUCIÓN', 'Select distributor', 'Seleccionar distribuidora', 'Manager', 11),
((SELECT id FROM tmpl), 'DISTRIBUCION', 'DISTRIBUCIÓN', 'Prepare metadata', 'Preparar metadatos', 'Administración', 12),
((SELECT id FROM tmpl), 'DISTRIBUCION', 'DISTRIBUCIÓN', 'Upload to distributor', 'Subir a distribuidora', 'Administración', 13),
((SELECT id FROM tmpl), 'DISTRIBUCION', 'DISTRIBUCIÓN', 'Request editorial playlists', 'Solicitar playlists editoriales', 'Marketing', 14),
((SELECT id FROM tmpl), 'DISTRIBUCION', 'DISTRIBUCIÓN', 'Pre-save campaign', 'Campaña de pre-save', 'Marketing', 15),
((SELECT id FROM tmpl), 'DISTRIBUCION', 'DISTRIBUCIÓN', 'YouTube content ID setup', 'Configurar YouTube Content ID', 'Administración', 16),
((SELECT id FROM tmpl), 'VISUAL', 'VISUAL', 'Album artwork', 'Portada del álbum', 'Diseñador', 17),
((SELECT id FROM tmpl), 'VISUAL', 'VISUAL', 'Single covers', 'Portadas de singles', 'Diseñador', 18),
((SELECT id FROM tmpl), 'VISUAL', 'VISUAL', 'Music video concept', 'Concepto de videoclip', 'Director creativo', 19),
((SELECT id FROM tmpl), 'VISUAL', 'VISUAL', 'Shoot music video', 'Grabar videoclip', 'Director', 20),
((SELECT id FROM tmpl), 'VISUAL', 'VISUAL', 'Edit music video', 'Editar videoclip', 'Editor', 21),
((SELECT id FROM tmpl), 'VISUAL', 'VISUAL', 'EPK/press photos', 'Fotos EPK/prensa', 'Fotógrafo', 22),
((SELECT id FROM tmpl), 'MARKETING', 'MARKETING', 'Press plan', 'Plan de prensa', 'Publicista', 23),
((SELECT id FROM tmpl), 'MARKETING', 'MARKETING', 'Social media strategy', 'Estrategia de redes sociales', 'Community Manager', 24),
((SELECT id FROM tmpl), 'MARKETING', 'MARKETING', 'Content calendar', 'Calendario de contenidos', 'Community Manager', 25),
((SELECT id FROM tmpl), 'MARKETING', 'MARKETING', 'Influencer outreach', 'Contacto con influencers', 'Marketing', 26),
((SELECT id FROM tmpl), 'MARKETING', 'MARKETING', 'Radio promotion', 'Promoción en radio', 'Promotor radio', 27),
((SELECT id FROM tmpl), 'MARKETING', 'MARKETING', 'Paid ads campaign', 'Campaña de anuncios pagados', 'Marketing', 28),
((SELECT id FROM tmpl), 'MARKETING', 'MARKETING', 'Launch event plan', 'Plan de evento de lanzamiento', 'Manager', 29),
((SELECT id FROM tmpl), 'MARKETING', 'MARKETING', 'Playlist pitching', 'Pitching a playlists', 'Marketing', 30),
((SELECT id FROM tmpl), 'MARKETING', 'MARKETING', 'Press kit update', 'Actualizar press kit', 'Marketing', 31),
((SELECT id FROM tmpl), 'LANZAMIENTO', 'LANZAMIENTO', 'Release day coordination', 'Coordinación día de lanzamiento', 'Manager', 32),
((SELECT id FROM tmpl), 'LANZAMIENTO', 'LANZAMIENTO', 'Monitor first week streams', 'Monitorear streams primera semana', 'Marketing', 33),
((SELECT id FROM tmpl), 'LANZAMIENTO', 'LANZAMIENTO', 'Engage fans on release', 'Interactuar con fans', 'Community Manager', 34),
((SELECT id FROM tmpl), 'POST', 'POST-LANZAMIENTO', 'Analyze metrics', 'Analizar métricas', 'Marketing', 35),
((SELECT id FROM tmpl), 'POST', 'POST-LANZAMIENTO', 'Royalty tracking setup', 'Configurar seguimiento de royalties', 'Administración', 36),
((SELECT id FROM tmpl), 'POST', 'POST-LANZAMIENTO', 'Post-mortem review', 'Revisión post-mortem', 'Manager', 37);

-- Insert items for Producción Videoclip (20 tasks)
WITH tmpl AS (SELECT id FROM public.checklist_templates WHERE name_es = 'Producción Videoclip' AND is_system_template = true LIMIT 1)
INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, owner_label_es, sort_order) VALUES
((SELECT id FROM tmpl), 'PREPRODUCCION', 'PRE-PRODUCCIÓN', 'Define concept', 'Definir concepto', 'Director creativo', 0),
((SELECT id FROM tmpl), 'PREPRODUCCION', 'PRE-PRODUCCIÓN', 'Write treatment', 'Escribir tratamiento', 'Director', 1),
((SELECT id FROM tmpl), 'PREPRODUCCION', 'PRE-PRODUCCIÓN', 'Define budget', 'Definir presupuesto', 'Productor ejecutivo', 2),
((SELECT id FROM tmpl), 'PREPRODUCCION', 'PRE-PRODUCCIÓN', 'Hire director', 'Contratar director', 'Manager', 3),
((SELECT id FROM tmpl), 'PREPRODUCCION', 'PRE-PRODUCCIÓN', 'Location scouting', 'Búsqueda de localizaciones', 'Director', 4),
((SELECT id FROM tmpl), 'PREPRODUCCION', 'PRE-PRODUCCIÓN', 'Casting', 'Casting', 'Director', 5),
((SELECT id FROM tmpl), 'PREPRODUCCION', 'PRE-PRODUCCIÓN', 'Storyboard', 'Storyboard', 'Director', 6),
((SELECT id FROM tmpl), 'PREPRODUCCION', 'PRE-PRODUCCIÓN', 'Wardrobe/styling', 'Vestuario/estilismo', 'Estilista', 7),
((SELECT id FROM tmpl), 'RODAJE', 'RODAJE', 'Equipment rental', 'Alquiler de equipos', 'Director de fotografía', 8),
((SELECT id FROM tmpl), 'RODAJE', 'RODAJE', 'Crew call sheets', 'Hojas de citación', 'Asistente de dirección', 9),
((SELECT id FROM tmpl), 'RODAJE', 'RODAJE', 'Day 1 shooting', 'Rodaje día 1', 'Director', 10),
((SELECT id FROM tmpl), 'RODAJE', 'RODAJE', 'Day 2 shooting', 'Rodaje día 2', 'Director', 11),
((SELECT id FROM tmpl), 'RODAJE', 'RODAJE', 'B-roll / extra footage', 'B-roll / material extra', 'Director de fotografía', 12),
((SELECT id FROM tmpl), 'RODAJE', 'RODAJE', 'MUA/Hair on set', 'Maquillaje/peluquería en set', 'Estilista', 13),
((SELECT id FROM tmpl), 'POSTPRODUCCION', 'POST-PRODUCCIÓN', 'Rough cut edit', 'Montaje rough cut', 'Editor', 14),
((SELECT id FROM tmpl), 'POSTPRODUCCION', 'POST-PRODUCCIÓN', 'Review and feedback', 'Revisión y feedback', 'Artista', 15),
((SELECT id FROM tmpl), 'POSTPRODUCCION', 'POST-PRODUCCIÓN', 'Color grading', 'Etalonaje/color grading', 'Colorista', 16),
((SELECT id FROM tmpl), 'POSTPRODUCCION', 'POST-PRODUCCIÓN', 'VFX/Graphics', 'VFX/Gráficos', 'VFX Artist', 17),
((SELECT id FROM tmpl), 'POSTPRODUCCION', 'POST-PRODUCCIÓN', 'Final master', 'Master final', 'Editor', 18),
((SELECT id FROM tmpl), 'POSTPRODUCCION', 'POST-PRODUCCIÓN', 'Deliver to platforms', 'Entregar a plataformas', 'Administración', 19);

-- Insert items for Campaña de Sync (18 tasks)
WITH tmpl AS (SELECT id FROM public.checklist_templates WHERE name_es = 'Campaña de Sync' AND is_system_template = true LIMIT 1)
INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, owner_label_es, sort_order) VALUES
((SELECT id FROM tmpl), 'PREPARACION', 'PREPARACIÓN', 'Curate sync catalog', 'Curar catálogo de sync', 'A&R', 0),
((SELECT id FROM tmpl), 'PREPARACION', 'PREPARACIÓN', 'Prepare stems/instrumentals', 'Preparar stems/instrumentales', 'Producción', 1),
((SELECT id FROM tmpl), 'PREPARACION', 'PREPARACIÓN', 'Create one-sheet per song', 'Crear one-sheet por canción', 'Marketing', 2),
((SELECT id FROM tmpl), 'PREPARACION', 'PREPARACIÓN', 'Verify rights ownership', 'Verificar titularidad de derechos', 'Legal', 3),
((SELECT id FROM tmpl), 'PREPARACION', 'PREPARACIÓN', 'Metadata and cue sheets', 'Metadatos y cue sheets', 'Administración', 4),
((SELECT id FROM tmpl), 'PITCHING', 'PITCHING', 'Identify target supervisors', 'Identificar supervisores target', 'Sync Manager', 5),
((SELECT id FROM tmpl), 'PITCHING', 'PITCHING', 'Build pitch deck', 'Crear pitch deck', 'Sync Manager', 6),
((SELECT id FROM tmpl), 'PITCHING', 'PITCHING', 'Submit to sync libraries', 'Enviar a librerías de sync', 'Sync Manager', 7),
((SELECT id FROM tmpl), 'PITCHING', 'PITCHING', 'Direct outreach to supervisors', 'Contacto directo con supervisores', 'Sync Manager', 8),
((SELECT id FROM tmpl), 'PITCHING', 'PITCHING', 'Follow-up on submissions', 'Seguimiento de envíos', 'Sync Manager', 9),
((SELECT id FROM tmpl), 'PITCHING', 'PITCHING', 'Attend sync conferences', 'Asistir a conferencias de sync', 'Sync Manager', 10),
((SELECT id FROM tmpl), 'NEGOCIACION', 'NEGOCIACIÓN', 'Review license request', 'Revisar solicitud de licencia', 'Legal', 11),
((SELECT id FROM tmpl), 'NEGOCIACION', 'NEGOCIACIÓN', 'Negotiate terms and fee', 'Negociar términos y fee', 'Manager', 12),
((SELECT id FROM tmpl), 'NEGOCIACION', 'NEGOCIACIÓN', 'Draft sync license', 'Redactar licencia de sync', 'Legal', 13),
((SELECT id FROM tmpl), 'NEGOCIACION', 'NEGOCIACIÓN', 'Approve license terms', 'Aprobar términos de licencia', 'Artista', 14),
((SELECT id FROM tmpl), 'CIERRE', 'CIERRE', 'Sign license agreement', 'Firmar acuerdo de licencia', 'Legal', 15),
((SELECT id FROM tmpl), 'CIERRE', 'CIERRE', 'Deliver final assets', 'Entregar assets finales', 'Producción', 16),
((SELECT id FROM tmpl), 'CIERRE', 'CIERRE', 'Track placement and payment', 'Seguimiento de placement y cobro', 'Administración', 17);
