import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { Id } from '../../convex/_generated/dataModel';

interface LessonProgress {
  _id: Id<"lesson_progress">;
  userId: string;
  lessonId: Id<"lessons">;
  completed: boolean;
  completedAt?: string;
  progressPercent: number;
}

export const useProgress = () => {
  const { user } = useAuth();
  const userId = user?.id;

  // Query user progress from Convex
  const progress = useQuery(
    api.api.getUserProgress,
    userId ? { userId } : "skip"
  ) as LessonProgress[] | undefined;

  const isLoading = progress === undefined && !!userId;

  const getLessonProgress = (lessonId: Id<"lessons">) => {
    return progress?.find(p => p.lessonId === lessonId);
  };

  const isLessonCompleted = (lessonId: Id<"lessons">) => {
    return progress?.some(p => p.lessonId === lessonId && p.completed) ?? false;
  };

  const completedCount = progress?.filter(p => p.completed).length ?? 0;

  // Mutations from Convex
  const markCompleteMutation = useMutation(api.api.markLessonComplete);
  const unmarkCompleteMutation = useMutation(api.api.unmarkLessonComplete);

  const markComplete = async (lessonId: Id<"lessons">) => {
    if (!userId) throw new Error('User not authenticated');
    await markCompleteMutation({ userId, lessonId });
  };

  const unmarkComplete = async (lessonId: Id<"lessons">) => {
    if (!userId) throw new Error('User not authenticated');
    await unmarkCompleteMutation({ userId, lessonId });
  };

  // For compatibility, returning object with mutate methods
  return {
    progress,
    isLoading,
    getLessonProgress,
    isLessonCompleted,
    completedCount,
    markComplete: {
      mutate: markComplete,
      mutateAsync: markComplete,
    },
    unmarkComplete: {
      mutate: unmarkComplete,
      mutateAsync: unmarkComplete,
    },
  };
};
