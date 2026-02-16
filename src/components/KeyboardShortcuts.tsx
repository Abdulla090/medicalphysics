import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface Shortcut {
    key: string;
    label: string;
    labelKu: string;
    combo: string;
}

const shortcuts: Shortcut[] = [
    { key: '/', combo: '/', label: 'Focus Search', labelKu: 'ڕەوی بۆ گەڕان' },
    { key: 'h', combo: 'Alt + H', label: 'Go Home', labelKu: 'بچۆ بۆ سەرەتا' },
    { key: 'Escape', combo: 'Esc', label: 'Close / Back', labelKu: 'داخستن / گەڕانەوە' },
    { key: '?', combo: 'Shift + ?', label: 'Show Shortcuts', labelKu: 'پیشاندانی کورتبڕەکان' },
];

const KeyboardShortcuts = () => {
    const [showHelp, setShowHelp] = useState(false);
    const navigate = useNavigate();
    const { language } = useLanguage();

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Ignore if user is typing in an input
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            if (e.key === 'Escape') {
                if (showHelp) {
                    setShowHelp(false);
                    return;
                }
                // Could close modals or go back
                return;
            }

            if (isInput) return;

            if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                navigate('/search');
                // Focus search input after navigation
                setTimeout(() => {
                    const searchInput = document.querySelector('input[type="search"], input[placeholder*="earch"], input[placeholder*="ەڕان"]') as HTMLInputElement;
                    searchInput?.focus();
                }, 300);
                return;
            }

            if (e.key === '?' && e.shiftKey) {
                e.preventDefault();
                setShowHelp((prev) => !prev);
                return;
            }

            if (e.altKey && e.key === 'h') {
                e.preventDefault();
                navigate('/');
                return;
            }
        },
        [navigate, showHelp]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!showHelp) return null;

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setShowHelp(false)}
            />

            {/* Modal */}
            <div className="relative bg-background border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 fade-in duration-200">
                <h3 className="text-lg font-bold mb-4">
                    {language === 'ku' ? 'کورتبڕەکانی تەختەکلیل' : 'Keyboard Shortcuts'}
                </h3>

                <div className="space-y-2.5">
                    {shortcuts.map((shortcut) => (
                        <div
                            key={shortcut.key}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                            <span className="text-sm text-muted-foreground">
                                {language === 'ku' ? shortcut.labelKu : shortcut.label}
                            </span>
                            <kbd className="inline-flex items-center px-2.5 py-1 rounded-md border border-border bg-muted/50 text-xs font-mono font-medium text-muted-foreground">
                                {shortcut.combo}
                            </kbd>
                        </div>
                    ))}
                </div>

                <div className="mt-5 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground text-center">
                        {language === 'ku'
                            ? 'دوگمەی Esc بۆ داخستن'
                            : 'Press Esc to close'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default KeyboardShortcuts;
