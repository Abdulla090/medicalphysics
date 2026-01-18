-- Fix function search path for get_category_lesson_count
CREATE OR REPLACE FUNCTION public.get_category_lesson_count(cat_id category_type)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.lessons
  WHERE category = cat_id AND is_published = true
$$;