import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  progress_percent: number;
}

export const useProgress = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: progress, isLoading } = useQuery({
    queryKey: ['progress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as LessonProgress[];
    },
    enabled: !!user,
  });

  const getLessonProgress = (lessonId: string) => {
    return progress?.find(p => p.lesson_id === lessonId);
  };

  const isLessonCompleted = (lessonId: string) => {
    return progress?.some(p => p.lesson_id === lessonId && p.completed) ?? false;
  };

  const completedCount = progress?.filter(p => p.completed).length ?? 0;

  const markComplete = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const existing = getLessonProgress(lessonId);
      
      if (existing) {
        const { error } = await supabase
          .from('lesson_progress')
          .update({ 
            completed: true, 
            completed_at: new Date().toISOString(),
            progress_percent: 100 
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lesson_progress')
          .insert({ 
            user_id: user.id, 
            lesson_id: lessonId, 
            completed: true,
            completed_at: new Date().toISOString(),
            progress_percent: 100 
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', user?.id] });
    },
  });

  const updateProgress = useMutation({
    mutationFn: async ({ lessonId, percent }: { lessonId: string; percent: number }) => {
      if (!user) throw new Error('User not authenticated');
      
      const existing = getLessonProgress(lessonId);
      
      if (existing) {
        const { error } = await supabase
          .from('lesson_progress')
          .update({ progress_percent: percent })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lesson_progress')
          .insert({ 
            user_id: user.id, 
            lesson_id: lessonId, 
            progress_percent: percent 
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', user?.id] });
    },
  });

  return {
    progress,
    isLoading,
    getLessonProgress,
    isLessonCompleted,
    completedCount,
    markComplete,
    updateProgress,
  };
};
