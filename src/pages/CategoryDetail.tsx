import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import LessonCard from '@/components/LessonCard';
import { fetchCategoryById, fetchLessonsByCategory, CategoryType } from '@/lib/api';

const CategoryDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: category, isLoading: isLoadingCategory } = useQuery({
    queryKey: ['category', id],
    queryFn: () => fetchCategoryById(id as CategoryType),
    enabled: !!id,
  });

  const { data: lessons, isLoading: isLoadingLessons } = useQuery({
    queryKey: ['lessons-by-category', id],
    queryFn: () => fetchLessonsByCategory(id as CategoryType),
    enabled: !!id,
  });

  if (isLoadingCategory) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">بارکردن...</div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold">بەش نەدۆزرایەوە</h1>
          <Link to="/categories" className="text-primary hover:underline mt-4 inline-block">
            گەڕانەوە بۆ بەشەکان
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-16">
        <div className="container">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link to="/" className="hover:text-primary">سەرەتا</Link>
            <ChevronLeft className="h-4 w-4" />
            <Link to="/categories" className="hover:text-primary">بەشەکان</Link>
            <ChevronLeft className="h-4 w-4" />
            <span className="text-foreground">{category.name}</span>
          </nav>

          <div className="text-center mb-12">
            <span className="text-5xl mb-4 block">{category.icon}</span>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{category.name}</h1>
            <p className="text-muted-foreground">{category.english_name}</p>
            <p className="text-lg mt-4">{category.description}</p>
          </div>

          {isLoadingLessons ? (
            <div className="text-center py-8">بارکردن...</div>
          ) : lessons && lessons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">هیچ وانەیەک نییە لەم بەشەدا</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default CategoryDetail;
