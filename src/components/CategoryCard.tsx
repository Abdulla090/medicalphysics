import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import type { Category, CategoryType } from '@/lib/api';

interface CategoryCardProps {
  category: Category & { lessonCount?: number };
  variant?: 'default' | 'compact';
}

const categoryBgStyles: Record<CategoryType, string> = {
  xray: 'bg-category-xray-bg border-category-xray/20',
  ct: 'bg-category-ct-bg border-category-ct/20',
  mri: 'bg-category-mri-bg border-category-mri/20',
  ultrasound: 'bg-category-ultrasound-bg border-category-ultrasound/20',
  nuclear: 'bg-category-nuclear-bg border-category-nuclear/20',
};

const categoryTextStyles: Record<CategoryType, string> = {
  xray: 'text-category-xray',
  ct: 'text-category-ct',
  mri: 'text-category-mri',
  ultrasound: 'text-category-ultrasound',
  nuclear: 'text-category-nuclear',
};

const CategoryCard = ({ category, variant = 'default' }: CategoryCardProps) => {
  if (variant === 'compact') {
    return (
      <Link to={`/category/${category.id}`}>
        <Card className={`${categoryBgStyles[category.id]} border-2 transition-all duration-300 hover:shadow-md hover:-translate-y-1`}>
          <CardContent className="p-4 text-center">
            <span className="text-3xl mb-2 block">{category.icon}</span>
            <h3 className={`font-bold ${categoryTextStyles[category.id]}`}>{category.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{category.english_name}</p>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link to={`/category/${category.id}`}>
      <Card className={`${categoryBgStyles[category.id]} border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl">{category.icon}</span>
            <div className="flex-1">
              <h3 className={`font-bold text-xl ${categoryTextStyles[category.id]}`}>
                {category.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{category.english_name}</p>
              <p className="text-sm mt-2">{category.description}</p>
              <p className={`text-sm font-medium mt-3 ${categoryTextStyles[category.id]}`}>
                {category.lessonCount || 0} وانە
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default CategoryCard;
