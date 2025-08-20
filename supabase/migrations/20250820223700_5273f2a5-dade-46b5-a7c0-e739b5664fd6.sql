-- Add due_anchor enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.due_anchor AS ENUM (
      'SHOW_DAY',
      'PRESS_LAUNCH', 
      'SHOOT_DAY',
      'PUBLISH_DAY',
      'RELEASE_DAY',
      'MEETING_DAY',
      'PAYRUN_DAY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add Spanish columns to checklist_templates if they don't exist
DO $$ BEGIN
    ALTER TABLE public.checklist_templates ADD COLUMN name_es TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.checklist_templates ADD COLUMN description_es TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add Spanish columns and due_anchor to checklist_template_items if they don't exist
DO $$ BEGIN
    ALTER TABLE public.checklist_template_items ADD COLUMN section_es TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.checklist_template_items ADD COLUMN task_es TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.checklist_template_items ADD COLUMN due_anchor public.due_anchor;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.checklist_template_items ADD COLUMN due_days_offset INTEGER DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Update existing records to have Spanish versions
UPDATE public.checklist_templates SET 
  name_es = CASE 
    WHEN name = 'Concert' THEN 'Concierto'
    WHEN name = 'Music Video' THEN 'Videoclip'
    WHEN name = 'Press' THEN 'Prensa'
    WHEN name = 'Single Release' THEN 'Lanzamiento Single'
    WHEN name = 'Monthly Meeting' THEN 'Reunión Mensual'
    WHEN name = 'Payments' THEN 'Pagos'
    ELSE name
  END,
  description_es = CASE 
    WHEN description = 'Standard concert preparation checklist' THEN 'Lista de preparación estándar para conciertos'
    WHEN description = 'Music video production checklist' THEN 'Lista de producción de videoclip musical'
    WHEN description = 'Press and media campaign checklist' THEN 'Lista de campaña de prensa y medios'
    WHEN description = 'Single release campaign checklist' THEN 'Lista de campaña de lanzamiento de single'
    WHEN description = 'Monthly team meeting preparation' THEN 'Preparación de reunión mensual del equipo'
    WHEN description = 'Payment processing checklist' THEN 'Lista de procesamiento de pagos'
    ELSE description
  END
WHERE name_es IS NULL;

-- Update existing template items to have Spanish versions
UPDATE public.checklist_template_items SET
  section_es = CASE 
    WHEN section = 'PREPARATION' THEN 'PREPARATIVOS'
    WHEN section = 'TECHNICAL' THEN 'TÉCNICO'
    WHEN section = 'PRE-PRODUCTION' THEN 'PRE-PRODUCCIÓN'
    WHEN section = 'PRODUCTION' THEN 'PRODUCCIÓN'
    WHEN section = 'OUTREACH' THEN 'DIFUSIÓN'
    WHEN section = 'CAMPAIGN' THEN 'CAMPAÑA'
    WHEN section = 'DISTRIBUTION' THEN 'DISTRIBUCIÓN'
    WHEN section = 'PROMOTION' THEN 'PROMOCIÓN'
    WHEN section = 'FOLLOW-UP' THEN 'SEGUIMIENTO'
    WHEN section = 'REVIEW' THEN 'REVISIÓN'
    WHEN section = 'PROCESSING' THEN 'PROCESAMIENTO'
    WHEN section = 'CONFIRMATION' THEN 'CONFIRMACIÓN'
    ELSE section
  END,
  task_es = CASE 
    WHEN task = 'Book venue and confirm date' THEN 'Reservar venue y confirmar fecha'
    WHEN task = 'Arrange transportation and accommodation' THEN 'Organizar transporte y alojamiento'
    WHEN task = 'Sound check and rehearsal' THEN 'Prueba de sonido y ensayo'
    WHEN task = 'Script and storyboard approval' THEN 'Aprobación de guión y storyboard'
    WHEN task = 'Location scouting and permits' THEN 'Búsqueda de locaciones y permisos'
    WHEN task = 'Video shooting day' THEN 'Día de grabación del video'
    WHEN task = 'Prepare press kit and materials' THEN 'Preparar kit de prensa y materiales'
    WHEN task = 'Contact media outlets' THEN 'Contactar medios de comunicación'
    WHEN task = 'Launch press campaign' THEN 'Lanzar campaña de prensa'
    WHEN task = 'Master and finalize track' THEN 'Masterizar y finalizar tema'
    WHEN task = 'Upload to streaming platforms' THEN 'Subir a plataformas de streaming'
    WHEN task = 'Social media announcement' THEN 'Anuncio en redes sociales'
    WHEN task = 'Prepare agenda and materials' THEN 'Preparar agenda y materiales'
    WHEN task = 'Send meeting notes and action items' THEN 'Enviar notas de reunión y tareas'
    WHEN task = 'Review and approve pending payments' THEN 'Revisar y aprobar pagos pendientes'
    WHEN task = 'Process approved payments' THEN 'Procesar pagos aprobados'
    WHEN task = 'Send payment confirmations' THEN 'Enviar confirmaciones de pago'
    ELSE task
  END
WHERE task_es IS NULL;

-- Add due anchors to template items
UPDATE public.checklist_template_items SET
  due_anchor = CASE 
    WHEN task LIKE '%venue%' OR task LIKE '%Book%' THEN 'SHOW_DAY'
    WHEN task LIKE '%transportation%' OR task LIKE '%accommodation%' THEN 'SHOW_DAY'
    WHEN task LIKE '%Sound check%' OR task LIKE '%rehearsal%' THEN 'SHOW_DAY'
    WHEN task LIKE '%Script%' OR task LIKE '%storyboard%' THEN 'SHOOT_DAY'
    WHEN task LIKE '%Location%' OR task LIKE '%permits%' THEN 'SHOOT_DAY'
    WHEN task LIKE '%shooting%' THEN 'SHOOT_DAY'
    WHEN task LIKE '%press kit%' THEN 'PRESS_LAUNCH'
    WHEN task LIKE '%media outlets%' THEN 'PRESS_LAUNCH'
    WHEN task LIKE '%press campaign%' THEN 'PRESS_LAUNCH'
    WHEN task LIKE '%Master%' OR task LIKE '%finalize%' THEN 'RELEASE_DAY'
    WHEN task LIKE '%streaming%' THEN 'RELEASE_DAY'
    WHEN task LIKE '%Social media%' THEN 'RELEASE_DAY'
    WHEN task LIKE '%agenda%' THEN 'MEETING_DAY'
    WHEN task LIKE '%meeting notes%' THEN 'MEETING_DAY'
    WHEN task LIKE '%Review%' OR task LIKE '%approve%' THEN 'PAYRUN_DAY'
    WHEN task LIKE '%Process%' OR task LIKE '%approved payments%' THEN 'PAYRUN_DAY'
    WHEN task LIKE '%confirmations%' THEN 'PAYRUN_DAY'
    ELSE NULL
  END,
  due_days_offset = CASE 
    WHEN task LIKE '%venue%' OR task LIKE '%Book%' THEN -30
    WHEN task LIKE '%transportation%' OR task LIKE '%accommodation%' THEN -7
    WHEN task LIKE '%Sound check%' OR task LIKE '%rehearsal%' THEN 0
    WHEN task LIKE '%Script%' OR task LIKE '%storyboard%' THEN -14
    WHEN task LIKE '%Location%' OR task LIKE '%permits%' THEN -7
    WHEN task LIKE '%shooting%' THEN 0
    WHEN task LIKE '%press kit%' THEN -10
    WHEN task LIKE '%media outlets%' THEN -5
    WHEN task LIKE '%press campaign%' THEN 0
    WHEN task LIKE '%Master%' OR task LIKE '%finalize%' THEN -21
    WHEN task LIKE '%streaming%' THEN -7
    WHEN task LIKE '%Social media%' THEN 0
    WHEN task LIKE '%agenda%' THEN -3
    WHEN task LIKE '%meeting notes%' THEN 1
    WHEN task LIKE '%Review%' OR task LIKE '%approve%' THEN -2
    WHEN task LIKE '%Process%' OR task LIKE '%approved payments%' THEN 0
    WHEN task LIKE '%confirmations%' THEN 1
    ELSE 0
  END
WHERE due_anchor IS NULL;

-- Make Spanish columns not null for future inserts
ALTER TABLE public.checklist_templates ALTER COLUMN name_es SET NOT NULL;
ALTER TABLE public.checklist_template_items ALTER COLUMN section_es SET NOT NULL;
ALTER TABLE public.checklist_template_items ALTER COLUMN task_es SET NOT NULL;