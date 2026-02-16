import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// Map route segments to display names
const getSegmentLabel = (segment: string, language: string): string => {
    const labels: Record<string, Record<string, string>> = {
        categories: { en: 'Categories', ku: 'بەشەکان' },
        category: { en: 'Category', ku: 'بەش' },
        courses: { en: 'Courses', ku: 'کۆرسەکان' },
        course: { en: 'Course', ku: 'کۆرس' },
        tools: { en: 'Tools', ku: 'ئامرازەکان' },
        articles: { en: 'Articles', ku: 'زانیاری' },
        search: { en: 'Search', ku: 'گەڕان' },
        profile: { en: 'Profile', ku: 'پرۆفایل' },
        anatomy: { en: 'Anatomy', ku: 'ئەناتۆمی' },
        atlas: { en: 'Atlas', ku: 'ئەتلەس' },
        demo: { en: 'Demo', ku: 'نیشاندان' },
        'image-viewer': { en: 'Image Viewer', ku: 'بینەری وێنە' },
        'xray-calculator': { en: 'X-Ray Calculator', ku: 'حیسابکەری X-Ray' },
        lesson: { en: 'Lesson', ku: 'وانە' },
        auth: { en: 'Sign In', ku: 'چوونەژوورەوە' },
        admin: { en: 'Admin', ku: 'بەڕێوەبەری' },
        lessons: { en: 'Lessons', ku: 'وانەکان' },
        quizzes: { en: 'Quizzes', ku: 'تاقیکردنەوەکان' },
    };

    const lang = language === 'ku' ? 'ku' : 'en';
    return labels[segment]?.[lang] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
};

// Routes where breadcrumbs should NOT show
const hiddenRoutes = ['/', '/auth'];

interface BreadcrumbsProps {
    className?: string;
    customLabels?: Record<string, string>; // override specific segment labels dynamically
}

const Breadcrumbs = ({ className, customLabels }: BreadcrumbsProps) => {
    const location = useLocation();
    const { language } = useLanguage();

    // Don't render on home or auth
    if (hiddenRoutes.includes(location.pathname)) return null;

    const pathSegments = location.pathname.split('/').filter(Boolean);

    // Don't show for admin routes (they have their own sidebar)
    if (pathSegments[0] === 'admin') return null;

    // Build breadcrumb items
    const crumbs = pathSegments.map((segment, index) => {
        const path = '/' + pathSegments.slice(0, index + 1).join('/');
        const label = customLabels?.[segment] || getSegmentLabel(segment, language);
        const isLast = index === pathSegments.length - 1;
        // Check if segment looks like an ID (uuid, number, slug with many dashes)
        const isId = /^[0-9a-f]{8,}$/i.test(segment) || /^\d+$/.test(segment);

        return { path, label: isId ? '...' : label, isLast, isId };
    });

    if (crumbs.length <= 0) return null;

    return (
        <nav
            aria-label="Breadcrumb"
            className={cn("flex items-center gap-1.5 text-sm py-3", className)}
        >
            <Link
                to="/"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
                <Home className="h-3.5 w-3.5" />
            </Link>

            {crumbs.map((crumb) => (
                <span key={crumb.path} className="flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    {crumb.isLast ? (
                        <span className="font-medium text-foreground truncate max-w-[200px]">
                            {crumb.label}
                        </span>
                    ) : (
                        <Link
                            to={crumb.path}
                            className="text-muted-foreground hover:text-foreground transition-colors duration-200 truncate max-w-[150px]"
                        >
                            {crumb.label}
                        </Link>
                    )}
                </span>
            ))}
        </nav>
    );
};

export default Breadcrumbs;
