import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import CategoryCard from '@/components/CategoryCard';
import { fetchCategories, fetchCategoryLessonCounts } from '@/lib/api';

const Categories = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: lessonCounts } = useQuery({
    queryKey: ['lesson-counts'],
    queryFn: fetchCategoryLessonCounts,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">بەشەکانی وێنەگرتن</h1>
            <p className="text-lg text-muted-foreground">هەموو جۆرەکانی وێنەگرتنی پزیشکی</p>
          </div>

          {isLoading ? (
            <div className="text-center py-8">بارکردن...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {categories?.map((category) => (
                <CategoryCard 
                  key={category.id} 
                  category={{ ...category, lessonCount: lessonCounts?.[category.id] || 0 }} 
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Categories;
