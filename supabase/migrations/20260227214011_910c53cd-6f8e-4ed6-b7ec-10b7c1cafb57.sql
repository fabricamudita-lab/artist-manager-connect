-- Add metadata columns to tracks for single/focus/video indicators
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS is_single boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_focus_track boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_type text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.tracks.is_single IS 'Whether this track is a single release';
COMMENT ON COLUMN public.tracks.is_focus_track IS 'Whether this track is the focus track for editorial pitching';
COMMENT ON COLUMN public.tracks.video_type IS 'Type of visual support: videoclip, visualiser, videolyric, or null';