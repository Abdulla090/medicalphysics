import { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, EyeOff, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { fetchLessons, deleteLesson, updateLesson, getDifficultyName } from '@/lib/api';
import { format } from 'date-fns';

const difficultyStyles: Record<string, string> = {
  beginner: 'difficulty-beginner',
  intermediate: 'difficulty-intermediate',
  advanced: 'difficulty-advanced',
};

const AdminLessons = () => {
  const { toast } = useToast();
  // const queryClient = useQueryClient(); // Convex updates automatically
  const [searchQuery, setSearchQuery] = useState('');

  // Convex Migration
  const lessons = useQuery(api.admin.getRecentLessons); // Assuming getRecentLessons returns all for now, or we should create specific list query
  // Ideally we create a `api.admin.getAllLessons` but `getRecentLessons` might be enough if it's not limited too much. 
  // Let's check admin.ts... getRecentLessons returns all lessons sorted by date. Perfect.
  const isLoading = lessons === undefined;

  const deleteMutation = useMutation(api.admin_actions.deleteLesson);
  const updateMutation = useMutation(api.admin_actions.updateLesson);

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation({ id: id as any }); // Cast because id is string from UI but Convex expects Id
      toast({ title: 'سەرکەوتوو', description: 'وانە سڕایەوە' });
    } catch (error) {
      toast({ title: 'هەڵە', description: 'سڕینەوە سەرکەوتوو نەبوو', variant: 'destructive' });
    }
  };

  const handleTogglePublish = async (lesson: any) => {
    try {
      await updateMutation({
        id: lesson._id,
        // We need to pass ALL required fields to updateLesson because we defined args as required in schema?
        // Wait, schema definition for `updateLesson` in `admin_actions.ts` has specific args.
        // Let's check `admin_actions.ts`. 
        // `updateLesson` args list all fields as required v.string() or v.optional().
        // If they are not v.optional(), we must provide them!
        // This is a common pitfall. The validation `args: { ... }` means arguments must match this shape.

        // FIXME: The `updateLesson` mutation I created earlier requires providing ALL fields. This is bad for partial updates.
        // I should have used `v.optional()` for all fields in `updateLesson` args, or just `v.object` with `v.optional`.

        // WORKAROUND: For now, we will just not use the update mutation for toggling publish here, 
        // OR we fix the mutation in the next step. 
        // I will assume I will fix the mutation to allow partial updates.

        // Let's optimistically attempt partial update or fix the backend mutation.
        // I'll fix the backend mutation next.
        isPublished: !lesson.isPublished,
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description,
        content: lesson.content,
        imageUrl: lesson.imageUrl,
        videoId: lesson.videoId,
        duration: lesson.duration,
        difficulty: lesson.difficulty,
        category: lesson.category,
        instructor: lesson.instructor,
        tags: lesson.tags,
        publishDate: lesson.publishDate
      });
      toast({ title: 'سەرکەوتوو', description: 'دۆخی وانە گۆڕا' });
    } catch (error) {
      toast({ title: 'هەڵە', description: 'گۆڕین سەرکەوتوو نەبوو', variant: 'destructive' });
    }
  };

  const filteredLessons = lessons?.filter(lesson =>
    lesson.title.includes(searchQuery) ||
    lesson.instructor.includes(searchQuery) ||
    lesson.categoryName?.includes(searchQuery) // categoryName comes from join in admin.ts
  );

  return (
    <AdminLayout>
      <div className="space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">وانەکان</h1>
            <p className="text-muted-foreground mt-1">بەڕێوەبردنی هەموو وانەکان</p>
          </div>
          <Link to="/admin/lessons/new">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 ml-2" />
              وانەی نوێ
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="گەڕان..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden space-y-3">
          {isLoading ? (
            <div className="text-center py-8">بارکردن...</div>
          ) : filteredLessons?.length === 0 ? (
            <div className="text-center py-8">هیچ وانەیەک نەدۆزرایەوە</div>
          ) : (
            filteredLessons?.map((lesson) => (
              <Card key={lesson._id} className="p-4">
                <div className="flex gap-3">
                  <img
                    src={lesson.imageUrl}
                    alt={lesson.title}
                    className="w-20 h-14 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{lesson.title}</p>
                    <p className="text-sm text-muted-foreground">{lesson.categoryName}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={lesson.isPublished ? 'default' : 'secondary'} className="text-xs">
                        {lesson.isPublished ? 'بڵاوکراوە' : 'پێشنووس'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTogglePublish(lesson)}
                  >
                    {lesson.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Link to={`/admin/lessons/${lesson._id}/edit`}>
                    <Button variant="ghost" size="sm">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>دڵنیایت؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          ئەم کردارە ناگەڕێتەوە. ئەم وانەیە بۆ هەمیشە سڕدرێتەوە.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(lesson._id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          سڕینەوە
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>وێنە</TableHead>
                <TableHead>ناونیشان</TableHead>
                <TableHead>بەش</TableHead>
                <TableHead>ئاستی</TableHead>
                <TableHead>مامۆستا</TableHead>
                <TableHead>بەروار</TableHead>
                <TableHead>دۆخ</TableHead>
                <TableHead>کردارەکان</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    بارکردن...
                  </TableCell>
                </TableRow>
              ) : filteredLessons?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    هیچ وانەیەک نەدۆزرایەوە
                  </TableCell>
                </TableRow>
              ) : (
                filteredLessons?.map((lesson) => (
                  <TableRow key={lesson._id}>
                    <TableCell>
                      <img
                        src={lesson.imageUrl}
                        alt={lesson.title}
                        className="w-16 h-12 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {lesson.title}
                    </TableCell>
                    <TableCell>{lesson.categoryName}</TableCell>
                    <TableCell>
                      <Badge className={difficultyStyles[lesson.difficulty]}>
                        {getDifficultyName(lesson.difficulty)}
                      </Badge>
                    </TableCell>
                    <TableCell>{lesson.instructor}</TableCell>
                    <TableCell>
                      {lesson.publishDate ? format(new Date(lesson.publishDate), 'yyyy/MM/dd') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={lesson.isPublished ? 'default' : 'secondary'}>
                        {lesson.isPublished ? 'بڵاوکراوە' : 'پێشنووس'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTogglePublish(lesson)}
                        >
                          {lesson.isPublished ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Link to={`/admin/lessons/${lesson._id}/edit`}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>دڵنیایت؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                ئەم کردارە ناگەڕێتەوە. ئەم وانەیە بۆ هەمیشە سڕدرێتەوە.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(lesson._id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                سڕینەوە
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminLessons;
