import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import ReadingProgressBar from '@/components/ReadingProgressBar';

interface PageLayoutProps {
    children: ReactNode;
    className?: string;
    showFooter?: boolean;
    showBreadcrumbs?: boolean;
    showReadingProgress?: boolean;
    showNavbar?: boolean;
    breadcrumbLabels?: Record<string, string>;
}

/**
 * Shared page layout with Navbar, Breadcrumbs, Footer, and ReadingProgressBar.
 * Used by all public-facing pages.
 */
const PageLayout = ({
    children,
    className,
    showFooter = true,
    showBreadcrumbs = true,
    showReadingProgress = false,
    showNavbar = true,
    breadcrumbLabels,
}: PageLayoutProps) => {
    const location = useLocation();

    // Pages where footer shouldn't show
    const noFooterPaths = ['/auth', '/admin'];
    const shouldShowFooter = showFooter && !noFooterPaths.some(p => location.pathname.startsWith(p));

    return (
        <div className={cn("min-h-screen bg-background flex flex-col", className)}>
            {showReadingProgress && <ReadingProgressBar />}
            {showNavbar && <Navbar />}
            {showBreadcrumbs && (
                <div className="container">
                    <Breadcrumbs customLabels={breadcrumbLabels} />
                </div>
            )}
            <main className="flex-1">
                {children}
            </main>
            {shouldShowFooter && <Footer />}
        </div>
    );
};

export default PageLayout;
