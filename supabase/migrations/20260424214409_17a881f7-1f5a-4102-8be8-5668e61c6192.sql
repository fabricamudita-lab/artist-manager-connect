-- 1. Columna FK
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS linked_artist_id uuid
  REFERENCES public.artists(id) ON DELETE SET NULL;

-- 2. Índice parcial
CREATE INDEX IF NOT EXISTS idx_contacts_linked_artist_id
  ON public.contacts(linked_artist_id)
  WHERE linked_artist_id IS NOT NULL;

-- 3. Backfill: matching por nombre normalizado (minúsculas + sin acentos comunes + espacios colapsados)
WITH norm_artists AS (
  SELECT
    a.id AS artist_id,
    a.created_by,
    lower(regexp_replace(
      translate(coalesce(a.stage_name, a.name),
        'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
        'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'),
      '\s+', ' ', 'g')) AS norm_name
  FROM public.artists a
  WHERE a.artist_type = 'roster'
),
norm_contacts AS (
  SELECT
    c.id AS contact_id,
    c.created_by,
    lower(regexp_replace(
      translate(coalesce(c.stage_name, c.name),
        'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
        'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'),
      '\s+', ' ', 'g')) AS norm_name
  FROM public.contacts c
  WHERE c.linked_artist_id IS NULL
)
UPDATE public.contacts c
SET linked_artist_id = na.artist_id
FROM norm_contacts nc
JOIN norm_artists na
  ON na.created_by = nc.created_by
 AND na.norm_name  = nc.norm_name
WHERE c.id = nc.contact_id;