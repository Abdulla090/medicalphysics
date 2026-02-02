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
import { DifficultyLevel } from '@/lib/api';

interface CourseLesson {
  lessonId: string;
  orderIndex: number;
  title?: string;
}

const CourseEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('beginner');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [courseLessons, setCourseLessons] = useState<CourseLesson[]>([]);
  const [saving, setSaving] = useState(false);

  // Convex queries
  const availableLessons = useQuery(api.api.getLessons);
  const existingCourse = useQuery(api.api.getCourseById,
    id ? { id: id as Id<"courses"> } : "skip"
  );

  // Convex mutations
  const createCourse = useMutation(api.admin_actions.createCourse);
  const updateCourse = useMutation(api.admin_actions.updateCourse);
  const addLessonToCourse = useMutation(api.admin_actions.addLessonToCourse);
  const removeLessonFromCourse = useMutation(api.admin_actions.removeLessonFromCourse);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (existingCourse) {
      setTitle(existingCourse.title);
      setSlug(existingCourse.slug);
      setDescription(existingCourse.description || '');
      setImageUrl(existingCourse.imageUrl || '');
      setDifficulty(existingCourse.difficulty as DifficultyLevel);
      setEstimatedDuration(existingCourse.estimatedDuration || '');
      setIsPublished(existingCourse.isPublished);

      if (existingCourse.lessons) {
        setCourseLessons(existingCourse.lessons.map((cl: any) => ({
          lessonId: cl.lessonId,
          orderIndex: cl.orderIndex,
          title: cl.lesson?.title,
        })));
      }
    }
  }, [existingCourse]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!id && title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  }, [title, id]);

  const addLesson = (lessonId: string) => {
    if (courseLessons.some(cl => cl.lessonId === lessonId)) {
      toast.error('ئەم وانەیە پێشتر زیادکراوە');
      return;
    }
    const lesson = availableLessons?.find(l => l._id === lessonId);
    setCourseLessons([...courseLessons, {
      lessonId: lessonId,
      orderIndex: courseLessons.length,
      title: lesson?.title,
    }]);
  };

  const removeLesson = (index: number) => {
    setCourseLessons(courseLessons.filter((_, i) => i !== index));
  };

  const moveLesson = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= courseLessons.length) return;

    const updated = [...courseLessons];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setCourseLessons(updated.map((cl, i) => ({ ...cl, orderIndex: i })));
  };

  const handleSave = async () => {
    if (!title || !slug) {
      toast.error('تکایە ناونیشان و سلەگ دیاری بکە');
      return;
    }

    setSaving(true);

    try {
      let courseId: Id<"courses">;

      const courseData = {
        title,
        slug,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        difficulty: difficulty as "beginner" | "intermediate" | "advanced",
        estimatedDuration: estimatedDuration || undefined,
        isPublished,
        orderIndex: 0,
      };

      if (id) {
        await updateCourse({
          id: id as Id<"courses">,
          ...courseData
        });
        courseId = id as Id<"courses">;
      } else {
        courseId = await createCourse(courseData);
      }

      // For new courses or updates, we need to manage course lessons
      // First get existing course lessons to delete them
      if (existingCourse?.lessons) {
        for (const cl of existingCourse.lessons) {
          await removeLessonFromCourse({ id: cl._id });
        }
      }

      // Insert new course lessons
      for (let i = 0; i < courseLessons.length; i++) {
        await addLessonToCourse({
          courseId,
          lessonId: courseLessons[i].lessonId as Id<"lessons">,
          orderIndex: i,
        });
      }

      toast.success('کۆرس پاشەکەوتکرا');
      navigate('/admin/courses');
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

  const isLoading = id && existingCourse === undefined;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {id ? 'دەستکاری کۆرس' : 'کۆرسی نوێ'}
            </h1>
          </div>
          <Button onClick={handleSave} disabled={saving || isLoading} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'پاشەکەوتکردن...' : 'پاشەکەوتکردن'}
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Course Details */}
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
                    placeholder="ناونیشانی کۆرس"
                  />
                </div>
                <div className="space-y-2">
                  <Label>سلەگ (URL)</Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="course-slug"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>وەسف</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وەسفی کۆرس"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>لینکی وێنە</Label>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>ئاستی قورسی</Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as DifficultyLevel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">سەرەتایی</SelectItem>
                      <SelectItem value="intermediate">ناوەندی</SelectItem>
                      <SelectItem value="advanced">پێشکەوتوو</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ماوەی تەخمینی</Label>
                  <Input
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                    placeholder="٢ کاتژمێر"
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

          {/* Course Lessons */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>وانەکانی کۆرس</CardTitle>
              <Select onValueChange={addLesson}>
                <SelectTrigger className="w-[200px]">
                  <Plus className="h-4 w-4 ml-2" />
                  <span>زیادکردنی وانە</span>
                </SelectTrigger>
                <SelectContent>
                  {availableLessons?.filter(l =>
                    !courseLessons.some(cl => cl.lessonId === l._id)
                  ).map((lesson) => (
                    <SelectItem key={lesson._id} value={lesson._id}>
                      {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {courseLessons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  هیچ وانەیەک زیادنەکراوە. وانەکان زیاد بکە بۆ ڕیزبەندیکردنیان.
                </div>
              ) : (
                <div className="space-y-2">
                  {courseLessons.map((cl, index) => (
                    <div
                      key={cl.lessonId}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="flex-1 font-medium">
                        {cl.title || availableLessons?.find(l => l._id === cl.lessonId)?.title}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveLesson(index, 'up')}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveLesson(index, 'down')}
                          disabled={index === courseLessons.length - 1}
                        >
                          ↓
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLesson(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CourseEditor;
