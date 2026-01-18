-- Create courses table for learning paths
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  difficulty difficulty_level NOT NULL DEFAULT 'beginner',
  estimated_duration TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Course policies
CREATE POLICY "Published courses are viewable by everyone"
ON public.courses FOR SELECT
USING (is_published = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert courses"
ON public.courses FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update courses"
ON public.courses FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete courses"
ON public.courses FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at on courses
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create course_lessons junction table for ordering lessons within courses
CREATE TABLE public.course_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, lesson_id)
);

-- Enable RLS on course_lessons
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

-- Course lessons policies
CREATE POLICY "Course lessons viewable when course is published"
ON public.course_lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = course_lessons.course_id 
    AND (courses.is_published = true OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Admins can insert course lessons"
ON public.course_lessons FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update course lessons"
ON public.course_lessons FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete course lessons"
ON public.course_lessons FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create course progress table
CREATE TABLE public.course_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  certificate_issued BOOLEAN NOT NULL DEFAULT false,
  certificate_issued_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS on course_progress
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- Course progress policies
CREATE POLICY "Users can view their own course progress"
ON public.course_progress FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own course progress"
ON public.course_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own course progress"
ON public.course_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at on course_progress
CREATE TRIGGER update_course_progress_updated_at
BEFORE UPDATE ON public.course_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add full-text search index on lessons
CREATE INDEX idx_lessons_search ON public.lessons 
USING gin(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, '')));

-- Create function for full-text search
CREATE OR REPLACE FUNCTION public.search_lessons(search_query TEXT)
RETURNS SETOF public.lessons
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.lessons
  WHERE is_published = true
  AND (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, ''))
    @@ plainto_tsquery('simple', search_query)
    OR title ILIKE '%' || search_query || '%'
    OR description ILIKE '%' || search_query || '%'
    OR content ILIKE '%' || search_query || '%'
  )
  ORDER BY 
    CASE WHEN title ILIKE '%' || search_query || '%' THEN 0 ELSE 1 END,
    ts_rank(
      to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, '')),
      plainto_tsquery('simple', search_query)
    ) DESC
  LIMIT 50;
$$;