// Type definitions for the application
// Note: Data fetching now uses Convex directly in components

export type CategoryType = 'xray' | 'ct' | 'mri' | 'ultrasound' | 'nuclear';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Category {
  id: CategoryType;
  name: string;
  english_name: string;
  description: string;
  icon: string;
  created_at?: string;
  updated_at?: string;
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
  created_at?: string;
  updated_at?: string;
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

// Legacy exports for backward compatibility - these are now empty functions
// Components should use Convex hooks directly instead
export const fetchCategories = async (): Promise<Category[]> => {
  console.warn('fetchCategories is deprecated. Use Convex useQuery instead.');
  return [];
};

export const fetchCategoryById = async (id: CategoryType): Promise<Category | null> => {
  console.warn('fetchCategoryById is deprecated. Use Convex useQuery instead.');
  return null;
};

export const updateCategory = async (id: CategoryType, updates: Partial<Category>): Promise<void> => {
  console.warn('updateCategory is deprecated. Use Convex useMutation instead.');
};

export const fetchLessons = async (publishedOnly = true): Promise<LessonWithCategory[]> => {
  console.warn('fetchLessons is deprecated. Use Convex useQuery instead.');
  return [];
};

export const fetchLessonBySlug = async (slug: string): Promise<LessonWithCategory | null> => {
  console.warn('fetchLessonBySlug is deprecated. Use Convex useQuery instead.');
  return null;
};

export const fetchLessonsByCategory = async (categoryId: CategoryType, publishedOnly = true): Promise<LessonWithCategory[]> => {
  console.warn('fetchLessonsByCategory is deprecated. Use Convex useQuery instead.');
  return [];
};

export const createLesson = async (lesson: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>): Promise<Lesson> => {
  console.warn('createLesson is deprecated. Use Convex useMutation instead.');
  throw new Error('Use Convex useMutation instead');
};

export const updateLesson = async (id: string, updates: Partial<Lesson>): Promise<void> => {
  console.warn('updateLesson is deprecated. Use Convex useMutation instead.');
};

export const deleteLesson = async (id: string): Promise<void> => {
  console.warn('deleteLesson is deprecated. Use Convex useMutation instead.');
};

export const fetchStats = async () => {
  console.warn('fetchStats is deprecated. Use Convex useQuery instead.');
  return { lessonsCount: 0, categoriesCount: 0 };
};

export const fetchCategoryLessonCounts = async (): Promise<Record<CategoryType, number>> => {
  console.warn('fetchCategoryLessonCounts is deprecated. Use Convex useQuery instead.');
  return { xray: 0, ct: 0, mri: 0, ultrasound: 0, nuclear: 0 };
};
