import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Plus, Edit, Trash2, GraduationCap, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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

  const courses = useQuery(api.api.getCourses);
  const deleteCourse = useMutation(api.admin_actions.deleteCourse);

  const handleDelete = async (id: Id<"courses">) => {
    if (!confirm('دڵنیایت لە سڕینەوەی ئەم کۆرسە؟')) return;

    try {
      await deleteCourse({ id });
      toast.success('کۆرس سڕایەوە');
    } catch (error) {
      toast.error('هەڵەیەک ڕوویدا');
    }
  };

  if (loading || !user || !isAdmin) {
    return null;
  }

  const isLoading = courses === undefined;

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
              <Card key={course._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {course.imageUrl && (
                        <img
                          src={course.imageUrl}
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
                      <Badge variant={course.isPublished ? 'default' : 'secondary'}>
                        {course.isPublished ? 'بڵاوکراوەتەوە' : 'ڕەشنووس'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {course.estimatedDuration || '0'} وانە
                      </span>
                      <Badge variant="outline">
                        {getDifficultyName(course.difficulty as DifficultyLevel)}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/admin/courses/${course._id}/edit`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Edit className="h-4 w-4" />
                          دەستکاری
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleDelete(course._id)}
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
