import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Clock, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import ProgressButton from '@/components/ProgressButton';
import QuizCard from '@/components/QuizCard';
import PDFDownloadButton from '@/components/PDFDownloadButton';
import SocialShare from '@/components/SocialShare';
import { MarkdownPreview } from '@/components/admin/editor/MarkdownPreview';
import { fetchLessonBySlug, fetchLessonsByCategory, getDifficultyName } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useProgress } from '@/hooks/useProgress';

const categoryStyles: Record<string, string> = {
  xray: 'category-xray',
  ct: 'category-ct',
  mri: 'category-mri',
  ultrasound: 'category-ultrasound',
  nuclear: 'category-nuclear',
};

const difficultyStyles: Record<string, string> = {
  beginner: 'difficulty-beginner',
  intermediate: 'difficulty-intermediate',
  advanced: 'difficulty-advanced',
};

const Lesson = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isLessonCompleted } = useProgress();

  const { data: lesson, isLoading } = useQuery({
    queryKey: ['lesson', id],
    queryFn: () => fetchLessonBySlug(id || ''),
    enabled: !!id,
  });

  const { data: relatedLessons } = useQuery({
    queryKey: ['related-lessons', lesson?.category],
    queryFn: () => fetchLessonsByCategory(lesson!.category),
    enabled: !!lesson?.category,
  });

  const filteredRelatedLessons = relatedLessons?.filter(l => l.id !== lesson?.id).slice(0, 3) || [];
  const completed = lesson ? isLessonCompleted(lesson.id) : false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">بارکردن...</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold">وانە نەدۆزرایەوە</h1>
          <Link to="/search" className="text-primary hover:underline mt-4 inline-block">
            گەڕانەوە بۆ وانەکان
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
            <Link to="/categories" className="hover:text-primary">بەشەکان</Link>
            <ChevronLeft className="h-4 w-4" />
            <Link to={`/category/${lesson.category}`} className="hover:text-primary">
              {lesson.categories?.name}
            </Link>
            <ChevronLeft className="h-4 w-4" />
            <span className="text-foreground line-clamp-1">{lesson.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Header */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={categoryStyles[lesson.category]}>
                    {lesson.categories?.name}
                  </Badge>
                  <Badge className={difficultyStyles[lesson.difficulty]}>
                    {getDifficultyName(lesson.difficulty)}
                  </Badge>
                  {completed && (
                    <Badge className="bg-green-100 text-green-700">
                      ✓ تەواوکراوە
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold mb-4">{lesson.title}</h1>
                <p className="text-lg text-muted-foreground">{lesson.description}</p>

                <div className="flex flex-wrap items-center gap-6 mt-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {lesson.instructor}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {lesson.duration}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {lesson.publish_date}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {user && (
                    <>
                      <ProgressButton lessonId={lesson.id} />
                      <PDFDownloadButton
                        title={lesson.title}
                        content={lesson.content}
                        instructor={lesson.instructor}
                        category={lesson.categories?.name}
                      />
                    </>
                  )}
                  <SocialShare
                    title={lesson.title}
                    description={lesson.description}
                  />
                </div>
              </div>

              {/* Video Player */}
              <div className="aspect-video mb-8 rounded-2xl overflow-hidden bg-card">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${lesson.video_id}`}
                  title={lesson.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Content */}
              <Card className="mb-8">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-2xl font-bold mb-4">{lesson.title}</h2>
                  <MarkdownPreview content={lesson.content} />
                </CardContent>
              </Card>

              {/* Quiz Section */}
              <div className="mb-8">
                <QuizCard lessonId={lesson.id} />
              </div>

              {/* Tags */}
              <div className="mb-8">
                <h3 className="font-semibold mb-3">تاگەکان:</h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* Next Lesson */}
              {filteredRelatedLessons.length > 0 && (
                <Link to={`/lesson/${filteredRelatedLessons[0].slug}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">وانەی دواتر</p>
                        <p className="font-semibold">{filteredRelatedLessons[0].title}</p>
                      </div>
                      <ChevronLeft className="h-5 w-5" />
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <h3 className="font-bold text-lg mb-4">وانەکانی تر لە ئەم بەشە</h3>
                <div className="space-y-3">
                  {filteredRelatedLessons.map((related) => (
                    <Link key={related.id} to={`/lesson/${related.slug}`}>
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <p className="font-medium line-clamp-2">{related.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{related.duration}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Lesson;
