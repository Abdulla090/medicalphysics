import { Link } from 'react-router-dom';
import {
    Microscope, Grid3X3, GraduationCap, Wrench, FileText, Search,
    Heart, ExternalLink, Globe
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const Footer = () => {
    const { language, t } = useLanguage();
    const year = new Date().getFullYear();

    const quickLinks = [
        { path: '/', label: t('nav.home') },
        { path: '/categories', label: t('nav.categories'), icon: Grid3X3 },
        { path: '/courses', label: t('nav.courses'), icon: GraduationCap },
        { path: '/tools', label: t('nav.tools'), icon: Wrench },
        { path: '/articles', label: 'زانیاری', icon: FileText },
        { path: '/search', label: t('nav.search'), icon: Search },
    ];

    const toolLinks = [
        { path: '/tools/xray-calculator', label: language === 'ku' ? 'حیسابکەری X-ray' : 'X-Ray Calculator' },
        { path: '/anatomy/atlas', label: language === 'ku' ? 'ئەتلەسی ئەناتۆمی' : 'Anatomy Atlas' },
        { path: '/demo/image-viewer', label: language === 'ku' ? 'بینەری وێنە' : 'Image Viewer' },
        { path: '/anatomy', label: language === 'ku' ? 'مۆدێلی 3D' : '3D Model' },
    ];

    return (
        <footer className="relative border-t border-border/40 bg-muted/30">
            {/* Gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            <div className="container py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
                    {/* Brand Column */}
                    <div className="lg:col-span-1">
                        <Link to="/" className="flex items-center gap-3 group mb-5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md shadow-primary/20 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                                <Microscope className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                                {t('home.title')}
                            </span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
                            {language === 'ku'
                                ? 'یەکەمین و باشترین سەرچاوەی کوردی بۆ فێربوونی تەکنیکەکانی وێنەگرتنی پزیشکی بە کوالێتی ئەکادیمی.'
                                : 'The first and best Kurdish resource for learning medical imaging techniques with academic quality.'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
                            <Globe className="h-3.5 w-3.5" />
                            <span>{language === 'ku' ? 'کوردی / ئینگلیزی' : 'Kurdish / English'}</span>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-5">
                            {language === 'ku' ? 'لینکە خێراکان' : 'Quick Links'}
                        </h3>
                        <ul className="space-y-3">
                            {quickLinks.map((link) => (
                                <li key={link.path}>
                                    <Link
                                        to={link.path}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-2 group"
                                    >
                                        <span className="h-1 w-1 rounded-full bg-primary/40 group-hover:bg-primary group-hover:scale-150 transition-all duration-200" />
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Tools & Resources */}
                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-5">
                            {language === 'ku' ? 'ئامرازەکان' : 'Tools & Resources'}
                        </h3>
                        <ul className="space-y-3">
                            {toolLinks.map((link) => (
                                <li key={link.path}>
                                    <Link
                                        to={link.path}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-2 group"
                                    >
                                        <span className="h-1 w-1 rounded-full bg-primary/40 group-hover:bg-primary group-hover:scale-150 transition-all duration-200" />
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Connect / About */}
                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-5">
                            {language === 'ku' ? 'دەربارەمان' : 'About'}
                        </h3>
                        <ul className="space-y-3">
                            <li>
                                <Link
                                    to="/auth"
                                    className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-2 group"
                                >
                                    <span className="h-1 w-1 rounded-full bg-primary/40 group-hover:bg-primary group-hover:scale-150 transition-all duration-200" />
                                    {language === 'ku' ? 'چوونەژوورەوە' : 'Sign In'}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/profile"
                                    className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-2 group"
                                >
                                    <span className="h-1 w-1 rounded-full bg-primary/40 group-hover:bg-primary group-hover:scale-150 transition-all duration-200" />
                                    {language === 'ku' ? 'پرۆفایلەکەم' : 'My Profile'}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/courses"
                                    className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-2 group"
                                >
                                    <span className="h-1 w-1 rounded-full bg-primary/40 group-hover:bg-primary group-hover:scale-150 transition-all duration-200" />
                                    {language === 'ku' ? 'دەستپێکردن بەخۆڕایی' : 'Start for Free'}
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-border/40">
                <div className="container py-5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground/60">
                            © {year} {t('home.title')}. {language === 'ku' ? 'هەموو مافەکان پارێزراون.' : 'All rights reserved.'}
                        </p>
                        <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
                            {language === 'ku' ? 'دروستکراوە بە' : 'Made with'}
                            <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
                            {language === 'ku' ? 'لە کوردستان' : 'in Kurdistan'}
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
