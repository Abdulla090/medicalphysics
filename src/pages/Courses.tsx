import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import CourseCard from '@/components/CourseCard';
import { useCourses } from '@/hooks/useCourses';
import { useLanguage } from '@/contexts/LanguageContext';

const Courses = () => {
  const { courses, isLoading } = useCourses();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{t('courses.title')}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('courses.subtitle')}
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-primary/50 animate-pulse">{t('common.loading')}</div>
          ) : courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CourseCard key={course._id} course={course} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">{t('courses.noCourses')}</p>
              <Link to="/categories" className="text-primary hover:underline">
                {t('courses.viewLessons')}
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Courses;
