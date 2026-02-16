import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { BookOpen, CheckCircle, Trophy, Bookmark, Clock, Check, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PageLayout from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;

  // Convex Queries
  const allLessons = useQuery(api.api.getAllLessons);
  const userProgress = useQuery(api.api.getUserProgress, userId ? { userId } : "skip");
  const userBookmarks = useQuery(api.api.getUserBookmarks, userId ? { userId } : "skip");

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || allLessons === undefined) {
    return (
      <PageLayout>
        <div className="container py-16 text-center">بارکردن...</div>
      </PageLayout>
    );
  }

  if (!user) return null;

  const totalLessons = allLessons?.length ?? 0;
  const completedLessons = userProgress?.filter(p => p.completed) ?? [];
  const completedCount = completedLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Get full lesson data for completed lessons
  const completedLessonsFull = allLessons?.filter(lesson =>
    completedLessons.some(p => p.lessonId === lesson._id)
  ) ?? [];

  const bookmarkedLessons = userBookmarks?.map(b => b.lesson).filter(Boolean) ?? [];

  return (
    <PageLayout>

      <section className="py-8">
        <div className="container">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">پڕۆفایلی من</h1>
            <p className="text-muted-foreground">{user.email || user.id}</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <BookOpen className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalLessons}</p>
                    <p className="text-sm text-muted-foreground">کۆی وانەکان</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedCount}</p>
                    <p className="text-sm text-muted-foreground">تەواوکراو</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-500/20 rounded-xl">
                    <Bookmark className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{bookmarkedLessons.length}</p>
                    <p className="text-sm text-muted-foreground">پاشەکەوتکراو</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <Trophy className="h-6 w-6 text-purple-500" />
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

          {/* Tabs for Completed & Bookmarked */}
          <Tabs defaultValue="completed" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="completed" className="gap-2">
                <CheckCircle className="h-4 w-4" /> تەواوکراوەکان ({completedCount})
              </TabsTrigger>
              <TabsTrigger value="bookmarks" className="gap-2">
                <Bookmark className="h-4 w-4" /> پاشەکەوتکراوەکان ({bookmarkedLessons.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="completed">
              <Card>
                <CardContent className="pt-6">
                  {completedLessonsFull.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="mb-4">هێشتا هیچ وانەیەکت تەواو نەکردووە</p>
                      <Link to="/categories">
                        <Button>دەستپێکردنی فێربوون</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedLessonsFull.map((lesson) => (
                        <Link
                          key={lesson._id}
                          to={`/lesson/${lesson.slug}`}
                          className="block"
                        >
                          <div className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/50 transition-colors">
                            <div className="flex-1">
                              <p className="font-medium">{lesson.title}</p>
                              <p className="text-sm text-muted-foreground">{lesson.categoryName}</p>
                            </div>
                            <Badge variant="outline" className="text-green-600 border-green-500 bg-green-500/10 flex items-center gap-1">
                              <Check className="w-3 h-3" /> تەواوکراوە
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bookmarks">
              <Card>
                <CardContent className="pt-6">
                  {bookmarkedLessons.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="mb-4">هیچ وانەیەکت پاشەکەوت نەکردووە</p>
                      <Link to="/search">
                        <Button>گەڕان بۆ وانەکان</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bookmarkedLessons.map((lesson: any) => (
                        <Link
                          key={lesson._id}
                          to={`/lesson/${lesson.slug}`}
                          className="block"
                        >
                          <div className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/50 transition-colors">
                            <div className="flex-1">
                              <p className="font-medium">{lesson.title}</p>
                              <p className="text-sm text-muted-foreground">{lesson.duration}</p>
                            </div>
                            <Badge variant="outline" className="text-yellow-600 border-yellow-500 bg-yellow-500/10 flex items-center gap-1">
                              <Star className="w-3 h-3" /> پاشەکەوتکراو
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </PageLayout>
  );
};

export default Profile;
