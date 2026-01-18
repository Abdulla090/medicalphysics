import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { CourseCard, useCourses } from '@/components/CourseCard';

const Courses = () => {
  const { data: courses, isLoading } = useCourses();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">کۆرسەکان</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              کۆرسی تەواو بۆ فێربوونی ڕادیۆلۆژی بە شێوەیەکی ڕێکخراو
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-8">بارکردن...</div>
          ) : courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">هیچ کۆرسێک نییە</p>
              <Link to="/categories" className="text-primary hover:underline">
                وانەکان ببینە
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Courses;
