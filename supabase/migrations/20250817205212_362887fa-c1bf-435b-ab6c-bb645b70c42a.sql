-- Add hora column to booking_offers table
ALTER TABLE booking_offers ADD COLUMN IF NOT EXISTS hora time;

-- Update existing template configuration to match new order
-- First, let's update the labels and reorder

-- Hora (new field) - position 6
INSERT INTO booking_template_config (field_name, field_label, field_type, field_order, is_required, is_active, created_by)
VALUES ('hora', 'Hora', 'time', 6, false, true, '00000000-0000-0000-0000-000000000000')
ON CONFLICT (field_name) DO UPDATE SET
    field_label = EXCLUDED.field_label,
    field_order = EXCLUDED.field_order,
    field_type = EXCLUDED.field_type,
    updated_at = now();

-- Update existing fields to new order and labels
UPDATE booking_template_config SET field_order = 7, updated_at = now() WHERE field_name = 'estado';
UPDATE booking_template_config SET field_order = 8, updated_at = now() WHERE field_name = 'oferta';
UPDATE booking_template_config SET field_order = 9, updated_at = now() WHERE field_name = 'formato';
UPDATE booking_template_config SET field_order = 10, updated_at = now() WHERE field_name = 'contacto';

-- Split tour_manager into two fields: invis and tour_manager
-- Update existing tour_manager to be just "Invis"
UPDATE booking_template_config SET 
    field_label = 'Invis', 
    field_order = 11, 
    updated_at = now() 
WHERE field_name = 'tour_manager';

-- Add new tour_manager field
INSERT INTO booking_template_config (field_name, field_label, field_type, field_order, is_required, is_active, created_by)
VALUES ('tour_manager_new', 'Tour manager', 'text', 12, false, true, '00000000-0000-0000-0000-000000000000')
ON CONFLICT (field_name) DO UPDATE SET
    field_label = EXCLUDED.field_label,
    field_order = EXCLUDED.field_order,
    updated_at = now();

-- Add tour_manager_new column to booking_offers
ALTER TABLE booking_offers ADD COLUMN IF NOT EXISTS tour_manager_new text;

-- Update info_comentarios label and order
UPDATE booking_template_config SET 
    field_label = 'Info / Contactos', 
    field_order = 13, 
    updated_at = now() 
WHERE field_name = 'info_comentarios';

-- Update condiciones order
UPDATE booking_template_config SET field_order = 14, updated_at = now() WHERE field_name = 'condiciones';

-- Merge link_venta and inicio_venta into one field
-- Update link_venta to be "Link de venta / Inicio venta"
UPDATE booking_template_config SET 
    field_label = 'Link de venta / Inicio venta', 
    field_order = 15, 
    updated_at = now() 
WHERE field_name = 'link_venta';

-- Deactivate inicio_venta since we're merging it
UPDATE booking_template_config SET 
    is_active = false, 
    updated_at = now() 
WHERE field_name = 'inicio_venta';

-- Update contratos order
UPDATE booking_template_config SET field_order = 16, updated_at = now() WHERE field_name = 'contratos';