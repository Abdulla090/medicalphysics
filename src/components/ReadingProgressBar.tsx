import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ReadingProgressBarProps {
    className?: string;
}

const ReadingProgressBar = ({ className }: ReadingProgressBarProps) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const calculateProgress = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (docHeight <= 0) {
                setProgress(0);
                return;
            }
            const scrolled = (scrollTop / docHeight) * 100;
            setProgress(Math.min(scrolled, 100));
        };

        window.addEventListener('scroll', calculateProgress, { passive: true });
        calculateProgress(); // initial

        return () => window.removeEventListener('scroll', calculateProgress);
    }, []);

    // Don't show if page isn't scrollable
    if (progress <= 0 && window.scrollY === 0) return null;

    return (
        <div
            className={cn(
                "fixed top-0 left-0 right-0 z-[60] h-[3px] bg-transparent pointer-events-none",
                className
            )}
        >
            <div
                className="h-full bg-gradient-to-r from-primary via-primary to-blue-500 transition-[width] duration-150 ease-out rounded-r-full"
                style={{ width: `${progress}%` }}
            />
            {/* Glow effect at the tip */}
            {progress > 0 && progress < 100 && (
                <div
                    className="absolute top-0 h-[3px] w-8 bg-primary/60 blur-sm rounded-full"
                    style={{ left: `calc(${progress}% - 16px)` }}
                />
            )}
        </div>
    );
};

export default ReadingProgressBar;
