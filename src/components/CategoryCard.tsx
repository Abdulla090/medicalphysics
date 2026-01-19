import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Category, CategoryType } from '@/lib/api';

interface CategoryCardProps {
  category: Category & { lessonCount?: number };
  variant?: 'default' | 'compact';
}

const categoryIcons: Record<CategoryType, string> = {
  xray: '☢️',
  ct: '🔬',
  mri: '🧲',
  ultrasound: '📡',
  nuclear: '⚛️',
};

const CategoryCard = ({ category, variant = 'default' }: CategoryCardProps) => {
  if (variant === 'compact') {
    return (
      <Link to={`/category/${category.id}`}>
        <Card className="group h-full bg-card border border-border hover:border-primary/30 transition-colors duration-200">
          <CardContent className="p-4 text-center space-y-2">
            <span className="text-2xl block" aria-hidden="true">
              {category.icon || categoryIcons[category.id]}
            </span>
            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
              {category.name}
            </h3>
            <p className="text-xs text-muted-foreground">{category.english_name}</p>
            {category.lessonCount !== undefined && (
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <BookOpen className="h-3 w-3" />
                {category.lessonCount} وانە
              </p>
            )}
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link to={`/category/${category.id}`}>
      <Card className="group h-full bg-card border border-border hover:border-primary/30 transition-colors duration-200">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-2xl">
              {category.icon || categoryIcons[category.id]}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                {category.name}
              </h3>
              <p className="text-sm text-muted-foreground">{category.english_name}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">{category.description}</p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {category.lessonCount || 0} وانە
                </span>
                <span className="text-sm text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  بینین
                  <ArrowLeft className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default CategoryCard;
