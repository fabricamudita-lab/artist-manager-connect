-- Add missing values to the request_type enum
ALTER TYPE request_type ADD VALUE IF NOT EXISTS 'consulta';
ALTER TYPE request_type ADD VALUE IF NOT EXISTS 'informacion';