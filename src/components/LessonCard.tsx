import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LessonWithCategory, getDifficultyName } from '@/lib/api';

interface LessonCardProps {
  lesson: LessonWithCategory;
}

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

const difficultyNames: Record<string, string> = {
  beginner: 'سەرەتایی',
  intermediate: 'ناوەندی',
  advanced: 'پێشکەوتوو',
};

const LessonCard = ({ lesson }: LessonCardProps) => {
  return (
    <Link to={`/lesson/${lesson.slug}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="relative aspect-video overflow-hidden">
          <img
            src={lesson.image_url}
            alt={lesson.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute top-3 right-3 flex gap-2">
            <Badge className={categoryStyles[lesson.category]}>
              {lesson.categories?.name}
            </Badge>
          </div>
          <div className="absolute bottom-3 right-3 flex gap-2">
            <Badge variant="secondary" className="flex items-center gap-1 bg-card/90">
              <Clock className="h-3 w-3" />
              {lesson.duration}
            </Badge>
            <Badge className={difficultyStyles[lesson.difficulty]}>
              {difficultyNames[lesson.difficulty]}
            </Badge>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {lesson.title}
          </h3>
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
            {lesson.description}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{lesson.instructor}</span>
            <span className="text-sm font-medium text-primary">خوێندنەوە</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default LessonCard;
