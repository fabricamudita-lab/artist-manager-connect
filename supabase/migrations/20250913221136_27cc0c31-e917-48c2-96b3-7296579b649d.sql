-- Update the check constraint for documents category to include all valid categories
ALTER TABLE public.documents 
DROP CONSTRAINT documents_category_check;

ALTER TABLE public.documents 
ADD CONSTRAINT documents_category_check 
CHECK (category = ANY (ARRAY[
  'contract'::text, 
  'rider'::text, 
  'setlist'::text, 
  'press'::text, 
  'legal'::text, 
  'financial'::text, 
  'other'::text
]));