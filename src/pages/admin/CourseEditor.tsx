import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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
import { fetchLessons, DifficultyLevel } from '@/lib/api';

interface CourseLesson {
  lesson_id: string;
  order_index: number;
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

  const { data: availableLessons } = useQuery({
    queryKey: ['lessons-for-course'],
    queryFn: () => fetchLessons(false),
    enabled: !!user && !!isAdmin,
  });

  const { data: existingCourse, isLoading } = useQuery({
    queryKey: ['course-edit', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user && !!isAdmin,
  });

  const { data: existingCourseLessons } = useQuery({
    queryKey: ['course-lessons-edit', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('course_lessons')
        .select('lesson_id, order_index, lessons(title)')
        .eq('course_id', id)
        .order('order_index');
      if (error) throw error;
      return data.map(cl => ({
        lesson_id: cl.lesson_id,
        order_index: cl.order_index,
        title: (cl.lessons as { title: string })?.title,
      }));
    },
    enabled: !!id && !!user && !!isAdmin,
  });

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
      setImageUrl(existingCourse.image_url || '');
      setDifficulty(existingCourse.difficulty as DifficultyLevel);
      setEstimatedDuration(existingCourse.estimated_duration || '');
      setIsPublished(existingCourse.is_published);
    }
  }, [existingCourse]);

  useEffect(() => {
    if (existingCourseLessons && existingCourseLessons.length > 0) {
      setCourseLessons(existingCourseLessons);
    }
  }, [existingCourseLessons]);

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
    if (courseLessons.some(cl => cl.lesson_id === lessonId)) {
      toast.error('ئەم وانەیە پێشتر زیادکراوە');
      return;
    }
    const lesson = availableLessons?.find(l => l.id === lessonId);
    setCourseLessons([...courseLessons, {
      lesson_id: lessonId,
      order_index: courseLessons.length,
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
    setCourseLessons(updated.map((cl, i) => ({ ...cl, order_index: i })));
  };

  const handleSave = async () => {
    if (!title || !slug) {
      toast.error('تکایە ناونیشان و سلەگ دیاری بکە');
      return;
    }

    setSaving(true);

    try {
      let courseId = id;

      const courseData = {
        title,
        slug,
        description,
        image_url: imageUrl || null,
        difficulty,
        estimated_duration: estimatedDuration || null,
        is_published: isPublished,
      };

      if (id) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('courses')
          .insert(courseData)
          .select()
          .single();
        if (error) throw error;
        courseId = data.id;
      }

      // Delete existing course lessons
      if (id) {
        await supabase
          .from('course_lessons')
          .delete()
          .eq('course_id', id);
      }

      // Insert new course lessons
      if (courseLessons.length > 0) {
        const { error } = await supabase
          .from('course_lessons')
          .insert(courseLessons.map((cl, index) => ({
            course_id: courseId,
            lesson_id: cl.lesson_id,
            order_index: index,
          })));
        if (error) throw error;
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

  if (authLoading || isLoading) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {id ? 'دەستکاری کۆرس' : 'کۆرسی نوێ'}
            </h1>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
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
                    !courseLessons.some(cl => cl.lesson_id === l.id)
                  ).map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
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
                      key={cl.lesson_id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="flex-1 font-medium">
                        {cl.title || availableLessons?.find(l => l.id === cl.lesson_id)?.title}
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
