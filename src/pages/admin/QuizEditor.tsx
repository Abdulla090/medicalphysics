import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Question {
  id?: string;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false';
  options: string[];
  correctAnswer: string;
  explanation: string;
  orderIndex: number;
}

const QuizEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [isPublished, setIsPublished] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  // Convex queries
  const lessons = useQuery(api.api.getLessons);
  const existingQuiz = useQuery(api.api.getQuizById,
    id ? { id: id as Id<"quizzes"> } : "skip"
  );

  // Convex mutations
  const createQuiz = useMutation(api.admin_actions.createQuiz);
  const updateQuiz = useMutation(api.admin_actions.updateQuiz);
  const createQuizQuestion = useMutation(api.admin_actions.createQuizQuestion);
  const updateQuizQuestion = useMutation(api.admin_actions.updateQuizQuestion);
  const deleteQuizQuestion = useMutation(api.admin_actions.deleteQuizQuestion);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (existingQuiz) {
      setTitle(existingQuiz.title);
      setDescription(existingQuiz.description || '');
      setLessonId(existingQuiz.lessonId);
      setPassingScore(existingQuiz.passingScore);
      setIsPublished(existingQuiz.isPublished);

      if (existingQuiz.questions) {
        setQuestions(existingQuiz.questions.map((q: any) => ({
          id: q._id,
          questionText: q.questionText,
          questionType: q.questionType as 'multiple_choice' | 'true_false',
          options: q.options as string[],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          orderIndex: q.orderIndex,
        })));
      }
    }
  }, [existingQuiz]);

  const addNewQuestion = () => {
    setQuestions([...questions, {
      questionText: '',
      questionType: 'multiple_choice',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      orderIndex: questions.length,
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

  const removeQuestion = async (index: number) => {
    const q = questions[index];
    if (q.id) {
      try {
        await deleteQuizQuestion({ id: q.id as Id<"quiz_questions"> });
      } catch (error) {
        console.error('Error deleting question:', error);
      }
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title || !lessonId) {
      toast.error('تکایە ناونیشان و وانە دیاری بکە');
      return;
    }

    if (questions.some(q => !q.questionText || !q.correctAnswer)) {
      toast.error('تکایە هەموو پرسیارەکان تەواو بکە');
      return;
    }

    setSaving(true);

    try {
      let quizId: Id<"quizzes">;

      if (id) {
        await updateQuiz({
          id: id as Id<"quizzes">,
          title,
          description: description || undefined,
          lessonId: lessonId as Id<"lessons">,
          passingScore,
          isPublished,
        });
        quizId = id as Id<"quizzes">;
      } else {
        quizId = await createQuiz({
          title,
          description: description || undefined,
          lessonId: lessonId as Id<"lessons">,
          passingScore,
          isPublished,
        });
      }

      // Save questions
      for (const [index, q] of questions.entries()) {
        const questionData = {
          quizId,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options.filter(o => o.trim() !== ''),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || undefined,
          orderIndex: index,
        };

        if (q.id) {
          await updateQuizQuestion({
            id: q.id as Id<"quiz_questions">,
            ...questionData
          });
        } else {
          await createQuizQuestion(questionData);
        }
      }

      toast.success('تاقیکردنەوە پاشەکەوتکرا');
      navigate('/admin/quizzes');
    } catch (error) {
      console.error(error);
      toast.error('هەڵەیەک ڕوویدا');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return null;
  }

  const isLoading = id && existingQuiz === undefined;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {id ? 'دەستکاری تاقیکردنەوە' : 'تاقیکردنەوەی نوێ'}
            </h1>
          </div>
          <Button onClick={handleSave} disabled={saving || isLoading} className="gap-2">
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
                        <SelectItem key={lesson._id} value={lesson._id}>
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
                              value={q.questionText}
                              onChange={(e) => updateQuestionField(qIndex, 'questionText', e.target.value)}
                              placeholder="پرسیار بنووسە..."
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>جۆری پرسیار</Label>
                            <Select
                              value={q.questionType}
                              onValueChange={(v) => {
                                const questionType = v as 'multiple_choice' | 'true_false';
                                updateQuestionField(qIndex, 'questionType', questionType);
                                if (questionType === 'true_false') {
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
                                  disabled={q.questionType === 'true_false'}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>وەڵامی دروست</Label>
                            <Select
                              value={q.correctAnswer}
                              onValueChange={(v) => updateQuestionField(qIndex, 'correctAnswer', v)}
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
