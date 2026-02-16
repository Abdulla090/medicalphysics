import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const BackToTop = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setVisible(window.scrollY > 400);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <button
            onClick={scrollToTop}
            aria-label="Back to top"
            className={cn(
                "fixed bottom-6 right-6 z-40 flex items-center justify-center",
                "h-11 w-11 rounded-full",
                "bg-primary/90 text-primary-foreground",
                "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35",
                "backdrop-blur-sm border border-primary/20",
                "hover:scale-110 active:scale-95",
                "transition-all duration-300 ease-out",
                visible
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 translate-y-4 pointer-events-none"
            )}
        >
            <ArrowUp className="h-5 w-5" />
        </button>
    );
};

export default BackToTop;
