import { Link } from 'react-router-dom';
import { BookOpen, Clock, Trophy, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useProgress } from '@/hooks/useProgress';
import { getDifficultyName } from '@/lib/api';
import { CourseWithLessons } from '@/hooks/useCourses';

interface CourseCardProps {
  course: CourseWithLessons;
}

export const CourseCard = ({ course }: CourseCardProps) => {
  const { user } = useAuth();
  const { progress } = useProgress();

  // Simple progress calculation based on what we have in Convex
  // Note: For now we'll just show the card, real progress tracking between courses/lessons 
  // can be refined as you populate the Convex data more.
  const progressPercent = 0;

  return (
    <Link to={`/course/${course.slug}`}>
      <Card className="group h-full bg-card border border-border hover:border-primary/30 transition-colors duration-200 overflow-hidden">
        {course.imageUrl && (
          <div className="relative aspect-video overflow-hidden">
            <img
              src={course.imageUrl}
              alt={course.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs font-normal border-border">
              {getDifficultyName(course.difficulty)}
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs font-normal">
              <BookOpen className="h-3 w-3" />
              {course.lesson_count} وانە
            </Badge>
          </div>
          <CardTitle className="text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {course.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {course.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {course.description}
            </p>
          )}

          {course.estimatedDuration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {course.estimatedDuration}
            </div>
          )}

          {user && progressPercent > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">پێشکەوتن</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
              {progressPercent === 100 && (
                <div className="flex items-center gap-1 text-sm text-primary">
                  <Trophy className="h-4 w-4" />
                  تەواوکرا!
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 text-sm text-primary font-medium pt-1 group-hover:gap-2 transition-all">
            <span>بینینی کۆرس</span>
            <ArrowLeft className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default CourseCard;
