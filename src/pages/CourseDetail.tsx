import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Clock, BookOpen, Trophy, CheckCircle, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Navbar from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProgress } from '@/hooks/useProgress';
import { getDifficultyName, DifficultyLevel } from '@/lib/api';

interface CourseLesson {
  id: string;
  lesson_id: string;
  order_index: number;
  lessons: {
    id: string;
    title: string;
    slug: string;
    description: string;
    duration: string;
  };
}

const difficultyStyles: Record<string, string> = {
  beginner: 'difficulty-beginner',
  intermediate: 'difficulty-intermediate',
  advanced: 'difficulty-advanced',
};

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { progress, isLessonCompleted } = useProgress();

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: courseLessons } = useQuery({
    queryKey: ['course-lessons-detail', course?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_lessons')
        .select(`
          id,
          lesson_id,
          order_index,
          lessons (id, title, slug, description, duration)
        `)
        .eq('course_id', course!.id)
        .order('order_index');
      
      if (error) throw error;
      return data as CourseLesson[];
    },
    enabled: !!course?.id,
  });

  const completedCount = courseLessons?.filter(cl => 
    isLessonCompleted(cl.lesson_id)
  ).length ?? 0;

  const totalLessons = courseLessons?.length ?? 0;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const isCompleted = progressPercent === 100;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">بارکردن...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold">کۆرس نەدۆزرایەوە</h1>
          <Link to="/courses" className="text-primary hover:underline mt-4 inline-block">
            گەڕانەوە بۆ کۆرسەکان
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-8">
        <div className="container">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-primary">سەرەتا</Link>
            <ChevronLeft className="h-4 w-4" />
            <Link to="/courses" className="hover:text-primary">کۆرسەکان</Link>
            <ChevronLeft className="h-4 w-4" />
            <span className="text-foreground">{course.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Header */}
              <div className="mb-8">
                {course.image_url && (
                  <img
                    src={course.image_url}
                    alt={course.title}
                    className="w-full aspect-video object-cover rounded-2xl mb-6"
                  />
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={difficultyStyles[course.difficulty as DifficultyLevel]}>
                    {getDifficultyName(course.difficulty as DifficultyLevel)}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <BookOpen className="h-3 w-3" />
                    {totalLessons} وانە
                  </Badge>
                  {course.estimated_duration && (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {course.estimated_duration}
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
                {course.description && (
                  <p className="text-lg text-muted-foreground">{course.description}</p>
                )}
              </div>

              {/* Lessons List */}
              <div>
                <h2 className="text-xl font-bold mb-4">وانەکان</h2>
                <div className="space-y-3">
                  {courseLessons?.map((cl, index) => {
                    const completed = isLessonCompleted(cl.lesson_id);
                    
                    return (
                      <Link key={cl.id} to={`/lesson/${cl.lessons.slug}`}>
                        <Card className={`hover:shadow-md transition-all ${completed ? 'border-green-200 bg-green-50/50' : ''}`}>
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              completed 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {completed ? (
                                <CheckCircle className="h-5 w-5" />
                              ) : (
                                <span className="font-bold">{index + 1}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{cl.lessons.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {cl.lessons.description}
                              </p>
                            </div>
                            <div className="text-sm text-muted-foreground shrink-0">
                              {cl.lessons.duration}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card>
                  <CardContent className="p-6">
                    {/* Progress */}
                    {user && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">پێشکەوتنت</span>
                          <span className="font-bold">{progressPercent}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-3" />
                        <p className="text-sm text-muted-foreground mt-2">
                          {completedCount} لە {totalLessons} وانە تەواوکراوە
                        </p>
                      </div>
                    )}

                    {/* Certificate */}
                    {isCompleted ? (
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                        <h3 className="font-bold text-green-800">پیرۆزە! 🎉</h3>
                        <p className="text-sm text-green-700 mb-3">
                          کۆرسەکەت تەواوکرد
                        </p>
                        <Button size="sm" className="gap-2">
                          <Trophy className="h-4 w-4" />
                          بەڵگەنامە
                        </Button>
                      </div>
                    ) : (
                      <>
                        {courseLessons && courseLessons.length > 0 && (
                          <Link to={`/lesson/${courseLessons[completedCount]?.lessons.slug || courseLessons[0].lessons.slug}`}>
                            <Button className="w-full">
                              {completedCount > 0 ? 'بەردەوامبوون' : 'دەستپێکردن'}
                            </Button>
                          </Link>
                        )}
                      </>
                    )}

                    {!user && (
                      <div className="mt-4 p-4 bg-muted rounded-lg text-center">
                        <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-3">
                          بۆ تۆمارکردنی پێشکەوتن، چوونەژوورەوە
                        </p>
                        <Link to="/auth">
                          <Button variant="outline" size="sm">
                            چوونەژوورەوە
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CourseDetail;
