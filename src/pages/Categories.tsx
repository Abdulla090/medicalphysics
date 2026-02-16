// import { useQuery } from '@tanstack/react-query';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import PageLayout from '@/components/PageLayout';
import CategoryCard from '@/components/CategoryCard';

import { useLanguage } from '@/contexts/LanguageContext';

const Categories = () => {
  const { t } = useLanguage();
  /*
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: lessonCounts } = useQuery({
    queryKey: ['lesson-counts'],
    queryFn: fetchCategoryLessonCounts,
  }); 
  */

  // Convex Migration
  const categories = useQuery(api.api.getCategories);
  const isLoading = categories === undefined;

  const lessonCountsQuery = useQuery(api.admin.getCategoryLessonCounts);
  const lessonCounts = lessonCountsQuery || {};

  return (
    <PageLayout>

      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{t('categories.pageTitle')}</h1>
            <p className="text-lg text-muted-foreground">{t('categories.pageSubtitle')}</p>
          </div>

          {isLoading ? (
            <div className="text-center py-8">بارکردن...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {categories?.map((category, index) => (
                <CategoryCard
                  key={category.id}
                  index={index}
                  category={{ ...category, lessonCount: lessonCounts?.[category.id] || 0 } as any}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Categories;
