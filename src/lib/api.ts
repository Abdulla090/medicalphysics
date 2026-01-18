import { supabase } from '@/integrations/supabase/client';

export type CategoryType = 'xray' | 'ct' | 'mri' | 'ultrasound' | 'nuclear';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Category {
  id: CategoryType;
  name: string;
  english_name: string;
  description: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: CategoryType;
  duration: string;
  difficulty: DifficultyLevel;
  instructor: string;
  publish_date: string;
  image_url: string;
  video_id: string;
  content: string;
  tags: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonWithCategory extends Lesson {
  categories: Category;
}

const difficultyNames: Record<DifficultyLevel, string> = {
  beginner: 'سەرەتایی',
  intermediate: 'ناوەندی',
  advanced: 'پێشکەوتوو',
};

export const getDifficultyName = (difficulty: DifficultyLevel): string => {
  return difficultyNames[difficulty];
};

// Categories API
export const fetchCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return (data || []) as Category[];
};

export const fetchCategoryById = async (id: CategoryType): Promise<Category | null> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Category | null;
};

export const updateCategory = async (id: CategoryType, updates: Partial<Category>): Promise<void> => {
  const { error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id);
  
  if (error) throw error;
};

// Lessons API
export const fetchLessons = async (publishedOnly = true): Promise<LessonWithCategory[]> => {
  let query = supabase
    .from('lessons')
    .select('*, categories(*)')
    .order('publish_date', { ascending: false });
  
  if (publishedOnly) {
    query = query.eq('is_published', true);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return (data || []) as LessonWithCategory[];
};

export const fetchLessonBySlug = async (slug: string): Promise<LessonWithCategory | null> => {
  const { data, error } = await supabase
    .from('lessons')
    .select('*, categories(*)')
    .eq('slug', slug)
    .maybeSingle();
  
  if (error) throw error;
  return data as LessonWithCategory | null;
};

export const fetchLessonsByCategory = async (categoryId: CategoryType, publishedOnly = true): Promise<LessonWithCategory[]> => {
  let query = supabase
    .from('lessons')
    .select('*, categories(*)')
    .eq('category', categoryId)
    .order('publish_date', { ascending: false });
  if (publishedOnly) {
    query = query.eq('is_published', true);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return (data || []) as LessonWithCategory[];
};

export const createLesson = async (lesson: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>): Promise<Lesson> => {
  const { data, error } = await supabase
    .from('lessons')
    .insert(lesson)
    .select()
    .single();
  
  if (error) throw error;
  return data as Lesson;
};

export const updateLesson = async (id: string, updates: Partial<Lesson>): Promise<void> => {
  const { error } = await supabase
    .from('lessons')
    .update(updates)
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteLesson = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Stats
export const fetchStats = async () => {
  const { count: lessonsCount } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true);

  const { count: categoriesCount } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true });

  return {
    lessonsCount: lessonsCount || 0,
    categoriesCount: categoriesCount || 0,
  };
};

export const fetchCategoryLessonCounts = async (): Promise<Record<CategoryType, number>> => {
  const { data, error } = await supabase
    .from('lessons')
    .select('category')
    .eq('is_published', true);
  
  if (error) throw error;
  
  const counts: Record<CategoryType, number> = {
    xray: 0,
    ct: 0,
    mri: 0,
    ultrasound: 0,
    nuclear: 0,
  };
  
  data?.forEach((lesson: { category: CategoryType }) => {
    counts[lesson.category]++;
  });
  
  return counts;
};
