-- Add is_test_user flag to profiles table for safe cleanup
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN DEFAULT FALSE;

-- Create index for efficient test user queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_test_user 
ON public.profiles(is_test_user) 
WHERE is_test_user = true;