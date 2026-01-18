-- Create enums for category types and difficulty levels
CREATE TYPE public.category_type AS ENUM ('xray', 'ct', 'mri', 'ultrasound', 'nuclear');
CREATE TYPE public.difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create categories table
CREATE TABLE public.categories (
  id category_type PRIMARY KEY,
  name TEXT NOT NULL,
  english_name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📚',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category category_type NOT NULL REFERENCES public.categories(id),
  duration TEXT NOT NULL,
  difficulty difficulty_level NOT NULL DEFAULT 'beginner',
  instructor TEXT NOT NULL,
  publish_date DATE NOT NULL DEFAULT CURRENT_DATE,
  image_url TEXT NOT NULL,
  video_id TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for admin access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Categories policies (public read, admin write)
CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Lessons policies (published lessons public, admin full access)
CREATE POLICY "Published lessons are viewable by everyone"
  ON public.lessons FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert lessons"
  ON public.lessons FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update lessons"
  ON public.lessons FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete lessons"
  ON public.lessons FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies (users can view own role, admins can manage)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get lesson count per category
CREATE OR REPLACE FUNCTION public.get_category_lesson_count(cat_id category_type)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.lessons
  WHERE category = cat_id AND is_published = true
$$;

-- Insert initial categories
INSERT INTO public.categories (id, name, english_name, description, icon) VALUES
  ('xray', 'تیشکی ئێکس', 'X-Ray', 'فێربوونی تەکنیکی وێنەگرتن بە تیشکی ئێکس بۆ ئێسک و سنگ و گیان', '☢️'),
  ('ct', 'سی تی سکان', 'CT Scan', 'تەکنیکی وێنەگرتنی پڕ وردی سی تی بۆ پشکنینی جەستە', '🔬'),
  ('mri', 'ئێم ئار ئای', 'MRI', 'وێنەگرتن بە شوناسی مەقناتیسی بۆ گیانەوەرەکان', '🧲'),
  ('ultrasound', 'ئەلتراساوند', 'Ultrasound', 'وێنەگرتن بە دەنگی زیاتر لە بیستن بۆ سکی دایکان و ئەندامەکانی ناو', '🔊'),
  ('nuclear', 'پزیشکی ناوکی', 'Nuclear Medicine', 'تەکنیکی وێنەگرتن بە مادەی ڕادیۆئەکتیڤ', '⚛️');

-- Insert initial lessons
INSERT INTO public.lessons (slug, title, description, category, duration, difficulty, instructor, publish_date, image_url, video_id, content, tags, is_published) VALUES
  ('chest-xray-pa-lateral', 'وێنەگرتنی سنگ PA و Lateral', 'فێربوونی شوێنی ڕاست و تەکنیکی وێنەگرتنی سنگ لە دوو ئاڕاستە', 'xray', '١٥ خولەک', 'beginner', 'د. ئاسۆ محمد', '2024-12-15', 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800', 'dQw4w9WgXcQ', '## پێشەکی

وێنەگرتنی سنگ یەکێکە لە باوترین پشکنینەکانی ڕادیۆلۆجی. ئەم وانەیە تایبەتە بە فێربوونی شوێنی نەخۆش و تەکنیکی وێنەگرتن.

## شوێنی نەخۆش بۆ PA

### هەنگاوەکان:

1. **ڕاوەستان**: نەخۆش دەبێت ڕاست بوەستێت و سنگی بچەسپێت بە کاسێت
2. **شان**: هەردوو شانەکە دەبێت بەرەو پێشەوە بن
3. **چەناگە**: چەناگە دەبێت لەسەر کاسێت بێت
4. **هەناسەدان**: لە کاتی وێنەگرتندا نەخۆش هەناسەی دەگرێت', ARRAY['سنگ', 'تیشکی ئێکس', 'PA', 'Lateral'], true),
  
  ('hand-wrist-xray', 'وێنەگرتنی ئێسکی دەست و منداڵ', 'تەکنیکی وێنەگرتنی ئێسکی دەست و منداڵ لە سێ ئاڕاستە', 'xray', '١٠ خولەک', 'beginner', 'د. شادی عمر', '2024-12-10', 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800', 'dQw4w9WgXcQ', '## پێشەکی

وێنەگرتنی دەست و منداڵ یەکێکە لە باوترین پشکنینەکان بۆ دۆزینەوەی شکان و نەخۆشییەکانی ئێسک.', ARRAY['دەست', 'منداڵ', 'تیشکی ئێکس'], true),
  
  ('lumbar-spine-xray', 'وێنەگرتنی بڕبڕەی پشت', 'تەکنیکی وێنەگرتنی بڕبڕەی پشت AP و Lateral', 'xray', '٢٠ خولەک', 'intermediate', 'د. کارزان علی', '2024-12-05', 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800', 'dQw4w9WgXcQ', '## پێشەکی

وێنەگرتنی بڕبڕەی پشت گرنگە بۆ دۆزینەوەی نەخۆشییەکانی ستوونی پشت.', ARRAY['پشت', 'بڕبڕە', 'تیشکی ئێکس'], true),
  
  ('brain-ct-scan', 'سی تی سکانی مێشک', 'پرۆتۆکۆڵی سی تی سکان بۆ پشکنینی مێشک', 'ct', '٢٥ خولەک', 'intermediate', 'د. هاوژین کەریم', '2024-12-01', 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800', 'dQw4w9WgXcQ', '## پێشەکی

سی تی سکانی مێشک یەکێکە لە گرنگترین پشکنینەکان بۆ دۆزینەوەی نەخۆشییەکانی مێشک.', ARRAY['مێشک', 'سی تی', 'پرۆتۆکۆڵ'], true),
  
  ('chest-ct-scan', 'سی تی سکانی سنگ', 'پرۆتۆکۆڵی سی تی سکان بۆ پشکنینی سنگ و سیان', 'ct', '٣٠ خولەک', 'advanced', 'د. ڕێبین سەعید', '2024-11-25', 'https://images.unsplash.com/photo-1516069677018-378971e2d7d2?w=800', 'dQw4w9WgXcQ', '## پێشەکی

سی تی سکانی سنگ بۆ پشکنینی سیان و دڵ و داماڵەکان بەکاردێت.', ARRAY['سنگ', 'سی تی', 'سیان'], true),
  
  ('knee-mri', 'ئێم ئار ئای بۆ ئەژنۆ', 'پرۆتۆکۆڵی ئێم ئار ئای بۆ پشکنینی ئەژنۆ و گەمارەکانی', 'mri', '٣٥ خولەک', 'advanced', 'د. سۆران حەسەن', '2024-11-20', 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800', 'dQw4w9WgXcQ', '## پێشەکی

ئێم ئار ئای بۆ ئەژنۆ باشترین ڕێگایە بۆ پشکنینی گەمارەکان و ئێسکەکانی ئەژنۆ.', ARRAY['ئەژنۆ', 'ئێم ئار ئای', 'گەمارە'], true),
  
  ('brain-mri', 'ئێم ئار ئای بۆ مێشک', 'پرۆتۆکۆڵی ئێم ئار ئای بۆ پشکنینی مێشک و دەستەمۆ', 'mri', '٤٠ خولەک', 'advanced', 'د. ئازاد عوسمان', '2024-11-15', 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800', 'dQw4w9WgXcQ', '## پێشەکی

ئێم ئار ئای مێشک باشترین ڕێگایە بۆ پشکنینی نەخۆشییەکانی مێشک.', ARRAY['مێشک', 'ئێم ئار ئای', 'دەستەمۆ'], true),
  
  ('abdominal-ultrasound', 'ئەلتراساوندی سک', 'تەکنیکی ئەلتراساوند بۆ پشکنینی ئەندامەکانی سک', 'ultrasound', '٢٥ خولەک', 'intermediate', 'د. نیگار جەمال', '2024-11-10', 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800', 'dQw4w9WgXcQ', '## پێشەکی

ئەلتراساوندی سک بۆ پشکنینی جگەر، گورچیلە، و ئەندامەکانی ترە.', ARRAY['سک', 'ئەلتراساوند'], true),
  
  ('bone-scan', 'سکانی ئێسک', 'تەکنیکی سکانی ئێسک بە مادەی ڕادیۆئەکتیڤ', 'nuclear', '٣٠ خولەک', 'advanced', 'د. دڵشاد عەبدوڵا', '2024-11-05', 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800', 'dQw4w9WgXcQ', '## پێشەکی

سکانی ئێسک بە مادەی ڕادیۆئەکتیڤ بۆ دۆزینەوەی نەخۆشییەکانی ئێسک بەکاردێت.', ARRAY['ئێسک', 'ناوکی', 'ڕادیۆئەکتیڤ'], true);