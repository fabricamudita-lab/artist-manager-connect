-- Extend the request_status enum to include the new types
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'consulta';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'informacion';

-- Update the solicitudes table to allow these new values
-- Note: Since we're using request_status enum for the 'tipo' field,
-- we need to update the enum instead of creating a new one