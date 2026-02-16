import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ArrowRight, Loader2, Upload, Link as LinkIcon, Image as ImageIcon, Video as VideoIcon, Check } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const lessonSchema = z.object({
  slug: z.string().min(1, 'سلەگ پێویستە').regex(/^[a-z0-9-]+$/, 'تەنها پیتی بچووک و ژمارە و - ڕێگەپێدراوە'),
  title: z.string().min(1, 'ناونیشان پێویستە'),
  description: z.string().min(1, 'وەسف پێویستە'),
  category: z.string().min(1, 'Category is required'),
  duration: z.string().min(1, 'ماوە پێویستە'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced'] as const),
  instructor: z.string().min(1, 'ناوی مامۆستا پێویستە'),
  publish_date: z.string().min(1, 'بەروار پێویستە'),
  image_url: z.string().optional(),
  image_storage_id: z.string().optional(),
  video_id: z.string().optional(),
  video_storage_id: z.string().optional(),
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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  const categories = useQuery(api.api.getCategories);

  // Use convex query for editing
  const existingLesson = useQuery(api.api.getLessonById,
    isEditing ? { id: id as Id<"lessons"> } : "skip"
  );

  const isLoadingLesson = isEditing && existingLesson === undefined;

  const createLessonMutation = useMutation(api.admin_actions.createLesson);
  const updateLessonMutation = useMutation(api.admin_actions.updateLesson);
  const generateUploadUrl = useMutation(api.admin_actions.generateUploadUrl);

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
      image_storage_id: '',
      video_id: '',
      video_storage_id: '',
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
        category: existingLesson.category as any,
        duration: existingLesson.duration,
        difficulty: existingLesson.difficulty as any,
        instructor: existingLesson.instructor,
        publish_date: existingLesson.publishDate || new Date().toISOString().split('T')[0],
        image_url: existingLesson.imageUrl || '',
        image_storage_id: existingLesson.imageStorageId || '',
        video_id: existingLesson.videoId || '',
        video_storage_id: existingLesson.videoStorageId || '',
        content: existingLesson.content,
        tags: (existingLesson.tags || []).join(', '),
        is_published: existingLesson.isPublished,
      });
    }
  }, [existingLesson, form]);

  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    try {
      if (type === 'image') setIsUploadingImage(true);
      else setIsUploadingVideo(true);

      // 1. Get upload URL
      const postUrl = await generateUploadUrl();

      // 2. POST the file
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) throw new Error("Upload failed");

      const { storageId } = await result.json();

      // 3. Set the form value
      if (type === 'image') {
        form.setValue('image_storage_id', storageId);
        form.setValue('image_url', ''); // Clear URL if upload is used
        toast({ title: "وێنە بارکرا", description: "وێنەکە بە سەرکەوتوویی بارکرا بۆ سێرڤەر" });
      } else {
        form.setValue('video_storage_id', storageId);
        form.setValue('video_id', ''); // Clear URL if upload is used
        toast({ title: "ڤیدیۆ بارکرا", description: "ڤیدیۆکە بە سەرکەوتوویی بارکرا بۆ سێرڤەر" });
      }

    } catch (error) {
      console.error(error);
      toast({ title: "هەڵە", description: "بارکردنی فایل سەرکەوتوو نەبوو", variant: "destructive" });
    } finally {
      if (type === 'image') setIsUploadingImage(false);
      else setIsUploadingVideo(false);
    }
  };

  const onSubmit = async (data: LessonFormData) => {
    const tagsArray = data.tags.split(',').map((t) => t.trim()).filter(Boolean);

    // Convert empty strings to undefined for optional fields
    const imageUrl = data.image_url && data.image_url.trim() !== '' ? data.image_url : undefined;
    const videoId = data.video_id && data.video_id.trim() !== '' ? data.video_id : undefined;
    // Cast storage IDs to Id<"_storage"> or undefined - explicit empty string check
    const imageStorageId = data.image_storage_id && data.image_storage_id.trim() !== ''
      ? (data.image_storage_id as Id<"_storage">)
      : undefined;
    const videoStorageId = data.video_storage_id && data.video_storage_id.trim() !== ''
      ? (data.video_storage_id as Id<"_storage">)
      : undefined;

    const payload = {
      title: data.title,
      slug: data.slug,
      description: data.description,
      content: data.content,
      imageUrl: imageUrl,
      imageStorageId: imageStorageId,
      videoId: videoId,
      videoStorageId: videoStorageId,
      duration: data.duration,
      difficulty: data.difficulty,
      category: data.category,
      instructor: data.instructor,
      isPublished: data.is_published,
      tags: tagsArray,
      publishDate: data.publish_date,
    };

    try {
      if (isEditing) {
        await updateLessonMutation({
          id: id as Id<"lessons">,
          ...payload
        });
        toast({ title: 'سەرکەوتوو', description: 'وانە نوێکرایەوە' });
      } else {
        await createLessonMutation(payload);
        toast({ title: 'سەرکەوتوو', description: 'وانە دروستکرا' });
      }
      navigate('/admin/lessons');
    } catch (error: any) {
      toast({
        title: 'هەڵە',
        description: error.message.includes('Duplicate')
          ? 'ئەم سلەگە پێشتر بەکارهاتووە'
          : 'کردارەکە سەرکەوتوو نەبوو:\n' + error.message,
        variant: 'destructive'
      });
    }
  };

  const isSubmitting = false;

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
                        <FormLabel>بەش (Category ID)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="بەشێک هەڵبژێرە" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <div className="flex items-center gap-2">
                                  <span>{cat.icon}</span>
                                  <span>{cat.name}</span>
                                </div>
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
                <CardTitle>میدیا (وێنە و ڤیدیۆ)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Image Section */}
                <div className="space-y-4 border p-4 rounded-md">
                  <h3 className="font-medium flex items-center gap-2"><ImageIcon className="w-4 h-4" /> وێنەی وانە</h3>
                  <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="upload">بارکردن لە ئامێرەوە</TabsTrigger>
                      <TabsTrigger value="link">بەستەر (Link)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'image');
                          }}
                          disabled={isUploadingImage}
                        />
                        {isUploadingImage && <Loader2 className="animate-spin" />}
                      </div>
                      {form.watch("image_storage_id") && <p className="text-sm text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> وێنە هەڵبژێردراوە (Storage ID)</p>}
                    </TabsContent>
                    <TabsContent value="link">
                      <FormField
                        control={form.control}
                        name="image_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="https://example.com/image.jpg"
                                dir="ltr"
                                {...field} // spread remaining props
                                onChange={(e) => {
                                  field.onChange(e);
                                  // Clear storage ID if typing link
                                  if (e.target.value) form.setValue('image_storage_id', '');
                                }}
                              />
                            </FormControl>
                            <FormDescription>بەستەری ڕاستەوخۆی وێنە</FormDescription>
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Video Section */}
                <div className="space-y-4 border p-4 rounded-md">
                  <h3 className="font-medium flex items-center gap-2"><VideoIcon className="w-4 h-4" /> ڤیدیۆی وانە</h3>
                  <Tabs defaultValue="link" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="link">بەستەر (YouTube/Drive)</TabsTrigger>
                      <TabsTrigger value="upload">بارکردن لە ئامێرەوە</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'video');
                          }}
                          disabled={isUploadingVideo}
                        />
                        {isUploadingVideo && <Loader2 className="animate-spin" />}
                      </div>
                      {form.watch("video_storage_id") && <p className="text-sm text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> ڤیدیۆ هەڵبژێردراوە (Storage ID)</p>}
                    </TabsContent>
                    <TabsContent value="link">
                      <FormField
                        control={form.control}
                        name="video_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="YouTube ID or Drive Link"
                                dir="ltr"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  // Clear storage ID if typing link
                                  if (e.target.value) form.setValue('video_storage_id', '');
                                }}
                              />
                            </FormControl>
                            <FormDescription>دەتوانیت IDـی یوتیوب یان لینکی Google Drive دابنێیت</FormDescription>
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
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

                  <Button type="submit" disabled={isSubmitting || isUploadingImage || isUploadingVideo}>
                    {(isSubmitting || isUploadingImage || isUploadingVideo) && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
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
