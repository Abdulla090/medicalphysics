import { useState, useEffect } from 'react';
import { Microscope } from 'lucide-react';
import { cn } from '@/lib/utils';

const SplashScreen = ({ onFinished }: { onFinished: () => void }) => {
    const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

    useEffect(() => {
        // Check if already shown this session
        const shown = sessionStorage.getItem('splash_shown');
        if (shown) {
            onFinished();
            return;
        }

        // Enter phase
        const holdTimer = setTimeout(() => setPhase('hold'), 100);
        // Exit phase after hold
        const exitTimer = setTimeout(() => setPhase('exit'), 1400);
        // Done
        const doneTimer = setTimeout(() => {
            sessionStorage.setItem('splash_shown', 'true');
            onFinished();
        }, 2000);

        return () => {
            clearTimeout(holdTimer);
            clearTimeout(exitTimer);
            clearTimeout(doneTimer);
        };
    }, [onFinished]);

    // If already shown, don't render at all
    const shown = sessionStorage.getItem('splash_shown');
    if (shown) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-500 ease-out",
                phase === 'exit' ? 'opacity-0' : 'opacity-100'
            )}
        >
            {/* Background radial */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08)_0%,transparent_60%)]" />

            <div
                className={cn(
                    "flex flex-col items-center gap-5 transition-all duration-700 ease-out",
                    phase === 'enter'
                        ? 'opacity-0 scale-90 translate-y-4'
                        : phase === 'hold'
                            ? 'opacity-100 scale-100 translate-y-0'
                            : 'opacity-0 scale-110 -translate-y-4'
                )}
            >
                {/* Logo */}
                <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-2xl shadow-primary/30">
                        <Microscope className="h-10 w-10 text-primary-foreground" />
                    </div>
                    {/* Pulse ring */}
                    <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
                </div>

                {/* Text */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        Medical Physics
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">فێربوونی ڕادیۆلۆجی بە کوردی</p>
                </div>

                {/* Loading dots */}
                <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse"
                            style={{ animationDelay: `${i * 200}ms`, animationDuration: '1s' }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
