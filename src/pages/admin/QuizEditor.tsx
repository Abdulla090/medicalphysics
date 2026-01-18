import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminQuiz } from '@/hooks/useQuiz';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { fetchLessons } from '@/lib/api';

interface Question {
  id?: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  options: string[];
  correct_answer: string;
  explanation: string;
  order_index: number;
}

const QuizEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { createQuiz, updateQuiz, addQuestion, updateQuestion, deleteQuestion } = useAdminQuiz();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [isPublished, setIsPublished] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: lessons } = useQuery({
    queryKey: ['lessons-for-quiz'],
    queryFn: () => fetchLessons(false),
    enabled: !!user && !!isAdmin,
  });

  const { data: existingQuiz, isLoading } = useQuery({
    queryKey: ['quiz-edit', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user && !!isAdmin,
  });

  const { data: existingQuestions } = useQuery({
    queryKey: ['quiz-questions-edit', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', id)
        .order('order_index');
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user && !!isAdmin,
  });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (existingQuiz) {
      setTitle(existingQuiz.title);
      setDescription(existingQuiz.description || '');
      setLessonId(existingQuiz.lesson_id);
      setPassingScore(existingQuiz.passing_score);
      setIsPublished(existingQuiz.is_published);
    }
  }, [existingQuiz]);

  useEffect(() => {
    if (existingQuestions && existingQuestions.length > 0) {
      setQuestions(existingQuestions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type as 'multiple_choice' | 'true_false',
        options: q.options as string[],
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        order_index: q.order_index,
      })));
    }
  }, [existingQuestions]);

  const addNewQuestion = () => {
    setQuestions([...questions, {
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      order_index: questions.length,
    }]);
  };

  const updateQuestionField = <K extends keyof Question>(index: number, field: K, value: Question[K]) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    const q = questions[index];
    if (q.id) {
      deleteQuestion.mutate(q.id);
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title || !lessonId) {
      toast.error('تکایە ناونیشان و وانە دیاری بکە');
      return;
    }

    if (questions.some(q => !q.question_text || !q.correct_answer)) {
      toast.error('تکایە هەموو پرسیارەکان تەواو بکە');
      return;
    }

    setSaving(true);

    try {
      let quizId = id;

      if (id) {
        await updateQuiz.mutateAsync({
          id,
          title,
          description,
          lesson_id: lessonId,
          passing_score: passingScore,
          is_published: isPublished,
        });
      } else {
        const result = await createQuiz.mutateAsync({
          title,
          description,
          lesson_id: lessonId,
          passing_score: passingScore,
          is_published: isPublished,
        });
        quizId = result.id;
      }

      // Save questions
      for (const [index, q] of questions.entries()) {
        const questionData = {
          quiz_id: quizId!,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options.filter(o => o.trim() !== ''),
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          order_index: index,
        };

        if (q.id) {
          await updateQuestion.mutateAsync({ id: q.id, ...questionData });
        } else {
          await addQuestion.mutateAsync(questionData);
        }
      }

      toast.success('تاقیکردنەوە پاشەکەوتکرا');
      navigate('/admin/quizzes');
    } catch (error) {
      toast.error('هەڵەیەک ڕوویدا');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {id ? 'دەستکاری تاقیکردنەوە' : 'تاقیکردنەوەی نوێ'}
            </h1>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'پاشەکەوتکردن...' : 'پاشەکەوتکردن'}
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Quiz Details */}
          <Card>
            <CardHeader>
              <CardTitle>زانیاری گشتی</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>ناونیشان</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ناونیشانی تاقیکردنەوە"
                  />
                </div>
                <div className="space-y-2">
                  <Label>وانە</Label>
                  <Select value={lessonId} onValueChange={setLessonId}>
                    <SelectTrigger>
                      <SelectValue placeholder="وانەیەک هەڵبژێرە" />
                    </SelectTrigger>
                    <SelectContent>
                      {lessons?.map((lesson) => (
                        <SelectItem key={lesson.id} value={lesson.id}>
                          {lesson.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>وەسف</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وەسفی تاقیکردنەوە (ئارەزوومەندانە)"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>نمرەی تێپەڕین (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <Label>بڵاوکردنەوە</Label>
                  <Switch
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>پرسیارەکان</CardTitle>
              <Button onClick={addNewQuestion} variant="outline" size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                پرسیاری نوێ
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  هیچ پرسیارێک زیادنەکراوە. کلیک لە "پرسیاری نوێ" بکە.
                </div>
              ) : (
                questions.map((q, qIndex) => (
                  <Card key={qIndex} className="border-2">
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-3" />
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-lg font-semibold">
                              پرسیاری {qIndex + 1}
                            </Label>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeQuestion(qIndex)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Label>دەقی پرسیار</Label>
                            <Textarea
                              value={q.question_text}
                              onChange={(e) => updateQuestionField(qIndex, 'question_text', e.target.value)}
                              placeholder="پرسیار بنووسە..."
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>جۆری پرسیار</Label>
                            <Select
                              value={q.question_type}
                              onValueChange={(v) => {
                                updateQuestionField(qIndex, 'question_type', v);
                                if (v === 'true_false') {
                                  updateQuestionField(qIndex, 'options', ['ڕاستە', 'هەڵەیە']);
                                } else {
                                  updateQuestionField(qIndex, 'options', ['', '', '', '']);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="multiple_choice">هەڵبژاردەی فرە</SelectItem>
                                <SelectItem value="true_false">ڕاست/هەڵە</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>هەڵبژاردەکان</Label>
                            <div className="grid gap-2">
                              {q.options.map((opt, oIndex) => (
                                <Input
                                  key={oIndex}
                                  value={opt}
                                  onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                  placeholder={`هەڵبژاردەی ${oIndex + 1}`}
                                  disabled={q.question_type === 'true_false'}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>وەڵامی دروست</Label>
                            <Select
                              value={q.correct_answer}
                              onValueChange={(v) => updateQuestionField(qIndex, 'correct_answer', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="وەڵامی دروست هەڵبژێرە" />
                              </SelectTrigger>
                              <SelectContent>
                                {q.options.filter(o => o.trim()).map((opt, i) => (
                                  <SelectItem key={i} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>ڕوونکردنەوە (ئارەزوومەندانە)</Label>
                            <Textarea
                              value={q.explanation}
                              onChange={(e) => updateQuestionField(qIndex, 'explanation', e.target.value)}
                              placeholder="ڕوونکردنەوەی وەڵام..."
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default QuizEditor;
