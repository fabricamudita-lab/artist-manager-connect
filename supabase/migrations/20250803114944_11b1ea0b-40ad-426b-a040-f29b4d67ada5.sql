-- Insertar perfiles de artistas de ejemplo para testing
INSERT INTO public.profiles (user_id, email, full_name, role, phone, avatar_url) VALUES
  (gen_random_uuid(), 'maria.rodriguez@example.com', 'María Rodríguez', 'artist', '+34 600 123 456', NULL),
  (gen_random_uuid(), 'carlos.mendez@example.com', 'Carlos Méndez', 'artist', '+34 600 234 567', NULL),
  (gen_random_uuid(), 'sofia.garcia@example.com', 'Sofía García', 'artist', '+34 600 345 678', NULL),
  (gen_random_uuid(), 'alejandro.lopez@example.com', 'Alejandro López', 'artist', '+34 600 456 789', NULL),
  (gen_random_uuid(), 'lucia.martin@example.com', 'Lucía Martín', 'artist', '+34 600 567 890', NULL);