import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle, Trophy, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProgress } from '@/hooks/useProgress';
import { fetchLessons } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { progress, completedCount } = useProgress();

  const { data: lessons } = useQuery({
    queryKey: ['lessons'],
    queryFn: () => fetchLessons(),
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">بارکردن...</div>
      </div>
    );
  }

  if (!user) return null;

  const totalLessons = lessons?.length ?? 0;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const completedLessons = lessons?.filter(lesson => 
    progress?.some(p => p.lesson_id === lesson.id && p.completed)
  ) ?? [];

  const inProgressLessons = lessons?.filter(lesson => 
    progress?.some(p => p.lesson_id === lesson.id && !p.completed && p.progress_percent > 0)
  ) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-8">
        <div className="container">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">پرۆفایلی من</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalLessons}</p>
                    <p className="text-sm text-muted-foreground">کۆی وانەکان</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedCount}</p>
                    <p className="text-sm text-muted-foreground">تەواوکراو</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{inProgressLessons.length}</p>
                    <p className="text-sm text-muted-foreground">لە ڕێگادا</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Trophy className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{progressPercent}%</p>
                    <p className="text-sm text-muted-foreground">پێشکەوتن</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overall Progress */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>پێشکەوتنی گشتی</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progressPercent} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {completedCount} لە {totalLessons} وانە تەواوکراوە
              </p>
            </CardContent>
          </Card>

          {/* Completed Lessons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                وانە تەواوکراوەکان
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedLessons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-4">هێشتا هیچ وانەیەکت تەواو نەکردووە</p>
                  <Link to="/categories">
                    <Button>دەستپێکردنی فێربوون</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedLessons.map((lesson) => (
                    <Link 
                      key={lesson.id} 
                      to={`/lesson/${lesson.slug}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-medium">{lesson.title}</p>
                          <p className="text-sm text-muted-foreground">{lesson.categories?.name}</p>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-500">
                          تەواوکراوە
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Profile;
