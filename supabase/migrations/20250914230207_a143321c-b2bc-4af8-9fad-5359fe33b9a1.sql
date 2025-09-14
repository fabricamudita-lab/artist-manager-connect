-- Migration to update existing budget items with proper category_id values
-- This migration maps legacy category names to the new category system

-- First, let's create a function to get category_id by name for a user
CREATE OR REPLACE FUNCTION get_category_id_by_name(category_name TEXT, user_id UUID)
RETURNS UUID AS $$
DECLARE
    result_id UUID;
BEGIN
    SELECT id INTO result_id
    FROM public.budget_categories
    WHERE name = category_name AND created_by = user_id
    LIMIT 1;
    
    RETURN result_id;
END;
$$ LANGUAGE plpgsql;

-- Update existing budget items to use category_id based on their legacy category names
-- Map legacy categories to new category names

-- Update items with 'equipo_artistico' and 'rider_artistico' to 'Promoción'
UPDATE public.budget_items 
SET category_id = get_category_id_by_name('Promoción', 
    (SELECT created_by FROM public.budgets WHERE id = budget_items.budget_id LIMIT 1)
)
WHERE category IN ('equipo_artistico', 'rider_artistico') 
AND category_id IS NULL;

-- Update items with 'porcentajes' and 'equipo_tecnico' to 'Comisiones'  
UPDATE public.budget_items 
SET category_id = get_category_id_by_name('Comisiones', 
    (SELECT created_by FROM public.budgets WHERE id = budget_items.budget_id LIMIT 1)
)
WHERE category IN ('porcentajes', 'equipo_tecnico') 
AND category_id IS NULL;

-- Update items with 'transporte', 'hospedaje', 'otros_gastos', 'varios' to 'Otros Gastos'
UPDATE public.budget_items 
SET category_id = get_category_id_by_name('Otros Gastos', 
    (SELECT created_by FROM public.budgets WHERE id = budget_items.budget_id LIMIT 1)
)
WHERE category IN ('transporte', 'hospedaje', 'otros_gastos', 'varios') 
AND category_id IS NULL;

-- For any remaining items without category_id, assign them to 'Otros Gastos'
UPDATE public.budget_items 
SET category_id = get_category_id_by_name('Otros Gastos', 
    (SELECT created_by FROM public.budgets WHERE id = budget_items.budget_id LIMIT 1)
)
WHERE category_id IS NULL;

-- Clean up the function after migration
DROP FUNCTION IF EXISTS get_category_id_by_name(TEXT, UUID);