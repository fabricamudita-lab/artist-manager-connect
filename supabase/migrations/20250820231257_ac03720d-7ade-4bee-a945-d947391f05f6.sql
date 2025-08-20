-- Insert remaining template items for Music Video
INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, owner_label_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'Treatment + budget approved', 'Treatment + presupuesto aprobados', 'Dirección/Producción', 0, 'SHOOT_DAY'::public.due_anchor, -21
FROM checklist_templates t WHERE t.name = 'Music Video'
UNION ALL
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'Casting, locations and permits OK', 'Casting, localizaciones y permisos OK', 'Producción', 1, 'SHOOT_DAY'::public.due_anchor, -14
FROM checklist_templates t WHERE t.name = 'Music Video'
UNION ALL
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'Crew and technical equipment booked', 'Crew y equipo técnico reservados', 'Producción', 2, 'SHOOT_DAY'::public.due_anchor, -10
FROM checklist_templates t WHERE t.name = 'Music Video'
UNION ALL
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'Call sheet and shooting plan', 'Call sheet y plan de rodaje', 'Producción', 3, 'SHOOT_DAY'::public.due_anchor, -3
FROM checklist_templates t WHERE t.name = 'Music Video'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Safety briefing and releases signed', 'Briefing de seguridad y releases firmados', 'Producción', 4, 'SHOOT_DAY'::public.due_anchor, 0
FROM checklist_templates t WHERE t.name = 'Music Video'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Media/backup management (DIT)', 'Gestión de media/backup (DIT)', 'Producción', 5, 'SHOOT_DAY'::public.due_anchor, 0
FROM checklist_templates t WHERE t.name = 'Music Video'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Basic BTS (photos/making-of video)', 'BTS básico (fotos/video making-of)', 'PR/Producción', 6, 'SHOOT_DAY'::public.due_anchor, 0
FROM checklist_templates t WHERE t.name = 'Music Video'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Shooting report and incident report', 'Parte de rodaje y reporte de incidencias', 'Producción', 7, 'SHOOT_DAY'::public.due_anchor, 1
FROM checklist_templates t WHERE t.name = 'Music Video'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'Offline edit → picture lock', 'Offline edit → picture lock', 'Post', 8, 'PUBLISH_DAY'::public.due_anchor, -10
FROM checklist_templates t WHERE t.name = 'Music Video'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'Color, VFX and final mix', 'Color, VFX y mezcla final', 'Post', 9, 'PUBLISH_DAY'::public.due_anchor, -6
FROM checklist_templates t WHERE t.name = 'Music Video'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'Export masters + subtitles/lyrics', 'Export masters + subtítulos/lyrics', 'Post', 10, 'PUBLISH_DAY'::public.due_anchor, -4
FROM checklist_templates t WHERE t.name = 'Music Video'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'Thumbnails/metadata and platform delivery', 'Miniaturas/metadata y entrega a plataformas', 'Marketing/Distribución', 11, 'PUBLISH_DAY'::public.due_anchor, -2
FROM checklist_templates t WHERE t.name = 'Music Video';

-- Insert Single Release template items
INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, owner_label_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'Masters + ISRC/UPC + metadata', 'Masters + ISRC/UPC + metadata', 'Producción/Distribución', 0, 'RELEASE_DAY'::public.due_anchor, -28
FROM checklist_templates t WHERE t.name = 'Single Release'
UNION ALL
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'Final artwork and credits', 'Artwork final y créditos', 'Diseño/Management', 1, 'RELEASE_DAY'::public.due_anchor, -26
FROM checklist_templates t WHERE t.name = 'Single Release'
UNION ALL
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'Upload to distributor + editorial pitch', 'Upload a distribuidora + pitch editorial', 'Distribución', 2, 'RELEASE_DAY'::public.due_anchor, -21
FROM checklist_templates t WHERE t.name = 'Single Release'
UNION ALL
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'Pre-save + content plan (teasers)', 'Pre-save + plan de contenidos (teasers)', 'Marketing', 3, 'RELEASE_DAY'::public.due_anchor, -18
FROM checklist_templates t WHERE t.name = 'Single Release'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Post calendar and active announcements', 'Calendario de posts y anuncios activos', 'Marketing', 4, 'RELEASE_DAY'::public.due_anchor, -7
FROM checklist_templates t WHERE t.name = 'Single Release'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Landing/smartlink updated', 'Landing/smartlink actualizado', 'Marketing', 5, 'RELEASE_DAY'::public.due_anchor, -5
FROM checklist_templates t WHERE t.name = 'Single Release'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Video/visualizer/lyrics online', 'Vídeo/visualizer/lyrics online', 'Marketing/PR', 6, 'RELEASE_DAY'::public.due_anchor, -2
FROM checklist_templates t WHERE t.name = 'Single Release'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Newsletter + short press release', 'Newsletter + press release corto', 'PR/Marketing', 7, 'RELEASE_DAY'::public.due_anchor, -1
FROM checklist_templates t WHERE t.name = 'Single Release'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'Verification in stores/links', 'Verificación en tiendas/links', 'Distribución', 8, 'RELEASE_DAY'::public.due_anchor, 0
FROM checklist_templates t WHERE t.name = 'Single Release'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'W1 report: streams, playlists, saves', 'Report W1: streams, playlists, saves', 'Marketing', 9, 'RELEASE_DAY'::public.due_anchor, 7
FROM checklist_templates t WHERE t.name = 'Single Release'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'Editorial/media follow-up', 'Follow-up editorial/medios', 'PR/Management', 10, 'RELEASE_DAY'::public.due_anchor, 10
FROM checklist_templates t WHERE t.name = 'Single Release'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'W4 postmortem + next actions', 'Postmortem W4 + próximas acciones', 'Equipo', 11, 'RELEASE_DAY'::public.due_anchor, 28
FROM checklist_templates t WHERE t.name = 'Single Release';

-- Insert Monthly Meeting template items
INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, owner_label_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'Agenda and objectives', 'Agenda y objetivos', 'Management', 0, 'MEETING_DAY'::public.due_anchor, -3
FROM checklist_templates t WHERE t.name = 'Monthly Meeting'
UNION ALL
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'KPIs and review materials', 'KPIs y materiales de revisión', 'Equipo', 1, 'MEETING_DAY'::public.due_anchor, -2
FROM checklist_templates t WHERE t.name = 'Monthly Meeting'
UNION ALL
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'Invitations and roles (timekeeper, scribe)', 'Invitaciones y roles (timekeeper, scribe)', 'Management', 2, 'MEETING_DAY'::public.due_anchor, -2
FROM checklist_templates t WHERE t.name = 'Monthly Meeting'
UNION ALL
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'Shared documents prepared', 'Documentos compartidos preparados', 'Equipo', 3, 'MEETING_DAY'::public.due_anchor, -1
FROM checklist_templates t WHERE t.name = 'Monthly Meeting'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Review pending/OKRs', 'Revisión de pendientes/OKRs', 'Todos', 4, 'MEETING_DAY'::public.due_anchor, 0
FROM checklist_templates t WHERE t.name = 'Monthly Meeting'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Decisions with owner and date', 'Decisiones con responsable y fecha', 'Management', 5, 'MEETING_DAY'::public.due_anchor, 0
FROM checklist_templates t WHERE t.name = 'Monthly Meeting'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Risks/blockers and mitigations', 'Riesgos/bloqueos y mitigaciones', 'Todos', 6, 'MEETING_DAY'::public.due_anchor, 0
FROM checklist_templates t WHERE t.name = 'Monthly Meeting'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Next 3 priorities', 'Próximas 3 prioridades', 'Todos', 7, 'MEETING_DAY'::public.due_anchor, 0
FROM checklist_templates t WHERE t.name = 'Monthly Meeting'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'Minutes and tasks sent', 'Acta y tareas enviadas', 'Scribe', 8, 'MEETING_DAY'::public.due_anchor, 1
FROM checklist_templates t WHERE t.name = 'Monthly Meeting'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'Systems updated (CRM, tasks)', 'Sistemas actualizados (CRM, tareas)', 'Equipo', 9, 'MEETING_DAY'::public.due_anchor, 1
FROM checklist_templates t WHERE t.name = 'Monthly Meeting'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'Key decisions follow-up', 'Seguimiento de decisiones clave', 'Management', 10, 'MEETING_DAY'::public.due_anchor, 3
FROM checklist_templates t WHERE t.name = 'Monthly Meeting'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'Quick meeting retro', 'Retro rápida de la reunión', 'Todos', 11, 'MEETING_DAY'::public.due_anchor, 3
FROM checklist_templates t WHERE t.name = 'Monthly Meeting';

-- Insert Payments template items
INSERT INTO public.checklist_template_items (template_id, section, section_es, task, task_es, owner_label_es, sort_order, due_anchor, due_days_offset)
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'Collect invoices/receipts', 'Recopilar facturas/recibos', 'Contabilidad', 0, 'PAYRUN_DAY'::public.due_anchor, -5
FROM checklist_templates t WHERE t.name = 'Payments'
UNION ALL
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'Validate tax data and concepts', 'Validar datos fiscales y conceptos', 'Contabilidad', 1, 'PAYRUN_DAY'::public.due_anchor, -4
FROM checklist_templates t WHERE t.name = 'Payments'
UNION ALL
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'System approvals', 'Aprobaciones en sistema', 'Managers', 2, 'PAYRUN_DAY'::public.due_anchor, -3
FROM checklist_templates t WHERE t.name = 'Payments'
UNION ALL
SELECT t.id, 'PREPARATIVOS', 'PREPARATIVOS', 'Cash/flow review', 'Revisión de caja/flujo', 'Contabilidad', 3, 'PAYRUN_DAY'::public.due_anchor, -2
FROM checklist_templates t WHERE t.name = 'Payments'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Transfers issued', 'Transferencias emitidas', 'Contabilidad', 4, 'PAYRUN_DAY'::public.due_anchor, 0
FROM checklist_templates t WHERE t.name = 'Payments'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Remittance/confirmations sent', 'Remittance/confirmaciones enviadas', 'Contabilidad', 5, 'PAYRUN_DAY'::public.due_anchor, 0
FROM checklist_templates t WHERE t.name = 'Payments'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Record in accounting', 'Registro en contabilidad', 'Contabilidad', 6, 'PAYRUN_DAY'::public.due_anchor, 1
FROM checklist_templates t WHERE t.name = 'Payments'
UNION ALL
SELECT t.id, 'PRODUCCION', 'PRODUCCIÓN', 'Close related approvals', 'Cerrar aprobaciones relacionadas', 'Managers', 7, 'PAYRUN_DAY'::public.due_anchor, 1
FROM checklist_templates t WHERE t.name = 'Payments'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'Bank reconciliation', 'Conciliación bancaria', 'Contabilidad', 8, 'PAYRUN_DAY'::public.due_anchor, 2
FROM checklist_templates t WHERE t.name = 'Payments'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'File receipts', 'Archivar comprobantes', 'Contabilidad', 9, 'PAYRUN_DAY'::public.due_anchor, 2
FROM checklist_templates t WHERE t.name = 'Payments'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'Update budgets', 'Actualizar presupuestos', 'Contabilidad', 10, 'PAYRUN_DAY'::public.due_anchor, 3
FROM checklist_templates t WHERE t.name = 'Payments'
UNION ALL
SELECT t.id, 'CIERRE', 'CIERRE', 'Pending/overdue payments report', 'Informe de pagos pendiente/vencido', 'Contabilidad', 11, 'PAYRUN_DAY'::public.due_anchor, 5
FROM checklist_templates t WHERE t.name = 'Payments';