ALTER TABLE public.pitches
  ADD COLUMN IF NOT EXISTS audio_link TEXT,
  ADD COLUMN IF NOT EXISTS instruments TEXT,
  ADD COLUMN IF NOT EXISTS artist_photos_link TEXT,
  ADD COLUMN IF NOT EXISTS video_link TEXT,
  ADD COLUMN IF NOT EXISTS spotify_photos_link TEXT,
  ADD COLUMN IF NOT EXISTS additional_info TEXT,
  ADD COLUMN IF NOT EXISTS artist_bio TEXT;