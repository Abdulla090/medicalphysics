import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { BlockEditor } from '@/components/admin/editor/BlockEditor';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  fetchCategories,
  createLesson,
  updateLesson,
  CategoryType,
  DifficultyLevel,
} from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

const lessonSchema = z.object({
  slug: z.string().min(1, 'سلەگ پێویستە').regex(/^[a-z0-9-]+$/, 'تەنها پیتی بچووک و ژمارە و - ڕێگەپێدراوە'),
  title: z.string().min(1, 'ناونیشان پێویستە'),
  description: z.string().min(1, 'وەسف پێویستە'),
  category: z.enum(['xray', 'ct', 'mri', 'ultrasound', 'nuclear'] as const),
  duration: z.string().min(1, 'ماوە پێویستە'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced'] as const),
  instructor: z.string().min(1, 'ناوی مامۆستا پێویستە'),
  publish_date: z.string().min(1, 'بەروار پێویستە'),
  image_url: z.string().url('بەستەری وێنە دروست نییە'),
  video_id: z.string().min(1, 'ئایدی ڤیدیۆ پێویستە'),
  content: z.string().min(1, 'ناوەڕۆک پێویستە'),
  tags: z.string(),
  is_published: z.boolean(),
});

type LessonFormData = z.infer<typeof lessonSchema>;

const LessonEditor = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = id && id !== 'new';
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: existingLesson, isLoading: isLoadingLesson } = useQuery({
    queryKey: ['lesson', id],
    queryFn: async () => {
      if (!isEditing) return null;
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!isEditing,
  });

  const form = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      slug: '',
      title: '',
      description: '',
      category: 'xray',
      duration: '',
      difficulty: 'beginner',
      instructor: '',
      publish_date: new Date().toISOString().split('T')[0],
      image_url: '',
      video_id: '',
      content: '',
      tags: '',
      is_published: false,
    },
  });

  useEffect(() => {
    if (existingLesson) {
      form.reset({
        slug: existingLesson.slug,
        title: existingLesson.title,
        description: existingLesson.description,
        category: existingLesson.category as CategoryType,
        duration: existingLesson.duration,
        difficulty: existingLesson.difficulty as DifficultyLevel,
        instructor: existingLesson.instructor,
        publish_date: existingLesson.publish_date,
        image_url: existingLesson.image_url,
        video_id: existingLesson.video_id,
        content: existingLesson.content,
        tags: (existingLesson.tags || []).join(', '),
        is_published: existingLesson.is_published,
      });
    }
  }, [existingLesson, form]);

  const createMutation = useMutation({
    mutationFn: createLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
      toast({ title: 'سەرکەوتوو', description: 'وانە دروستکرا' });
      navigate('/admin/lessons');
    },
    onError: (error: Error) => {
      toast({ 
        title: 'هەڵە', 
        description: error.message.includes('duplicate') 
          ? 'ئەم سلەگە پێشتر بەکارهاتووە' 
          : 'دروستکردن سەرکەوتوو نەبوو', 
        variant: 'destructive' 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<LessonFormData>) => updateLesson(id!, {
      ...data,
      tags: data.tags?.split(',').map((t) => t.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
      toast({ title: 'سەرکەوتوو', description: 'وانە نوێکرایەوە' });
      navigate('/admin/lessons');
    },
    onError: () => {
      toast({ title: 'هەڵە', description: 'نوێکردنەوە سەرکەوتوو نەبوو', variant: 'destructive' });
    },
  });

  const onSubmit = (data: LessonFormData) => {
    const tags = data.tags.split(',').map((t) => t.trim()).filter(Boolean);

    if (isEditing) {
      updateMutation.mutate({ ...data, tags } as any);
    } else {
      createMutation.mutate({ ...data, tags } as any);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEditing && isLoadingLesson) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/lessons')}>
            <ArrowRight className="h-4 w-4 ml-2" />
            گەڕانەوە
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditing ? 'دەستکاری وانە' : 'وانەی نوێ'}
            </h1>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>زانیاری سەرەکی</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ناونیشان</FormLabel>
                        <FormControl>
                          <Input placeholder="وێنەگرتنی سنگ PA و Lateral" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سلەگ (بەستەر)</FormLabel>
                        <FormControl>
                          <Input placeholder="chest-xray-pa-lateral" dir="ltr" {...field} />
                        </FormControl>
                        <FormDescription>تەنها پیتی بچووکی ئینگلیزی، ژمارە و -</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وەسف</FormLabel>
                      <FormControl>
                        <Textarea placeholder="وەسفی کورت..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>بەش</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="بەشێک هەڵبژێرە" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ئاستی</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beginner">سەرەتایی</SelectItem>
                            <SelectItem value="intermediate">ناوەندی</SelectItem>
                            <SelectItem value="advanced">پێشکەوتوو</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ماوە</FormLabel>
                        <FormControl>
                          <Input placeholder="١٥ خولەک" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="instructor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>مامۆستا</FormLabel>
                        <FormControl>
                          <Input placeholder="د. ئاسۆ محمد" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="publish_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>بەرواری بڵاوکردنەوە</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>میدیا</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>بەستەری وێنە</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." dir="ltr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="video_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ئایدی ڤیدیۆی یوتیوب</FormLabel>
                      <FormControl>
                        <Input placeholder="dQw4w9WgXcQ" dir="ltr" {...field} />
                      </FormControl>
                      <FormDescription>
                        تەنها ئایدی ڤیدیۆکە، نەک هەموو بەستەرەکە
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ناوەڕۆک</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ناوەڕۆکی وانە</FormLabel>
                      <FormControl>
                        <BlockEditor
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاگەکان</FormLabel>
                      <FormControl>
                        <Input placeholder="سنگ, تیشکی ئێکس, PA" {...field} />
                      </FormControl>
                      <FormDescription>تاگەکان بە کۆما جیابکەرەوە</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <FormField
                    control={form.control}
                    name="is_published"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-4">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div>
                          <FormLabel className="text-base">بڵاوکردنەوە</FormLabel>
                          <FormDescription>
                            وانە بۆ هەمووان دەردەکەوێت
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'نوێکردنەوە' : 'دروستکردن'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
};

export default LessonEditor;
