import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ArrowRight, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/admin/AdminLayout';

const articleSchema = z.object({
    slug: z.string().min(1, 'سلەگ پێویستە').regex(/^[a-z0-9-]+$/, 'تەنها پیتی بچووک و ژمارە و - ڕێگەپێدراوە'),
    title: z.string().min(1, 'ناونیشان پێویستە'),
    description: z.string().min(1, 'وەسف پێویستە'),
    category: z.string().min(1, 'بەش پێویستە'),
    author: z.string().min(1, 'ناوی نووسەر پێویستە'),
    publish_date: z.string().min(1, 'بەروار پێویستە'),
    cover_image_url: z.string().optional(),
    cover_image_storage_id: z.string().optional(),
    content: z.string().min(1, 'ناوەڕۆک پێویستە'),
    tags: z.string(),
    is_published: z.boolean(),
});

type ArticleFormData = z.infer<typeof articleSchema>;

const ARTICLE_CATEGORIES = [
    { value: 'CT', label: 'CT Scan' },
    { value: 'MRI', label: 'MRI' },
    { value: 'X-Ray', label: 'X-Ray' },
    { value: 'Ultrasound', label: 'Ultrasound' },
    { value: 'Nuclear Medicine', label: 'Nuclear Medicine' },
    { value: 'Radiation Therapy', label: 'Radiation Therapy' },
    { value: 'General', label: 'گشتی (General)' },
];

const ArticleEditor = () => {
    const { id } = useParams<{ id: string }>();
    const isEditing = id && id !== 'new';
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const existingArticle = useQuery(api.api.getArticleById,
        isEditing ? { id: id as Id<"articles"> } : "skip"
    );

    const isLoadingArticle = isEditing && existingArticle === undefined;

    const createArticleMutation = useMutation(api.admin_actions.createArticle);
    const updateArticleMutation = useMutation(api.admin_actions.updateArticle);
    const generateUploadUrl = useMutation(api.admin_actions.generateUploadUrl);

    const form = useForm<ArticleFormData>({
        resolver: zodResolver(articleSchema),
        defaultValues: {
            slug: '',
            title: '',
            description: '',
            category: 'General',
            author: '',
            publish_date: new Date().toISOString().split('T')[0],
            cover_image_url: '',
            cover_image_storage_id: '',
            content: '',
            tags: '',
            is_published: false,
        },
    });

    useEffect(() => {
        if (existingArticle) {
            form.reset({
                slug: existingArticle.slug,
                title: existingArticle.title,
                description: existingArticle.description,
                category: existingArticle.category,
                author: existingArticle.author,
                publish_date: existingArticle.publishDate || new Date().toISOString().split('T')[0],
                cover_image_url: existingArticle.coverImageUrl || '',
                cover_image_storage_id: existingArticle.coverImageStorageId || '',
                content: existingArticle.content,
                tags: (existingArticle.tags || []).join(', '),
                is_published: existingArticle.isPublished,
            });
        }
    }, [existingArticle, form]);

    const handleFileUpload = async (file: File) => {
        try {
            setIsUploadingImage(true);
            const postUrl = await generateUploadUrl();
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            if (!result.ok) throw new Error("Upload failed");
            const { storageId } = await result.json();
            form.setValue('cover_image_storage_id', storageId);
            form.setValue('cover_image_url', '');
            toast({ title: "وێنە بارکرا", description: "وێنەکە بە سەرکەوتوویی بارکرا" });
        } catch (error) {
            console.error(error);
            toast({ title: "هەڵە", description: "بارکردنی فایل سەرکەوتوو نەبوو", variant: "destructive" });
        } finally {
            setIsUploadingImage(false);
        }
    };

    const onSubmit = async (data: ArticleFormData) => {
        const tagsArray = data.tags.split(',').map((t) => t.trim()).filter(Boolean);

        const coverImageUrl = data.cover_image_url && data.cover_image_url.trim() !== '' ? data.cover_image_url : undefined;
        const coverImageStorageId = data.cover_image_storage_id && data.cover_image_storage_id.trim() !== ''
            ? (data.cover_image_storage_id as Id<"_storage">)
            : undefined;

        const payload = {
            title: data.title,
            slug: data.slug,
            description: data.description,
            content: data.content,
            coverImageUrl,
            coverImageStorageId,
            category: data.category,
            author: data.author,
            isPublished: data.is_published,
            tags: tagsArray,
            publishDate: data.publish_date,
        };

        try {
            if (isEditing) {
                await updateArticleMutation({
                    id: id as Id<"articles">,
                    ...payload,
                });
                toast({ title: 'سەرکەوتوو', description: 'بابەت نوێکرایەوە' });
            } else {
                await createArticleMutation(payload);
                toast({ title: 'سەرکەوتوو', description: 'بابەت دروستکرا' });
            }
            navigate('/admin/articles');
        } catch (error: any) {
            toast({
                title: 'هەڵە',
                description: error.message.includes('Duplicate')
                    ? 'ئەم سلەگە پێشتر بەکارهاتووە'
                    : 'کردارەکە سەرکەوتوو نەبوو:\n' + error.message,
                variant: 'destructive',
            });
        }
    };

    const isSubmitting = false;

    if (isEditing && isLoadingArticle) {
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
                    <Button variant="ghost" onClick={() => navigate('/admin/articles')}>
                        <ArrowRight className="h-4 w-4 ml-2" />
                        گەڕانەوە
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">
                            {isEditing ? 'دەستکاری بابەت' : 'بابەتی نوێ'}
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
                                                    <Input placeholder="چۆنیەتی کارکردنی CT Scan" {...field} />
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
                                                    <Input placeholder="how-ct-scan-works" dir="ltr" {...field} />
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
                                            <FormLabel>وەسف (پوختە)</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="وەسفی کورت لە بابەت..." {...field} />
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
                                                        {ARTICLE_CATEGORIES.map((cat) => (
                                                            <SelectItem key={cat.value} value={cat.value}>
                                                                {cat.label}
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
                                        name="author"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>نووسەر</FormLabel>
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

                        {/* Cover Image */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5" />
                                    وێنەی سەرەکی (Cover Image)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
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
                                                    if (file) handleFileUpload(file);
                                                }}
                                                disabled={isUploadingImage}
                                            />
                                            {isUploadingImage && <Loader2 className="animate-spin" />}
                                        </div>
                                        {form.watch("cover_image_storage_id") && (
                                            <p className="text-sm text-green-600">✓ وێنە هەڵبژێردراوە (Storage ID)</p>
                                        )}
                                    </TabsContent>
                                    <TabsContent value="link">
                                        <FormField
                                            control={form.control}
                                            name="cover_image_url"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="https://example.com/image.jpg"
                                                            dir="ltr"
                                                            {...field}
                                                            onChange={(e) => {
                                                                field.onChange(e);
                                                                if (e.target.value) form.setValue('cover_image_storage_id', '');
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>بەستەری ڕاستەوخۆی وێنە</FormDescription>
                                                </FormItem>
                                            )}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        {/* Content */}
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
                                            <FormLabel>ناوەڕۆکی بابەت</FormLabel>
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
                                                <Input placeholder="CT, radiology, physics" {...field} />
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
                                                        بابەت بۆ هەمووان دەردەکەوێت
                                                    </FormDescription>
                                                </div>
                                            </FormItem>
                                        )}
                                    />

                                    <Button type="submit" disabled={isSubmitting || isUploadingImage}>
                                        {(isSubmitting || isUploadingImage) && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
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

export default ArticleEditor;
