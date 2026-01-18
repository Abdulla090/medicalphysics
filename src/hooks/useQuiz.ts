import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  passing_score: number;
  is_published: boolean;
}

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  options: string[];
  correct_answer: string;
  explanation: string | null;
  order_index: number;
}

interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  passed: boolean;
  answers: Record<string, string>;
  completed_at: string;
}

export const useQuiz = (lessonId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: quiz, isLoading: quizLoading } = useQuery({
    queryKey: ['quiz', lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('is_published', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as Quiz | null;
    },
    enabled: !!lessonId,
  });

  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['quiz-questions', quiz?.id],
    queryFn: async () => {
      if (!quiz?.id) return [];
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('order_index');
      
      if (error) throw error;
      return data as QuizQuestion[];
    },
    enabled: !!quiz?.id,
  });

  const { data: attempts } = useQuery({
    queryKey: ['quiz-attempts', quiz?.id, user?.id],
    queryFn: async () => {
      if (!quiz?.id || !user?.id) return [];
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quiz.id)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data as QuizAttempt[];
    },
    enabled: !!quiz?.id && !!user?.id,
  });

  const bestScore = attempts?.reduce((max, attempt) => 
    attempt.score > max ? attempt.score : max, 0
  ) ?? 0;

  const hasPassed = attempts?.some(attempt => attempt.passed) ?? false;

  const submitQuiz = useMutation({
    mutationFn: async (answers: Record<string, string>) => {
      if (!quiz || !user || !questions) throw new Error('Missing data');

      let correctCount = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.correct_answer) {
          correctCount++;
        }
      });

      const score = Math.round((correctCount / questions.length) * 100);
      const passed = score >= quiz.passing_score;

      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          quiz_id: quiz.id,
          score,
          passed,
          answers,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, correctCount, totalQuestions: questions.length } as QuizAttempt & { correctCount: number; totalQuestions: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-attempts', quiz?.id, user?.id] });
    },
  });

  return {
    quiz,
    questions,
    attempts,
    bestScore,
    hasPassed,
    isLoading: quizLoading || questionsLoading,
    submitQuiz,
  };
};

// Admin hooks for quiz management
export const useAdminQuiz = () => {
  const queryClient = useQueryClient();

  const createQuiz = useMutation({
    mutationFn: async (quizData: Omit<Quiz, 'id'>) => {
      const { data, error } = await supabase
        .from('quizzes')
        .insert(quizData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });

  const updateQuiz = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Quiz> & { id: string }) => {
      const { error } = await supabase
        .from('quizzes')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });

  const deleteQuiz = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });

  const addQuestion = useMutation({
    mutationFn: async (questionData: Omit<QuizQuestion, 'id'>) => {
      const { data, error } = await supabase
        .from('quiz_questions')
        .insert(questionData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', variables.quiz_id] });
    },
  });

  const updateQuestion = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QuizQuestion> & { id: string }) => {
      const { error } = await supabase
        .from('quiz_questions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
    },
  });

  return {
    createQuiz,
    updateQuiz,
    deleteQuiz,
    addQuestion,
    updateQuestion,
    deleteQuestion,
  };
};
