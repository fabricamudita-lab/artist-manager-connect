-- Add new request types to the existing enum
ALTER TYPE request_type ADD VALUE IF NOT EXISTS 'licencia';
ALTER TYPE request_type ADD VALUE IF NOT EXISTS 'otros';