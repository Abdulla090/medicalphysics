import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Plus, Edit, Trash2, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const AdminQuizzes = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, loading, navigate]);

  const quizzes = useQuery(api.api.getQuizzes);
  const deleteQuiz = useMutation(api.admin_actions.deleteQuiz);

  const handleDelete = async (id: Id<"quizzes">) => {
    if (!confirm('دڵنیایت لە سڕینەوەی ئەم تاقیکردنەوەیە؟')) return;

    try {
      await deleteQuiz({ id });
      toast.success('تاقیکردنەوە سڕایەوە');
    } catch (error) {
      toast.error('هەڵەیەک ڕوویدا');
    }
  };

  if (loading || !user || !isAdmin) {
    return null;
  }

  const isLoading = quizzes === undefined;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">تاقیکردنەوەکان</h1>
            <p className="text-muted-foreground">بەڕێوەبردنی تاقیکردنەوەکان</p>
          </div>
          <Link to="/admin/quizzes/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              تاقیکردنەوەی نوێ
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-8">بارکردن...</div>
        ) : quizzes?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">هیچ تاقیکردنەوەیەک نییە</h3>
              <p className="text-muted-foreground mb-4">
                دەتوانیت تاقیکردنەوەی نوێ زیاد بکەیت
              </p>
              <Link to="/admin/quizzes/new">
                <Button>زیادکردنی تاقیکردنەوە</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {quizzes?.map((quiz) => (
              <Card key={quiz._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>
                      {quiz.lesson && (
                        <p className="text-sm text-muted-foreground mt-1">
                          وانە: {quiz.lesson.title}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={quiz.isPublished ? 'default' : 'secondary'}>
                        {quiz.isPublished ? 'بڵاوکراوەتەوە' : 'ڕەشنووس'}
                      </Badge>
                      <Badge variant="outline">
                        {quiz.questionsCount} پرسیار
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      نمرەی تێپەڕین: {quiz.passingScore}%
                    </p>
                    <div className="flex gap-2">
                      <Link to={`/admin/quizzes/${quiz._id}/edit`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Edit className="h-4 w-4" />
                          دەستکاری
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleDelete(quiz._id)}
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

export default AdminQuizzes;
