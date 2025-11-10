-- Delete duplicate template fields, keeping only the oldest record for each field_name
DELETE FROM booking_template_config
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           field_name,
           ROW_NUMBER() OVER (PARTITION BY field_name ORDER BY created_at ASC) as row_num
    FROM booking_template_config
  ) sub
  WHERE row_num > 1
);