import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Atom, Activity, Scan, Waves, Zap, Bone, FileImage } from 'lucide-react';
import type { Category, CategoryType } from '@/lib/api';

interface CategoryCardProps {
  category: Category & { lessonCount?: number };
  variant?: 'default' | 'compact';
  index?: number;
}

// Map IDs to Lucide icons for a more professional look
const iconMap: Record<string, any> = {
  // X-ray / Radiography
  xray: Atom,
  'x-ray': Atom,
  radiography: Atom,
  'general-radiography': Atom,

  // CT
  ct: Scan,
  'computed-tomography': Scan,

  // MRI
  mri: Activity,
  'magnetic-resonance': Activity,

  // Ultrasound
  ultrasound: Waves,
  us: Waves,

  // Nuclear Medicine
  nuclear: Zap,
  nm: Zap,

  // DEXA
  dexa: Bone,
  dxa: Bone,
  'bone-densitometry': Bone,

  // Mammography
  mammography: FileImage,
};

const CategoryCard = ({ category, variant = 'default', index = 0 }: CategoryCardProps) => {
  const englishName = (category as any).englishName || category.english_name;
  const Icon = iconMap[category.id] || Atom;

  if (variant === 'compact') {
    return (
      <Link
        to={`/category/${category.id}`}
        className="block group relative h-full bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="p-4 flex flex-col items-center justify-center text-center space-y-2 relative z-10">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            {iconMap[category.id] ? <Icon className="w-5 h-5" /> : <span className="text-xl">{category.icon}</span>}
          </div>
          <h3 className="font-semibold text-sm">{category.name}</h3>
          <p className="text-xs text-muted-foreground font-mono">{englishName}</p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/category/${category.id}`}
      className="block group relative h-full"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Background Glow Effect */}
      <div className="absolute -inset-px bg-gradient-to-r from-primary/50 to-blue-600/50 rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition duration-500 will-change-transform" />

      {/* Main Card Content */}
      <div className="relative h-full bg-card border border-border/40 rounded-2xl p-6 overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl dark:group-hover:shadow-primary/5">

        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl transition-all duration-700 group-hover:bg-primary/10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full -ml-12 -mb-12 blur-xl transition-all duration-700 group-hover:bg-blue-500/10" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Header: Icon & English Name */}
          <div className="flex justify-between items-start mb-5">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-background to-muted border border-border/50 shadow-sm flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out">
              {/* Prefer Lucide icon if available, else emoji or text icon */}
              {iconMap[category.id] ? <Icon className="w-7 h-7" /> : <span className="text-3xl">{category.icon}</span>}
            </div>
            <span className="text-[10px] font-mono font-bold text-muted-foreground/40 bg-muted/30 px-2 py-1 rounded border border-border/30 uppercase tracking-widest group-hover:text-primary/70 group-hover:border-primary/20 transition-colors">
              {englishName}
            </span>
          </div>

          {/* Title & Description */}
          <div className="flex-1 space-y-3">
            <h3 className="text-2xl font-bold text-foreground group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-l group-hover:from-blue-600 group-hover:to-primary transition-all duration-300">
              {category.name}
            </h3>
            <p className="text-sm text-foreground/60 line-clamp-2 leading-relaxed group-hover:text-foreground/80 transition-colors">
              {category.description}
            </p>
          </div>

          {/* Footer: Stats & Action */}
          <div className="mt-8 pt-4 border-t border-dashed border-border/60 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary/80 transition-colors">
              <BookOpen className="w-4 h-4" />
              <span className="font-medium">{category.lessonCount || 0} وانە</span>
            </div>

            <div className="flex items-center gap-2 text-primary font-bold opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 ease-out">
              <span>سەیرکردن</span>
              <ArrowLeft className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;
