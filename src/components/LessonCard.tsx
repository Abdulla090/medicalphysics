import { Link } from 'react-router-dom';
import { Clock, User, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LessonWithCategory } from '@/lib/api';

interface LessonCardProps {
  lesson: LessonWithCategory;
}

const difficultyNames: Record<string, string> = {
  beginner: 'سەرەتایی',
  intermediate: 'ناوەندی',
  advanced: 'پێشکەوتوو',
};

const LessonCard = ({ lesson }: LessonCardProps) => {
  return (
    <Link to={`/lesson/${lesson.slug}`}>
      <Card className="group h-full bg-card border border-border hover:border-primary/30 transition-colors duration-200">
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={lesson.image_url}
            alt={lesson.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <Badge 
            variant="secondary" 
            className="absolute top-3 right-3 bg-background/90 text-foreground text-xs font-normal"
          >
            {lesson.categories?.name}
          </Badge>
        </div>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {lesson.title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
            {lesson.description}
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {lesson.duration}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {lesson.instructor}
              </span>
            </div>
            <Badge 
              variant="outline" 
              className="text-xs font-normal border-border"
            >
              {difficultyNames[lesson.difficulty]}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-sm text-primary font-medium pt-1 group-hover:gap-2 transition-all">
            <span>خوێندنەوە</span>
            <ArrowLeft className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default LessonCard;
