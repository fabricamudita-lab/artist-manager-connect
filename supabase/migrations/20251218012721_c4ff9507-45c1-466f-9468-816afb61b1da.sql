-- Create enum for team categories
CREATE TYPE public.team_category AS ENUM (
  'banda',
  'artistico',
  'tecnico',
  'management',
  'comunicacion',
  'legal',
  'otro'
);

-- Add team_category column to workspace_memberships
ALTER TABLE public.workspace_memberships 
ADD COLUMN team_category public.team_category DEFAULT 'otro';