-- Añadir campos específicos para presupuestos de concierto/actuación
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS festival_ciclo TEXT,
ADD COLUMN IF NOT EXISTS capacidad INTEGER,
ADD COLUMN IF NOT EXISTS formato TEXT,
ADD COLUMN IF NOT EXISTS status_negociacion TEXT CHECK (status_negociacion IN ('interes', 'oferta', 'negociacion', 'cerrado', 'cancelado')),
ADD COLUMN IF NOT EXISTS oferta TEXT,
ADD COLUMN IF NOT EXISTS condiciones TEXT,
ADD COLUMN IF NOT EXISTS invitaciones INTEGER;

-- Comentarios para documentar los nuevos campos
COMMENT ON COLUMN budgets.festival_ciclo IS 'Nombre del festival o ciclo musical';
COMMENT ON COLUMN budgets.capacidad IS 'Capacidad del venue/lugar';
COMMENT ON COLUMN budgets.formato IS 'Formato del concierto (acústico, eléctrico, etc.)';
COMMENT ON COLUMN budgets.status_negociacion IS 'Estado de la negociación del concierto';
COMMENT ON COLUMN budgets.oferta IS 'Detalles de la oferta económica';
COMMENT ON COLUMN budgets.condiciones IS 'Condiciones específicas del concierto';
COMMENT ON COLUMN budgets.invitaciones IS 'Número de invitaciones disponibles';