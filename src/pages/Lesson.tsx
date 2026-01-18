import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Clock, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import { getLessonById, getRelatedLessons, getCategoryById } from '@/data/lessons';

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
  const lesson = getLessonById(id || '');
  const category = lesson ? getCategoryById(lesson.category) : undefined;
  const relatedLessons = lesson ? getRelatedLessons(lesson.id, lesson.category) : [];

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
              {lesson.categoryName}
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
                    {lesson.categoryName}
                  </Badge>
                  <Badge className={difficultyStyles[lesson.difficulty]}>
                    {lesson.difficultyName}
                  </Badge>
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
                    {lesson.date}
                  </div>
                </div>
              </div>

              {/* Video Player */}
              <div className="aspect-video mb-8 rounded-2xl overflow-hidden bg-card">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${lesson.videoId}`}
                  title={lesson.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Content */}
              <Card className="mb-8">
                <CardContent className="p-6 md:p-8 prose prose-lg max-w-none">
                  <h2 className="text-2xl font-bold mb-4">{lesson.title}</h2>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {lesson.content.split('\n').map((line, index) => {
                      if (line.startsWith('## ')) {
                        return <h2 key={index} className="text-xl font-bold mt-6 mb-3">{line.replace('## ', '')}</h2>;
                      }
                      if (line.startsWith('### ')) {
                        return <h3 key={index} className="text-lg font-semibold mt-4 mb-2">{line.replace('### ', '')}</h3>;
                      }
                      if (line.startsWith('> ')) {
                        return (
                          <blockquote key={index} className="border-r-4 border-primary pr-4 py-2 my-4 bg-muted rounded-lg">
                            {line.replace('> ', '')}
                          </blockquote>
                        );
                      }
                      if (line.startsWith('| ')) {
                        return null; // Skip table lines for simplicity
                      }
                      if (line.startsWith('- ')) {
                        return <li key={index} className="mr-4">{line.replace('- ', '')}</li>;
                      }
                      if (line.match(/^\d+\. /)) {
                        return <li key={index} className="mr-4">{line.replace(/^\d+\. /, '')}</li>;
                      }
                      if (line.trim() === '') {
                        return <br key={index} />;
                      }
                      return <p key={index} className="mb-2">{line}</p>;
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              <div className="mb-8">
                <h3 className="font-semibold mb-3">تاگەکان:</h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* Next Lesson */}
              {relatedLessons.length > 0 && (
                <Link to={`/lesson/${relatedLessons[0].id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">وانەی دواتر</p>
                        <p className="font-semibold">{relatedLessons[0].title}</p>
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
                  {relatedLessons.map((related) => (
                    <Link key={related.id} to={`/lesson/${related.id}`}>
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
