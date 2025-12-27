-- Add concert-specific budget categories
INSERT INTO budget_categories (name, icon_name, sort_order, created_by) VALUES 
  ('Caché Artístico', 'Mic', 10, (SELECT user_id FROM profiles LIMIT 1)),
  ('Transporte', 'Truck', 20, (SELECT user_id FROM profiles LIMIT 1)),
  ('Alojamiento', 'Bed', 30, (SELECT user_id FROM profiles LIMIT 1)),
  ('Dietas', 'Utensils', 40, (SELECT user_id FROM profiles LIMIT 1)),
  ('Backline', 'Speaker', 50, (SELECT user_id FROM profiles LIMIT 1)),
  ('Sonido', 'Volume2', 60, (SELECT user_id FROM profiles LIMIT 1)),
  ('Iluminación', 'Lightbulb', 70, (SELECT user_id FROM profiles LIMIT 1)),
  ('Personal Técnico', 'Users', 80, (SELECT user_id FROM profiles LIMIT 1)),
  ('Rider', 'ClipboardList', 90, (SELECT user_id FROM profiles LIMIT 1)),
  ('Varios Concierto', 'MoreHorizontal', 100, (SELECT user_id FROM profiles LIMIT 1))
ON CONFLICT DO NOTHING;