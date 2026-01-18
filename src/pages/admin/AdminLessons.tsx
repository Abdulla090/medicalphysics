import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: lessons, isLoading } = useQuery({
    queryKey: ['admin-lessons'],
    queryFn: () => fetchLessons(false),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
      toast({ title: 'سەرکەوتوو', description: 'وانە سڕایەوە' });
    },
    onError: () => {
      toast({ title: 'هەڵە', description: 'سڕینەوە سەرکەوتوو نەبوو', variant: 'destructive' });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, is_published }: { id: string; is_published: boolean }) =>
      updateLesson(id, { is_published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
      toast({ title: 'سەرکەوتوو', description: 'دۆخی وانە گۆڕا' });
    },
    onError: () => {
      toast({ title: 'هەڵە', description: 'گۆڕین سەرکەوتوو نەبوو', variant: 'destructive' });
    },
  });

  const filteredLessons = lessons?.filter(lesson =>
    lesson.title.includes(searchQuery) ||
    lesson.instructor.includes(searchQuery) ||
    lesson.categories?.name.includes(searchQuery)
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
              <Card key={lesson.id} className="p-4">
                <div className="flex gap-3">
                  <img
                    src={lesson.image_url}
                    alt={lesson.title}
                    className="w-20 h-14 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{lesson.title}</p>
                    <p className="text-sm text-muted-foreground">{lesson.categories?.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={lesson.is_published ? 'default' : 'secondary'} className="text-xs">
                        {lesson.is_published ? 'بڵاوکراوە' : 'پێشنووس'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      togglePublishMutation.mutate({
                        id: lesson.id,
                        is_published: !lesson.is_published,
                      })
                    }
                  >
                    {lesson.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Link to={`/admin/lessons/${lesson.id}/edit`}>
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
                          onClick={() => deleteMutation.mutate(lesson.id)}
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
                  <TableRow key={lesson.id}>
                    <TableCell>
                      <img
                        src={lesson.image_url}
                        alt={lesson.title}
                        className="w-16 h-12 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {lesson.title}
                    </TableCell>
                    <TableCell>{lesson.categories?.name}</TableCell>
                    <TableCell>
                      <Badge className={difficultyStyles[lesson.difficulty]}>
                        {getDifficultyName(lesson.difficulty)}
                      </Badge>
                    </TableCell>
                    <TableCell>{lesson.instructor}</TableCell>
                    <TableCell>
                      {format(new Date(lesson.publish_date), 'yyyy/MM/dd')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={lesson.is_published ? 'default' : 'secondary'}>
                        {lesson.is_published ? 'بڵاوکراوە' : 'پێشنووس'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            togglePublishMutation.mutate({
                              id: lesson.id,
                              is_published: !lesson.is_published,
                            })
                          }
                        >
                          {lesson.is_published ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Link to={`/admin/lessons/${lesson.id}/edit`}>
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
                                onClick={() => deleteMutation.mutate(lesson.id)}
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
