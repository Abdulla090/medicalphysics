import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from '@/contexts/AuthContext';

interface QuizAttemptResult {
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
}

export const useQuiz = (lessonId?: string) => {
  const { user } = useAuth();

  // Get quizzes for a lesson
  const quizzes = useQuery(
    api.api.getQuizzesByLesson,
    lessonId ? { lessonId: lessonId as Id<"lessons"> } : "skip"
  );

  const quiz = quizzes?.[0] || null;

  // Get quiz questions if we have a quiz
  const quizWithQuestions = useQuery(
    api.api.getQuizById,
    quiz?._id ? { id: quiz._id } : "skip"
  );

  const questions = quizWithQuestions?.questions ?? [];

  // For quiz attempts, we'd need to add this to the convex api
  // For now, we'll handle quiz submission locally
  const submitQuizLocal = async (answers: Record<string, string>): Promise<QuizAttemptResult> => {
    if (!quiz || !questions.length) throw new Error('Missing quiz data');

    let correctCount = 0;
    questions.forEach((q: any) => {
      if (answers[q._id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= quiz.passingScore;

    return {
      score,
      passed,
      correctCount,
      totalQuestions: questions.length,
    };
  };

  return {
    quiz: quiz ? {
      id: quiz._id,
      lesson_id: quiz.lessonId,
      title: quiz.title,
      description: quiz.description,
      passing_score: quiz.passingScore,
      is_published: quiz.isPublished,
    } : null,
    questions: questions.map((q: any) => ({
      id: q._id,
      quiz_id: q.quizId,
      question_text: q.questionText,
      question_type: q.questionType,
      options: q.options,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
      order_index: q.orderIndex,
    })),
    attempts: [],
    bestScore: 0,
    hasPassed: false,
    isLoading: quizzes === undefined || (quiz && quizWithQuestions === undefined),
    submitQuiz: {
      mutateAsync: submitQuizLocal,
      isPending: false,
    },
  };
};

// Admin hooks are no longer needed as we use Convex mutations directly in QuizEditor
export const useAdminQuiz = () => {
  // This is a placeholder - the QuizEditor now uses Convex mutations directly
  return {
    createQuiz: { mutateAsync: async () => ({}) },
    updateQuiz: { mutateAsync: async () => ({}) },
    deleteQuiz: { mutate: () => { } },
    addQuestion: { mutateAsync: async () => ({}) },
    updateQuestion: { mutateAsync: async () => ({}) },
    deleteQuestion: { mutate: () => { } },
  };
};
