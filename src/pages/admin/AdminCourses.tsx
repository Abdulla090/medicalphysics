import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Edit, Trash2, GraduationCap, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getDifficultyName, DifficultyLevel } from '@/lib/api';

const AdminCourses = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, loading, navigate]);

  const { data: courses, isLoading, refetch } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('order_index');
      
      if (error) throw error;
      
      // Get lesson counts
      const coursesWithCounts = await Promise.all(
        data.map(async (course) => {
          const { count } = await supabase
            .from('course_lessons')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);
          
          return { ...course, lesson_count: count ?? 0 };
        })
      );
      
      return coursesWithCounts;
    },
    enabled: !!user && !!isAdmin,
  });

  const handleDelete = async (id: string) => {
    if (!confirm('دڵنیایت لە سڕینەوەی ئەم کۆرسە؟')) return;

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('هەڵەیەک ڕوویدا');
    } else {
      toast.success('کۆرس سڕایەوە');
      refetch();
    }
  };

  if (loading || !user || !isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">کۆرسەکان</h1>
            <p className="text-muted-foreground">بەڕێوەبردنی کۆرس و ڕێڕەوی فێربوون</p>
          </div>
          <Link to="/admin/courses/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              کۆرسی نوێ
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-8">بارکردن...</div>
        ) : courses?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">هیچ کۆرسێک نییە</h3>
              <p className="text-muted-foreground mb-4">
                دەتوانیت کۆرسی نوێ زیاد بکەیت
              </p>
              <Link to="/admin/courses/new">
                <Button>زیادکردنی کۆرس</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {courses?.map((course) => (
              <Card key={course.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {course.image_url && (
                        <img 
                          src={course.image_url} 
                          alt={course.title}
                          className="w-20 h-14 object-cover rounded"
                        />
                      )}
                      <div>
                        <CardTitle className="text-lg">{course.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {course.description?.slice(0, 100)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={course.is_published ? 'default' : 'secondary'}>
                        {course.is_published ? 'بڵاوکراوەتەوە' : 'ڕەشنووس'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {course.lesson_count} وانە
                      </span>
                      <Badge variant="outline">
                        {getDifficultyName(course.difficulty as DifficultyLevel)}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/admin/courses/${course.id}/edit`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Edit className="h-4 w-4" />
                          دەستکاری
                        </Button>
                      </Link>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="gap-1"
                        onClick={() => handleDelete(course.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        سڕینەوە
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCourses;
