import { Link } from 'react-router-dom';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import LessonCard from '@/components/LessonCard';
import CategoryCard from '@/components/CategoryCard';
import StatCard from '@/components/StatCard';
import { LessonCardSkeleton, CategoryCardSkeleton, StatCardSkeleton } from '@/components/Skeletons';
import { Clock, User, FileText } from 'lucide-react';

const Index = () => {
  // Use Convex queries
  const categories = useQuery(api.api.getCategories);
  const lessons = useQuery(api.api.getAllLessons);
  const articles = useQuery(api.api.getArticles);

  // Calculate stats and counts on the client for now (or create a dedicated query)
  const stats = useMemo(() => {
    return {
      lessonsCount: lessons?.length || 0,
      categoriesCount: categories?.length || 0,
    };
  }, [lessons, categories]);

  const lessonCounts = useMemo(() => {
    if (!lessons) return {};
    return lessons.reduce((acc: Record<string, number>, lesson: any) => {
      acc[lesson.category] = (acc[lesson.category] || 0) + 1;
      return acc;
    }, {});
  }, [lessons]);

  // Sort lessons by creation time if available, or just take the last ones.
  // Assuming the query returns them in some order, or we sort here.
  // Ideally, valid lessons have a _creationTime from Convex
  const recentLessons = useMemo(() => {
    if (!lessons) return [];
    return [...lessons]
      .sort((a: any, b: any) => b._creationTime - a._creationTime)
      .slice(0, 4);
  }, [lessons]);

  const recentArticles = useMemo(() => {
    if (!articles) return [];
    return [...articles]
      .sort((a: any, b: any) => b._creationTime - a._creationTime)
      .slice(0, 3);
  }, [articles]);

  const categoryColors: Record<string, string> = {
    'CT': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'MRI': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'X-Ray': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    'Ultrasound': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    'Nuclear Medicine': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    'Radiation Therapy': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'General': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Abstract Background Blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2" />

        <div className="container text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8 border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-medium">فێربوونی زیرەک بۆ داهاتووی پزیشکی</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
            <span className="block">فێربوونی <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">ڕادیۆلۆجی</span></span>
            <span className="block mt-4">بە شێوازێکی مۆدێرن</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            یەکەمین و باشترین سەرچاوەی کوردی بۆ فێربوونی تەکنیکەکانی وێنەگرتنی پزیشکی بە کوالێتی ئەکادیمی
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/categories">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-primary/25 hover:-translate-y-1 transition-all duration-300">
                دەستپێکردن بەخۆڕایی
              </Button>
            </Link>
            <Link to="/search">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-accent hover:text-accent-foreground transition-all duration-300">
                گەڕان لە وانەکان
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto mt-20 px-4">
            <StatCard value={`${stats.lessonsCount}`} label="وانەی بەردەست" />
            <StatCard value={`${stats.categoriesCount}`} label="بەشی سەرەکی" />
            <StatCard value="١٠٠+" label="خوێندکاری چالاک" />
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-24 bg-muted/30 relative">
        <div className="container">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">بەشەکانی وێنەگرتن</h2>
              <p className="text-muted-foreground mt-2 text-lg">هەموو جۆرەکانی وێنەگرتنی پزیشکی لەیەک شوێندا</p>
            </div>
            <Link to="/categories">
              <Button variant="ghost" className="hidden md:flex gap-2">
                هەموو بەشەکان <span className="text-xl">→</span>
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {categories === undefined ? (
              // Show skeletons while loading
              Array.from({ length: 5 }).map((_, i) => (
                <CategoryCardSkeleton key={i} />
              ))
            ) : (
              categories?.map((category, index) => (
                <CategoryCard
                  key={category.id}
                  index={index}
                  category={{ ...category, lessonCount: lessonCounts?.[category.id] || 0 } as any}
                  variant="compact"
                />
              ))
            )}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link to="/categories">
              <Button variant="outline" className="w-full">هەموو بەشەکان</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Lessons Section */}
      <section className="py-24">
        <div className="container">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">وانە تازەکان</h2>
              <p className="text-muted-foreground mt-2 text-lg">نوێترین وانەکانی فێربوون</p>
            </div>
            <Link to="/search">
              <Button variant="ghost" className="hidden md:flex gap-2">
                هەموو وانەکان <span className="text-xl">→</span>
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {lessons === undefined ? (
              // Show skeletons while loading
              Array.from({ length: 4 }).map((_, i) => (
                <LessonCardSkeleton key={i} />
              ))
            ) : recentLessons.length > 0 ? (
              recentLessons.map((lesson: any) => (
                <LessonCard key={lesson._id} lesson={lesson} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
                <p className="text-muted-foreground">هیچ وانەیەک بەردەست نییە</p>
              </div>
            )}
          </div>

          <div className="mt-12 text-center md:hidden">
            <Link to="/search">
              <Button variant="outline" className="w-full">هەموو وانەکان</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Articles Section */}
      <section className="py-24 bg-muted/30">
        <div className="container">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">تازەترین زانیاری</h2>
              <p className="text-muted-foreground mt-2 text-lg">نوێترین بابەتە ئەکادیمییەکان لە بواری ڕادیۆلۆجیدا</p>
            </div>
            <Link to="/articles">
              <Button variant="ghost" className="hidden md:flex gap-2">
                هەموو بابەتەکان <span className="text-xl">→</span>
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles === undefined ? (
              Array.from({ length: 3 }).map((_, i) => (
                <LessonCardSkeleton key={i} />
              ))
            ) : recentArticles.length > 0 ? (
              recentArticles.map((article: any) => (
                <Link key={article._id} to={`/articles/${article.slug}`}>
                  <Card className="group h-full overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50">
                    {article.coverImageUrl ? (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={article.coverImageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <FileText className="h-12 w-12 text-primary/30" />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <Badge className={`mb-3 ${categoryColors[article.category] || categoryColors.General}`}>
                        {article.category}
                      </Badge>
                      <h3 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{article.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {article.author}
                        </div>
                        {article.publishDate && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {article.publishDate}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
                <p className="text-muted-foreground">هیچ بابەتێک بەردەست نییە</p>
              </div>
            )}
          </div>

          <div className="mt-12 text-center md:hidden">
            <Link to="/articles">
              <Button variant="outline" className="w-full">هەموو بابەتەکان</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl opacity-30 translate-x-1/2 translate-y-1/2" />

        <div className="container text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">ئامادەیت بۆ دەستپێکردن؟</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            هەموو وانەکان بەخۆڕایی و بە کوردی سۆرانین. ئێستا دەستپێبکە بە گەشەکردنی زانستت لە بواری ڕادیۆلۆجیدا.
          </p>
          <Link to="/categories">
            <Button size="lg" className="h-14 px-10 text-lg rounded-full shadow-xl hover:shadow-primary/20 hover:-translate-y-1 transition-all">
              دەستپێکردن بەخۆڕایی
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
