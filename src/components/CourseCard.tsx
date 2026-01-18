import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Clock, Trophy, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProgress } from '@/hooks/useProgress';
import { getDifficultyName, DifficultyLevel } from '@/lib/api';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  difficulty: DifficultyLevel;
  estimated_duration: string | null;
  is_published: boolean;
}

interface CourseWithLessons extends Course {
  lesson_count: number;
}

const difficultyStyles: Record<string, string> = {
  beginner: 'difficulty-beginner',
  intermediate: 'difficulty-intermediate',
  advanced: 'difficulty-advanced',
};

interface CourseCardProps {
  course: CourseWithLessons;
}

export const CourseCard = ({ course }: CourseCardProps) => {
  const { user } = useAuth();
  const { progress } = useProgress();

  const { data: courseLessons } = useQuery({
    queryKey: ['course-lessons', course.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('lesson_id')
        .eq('course_id', course.id);
      if (error) throw error;
      return data;
    },
  });

  const completedLessons = courseLessons?.filter(cl => 
    progress?.some(p => p.lesson_id === cl.lesson_id && p.completed)
  ).length ?? 0;

  const progressPercent = courseLessons && courseLessons.length > 0 
    ? Math.round((completedLessons / courseLessons.length) * 100)
    : 0;

  return (
    <Link to={`/course/${course.slug}`}>
      <Card className="h-full hover:shadow-lg transition-all overflow-hidden group">
        {course.image_url && (
          <div className="aspect-video overflow-hidden">
            <img
              src={course.image_url}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={difficultyStyles[course.difficulty]}>
              {getDifficultyName(course.difficulty)}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <BookOpen className="h-3 w-3" />
              {course.lesson_count} وانە
            </Badge>
          </div>
          <CardTitle className="line-clamp-2">{course.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {course.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {course.description}
            </p>
          )}
          
          {course.estimated_duration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Clock className="h-4 w-4" />
              {course.estimated_duration}
            </div>
          )}

          {user && courseLessons && courseLessons.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">پێشکەوتن</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              {progressPercent === 100 && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <Trophy className="h-4 w-4" />
                  تەواوکرا!
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 text-primary text-sm mt-4 group-hover:gap-2 transition-all">
            <span>بینینی کۆرس</span>
            <ChevronLeft className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export const useCourses = () => {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('order_index');

      if (error) throw error;

      // Get lesson counts
      const coursesWithCounts = await Promise.all(
        courses.map(async (course) => {
          const { count } = await supabase
            .from('course_lessons')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);
          
          return {
            ...course,
            lesson_count: count ?? 0,
          } as CourseWithLessons;
        })
      );

      return coursesWithCounts;
    },
  });
};

export default CourseCard;
