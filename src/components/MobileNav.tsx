import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu, X, Home, Grid3X3, Search, User, LogIn, LogOut,
  GraduationCap, ScanLine, Box, LayoutDashboard, FileText, ChevronRight,
  Microscope, Languages, Zap, Wrench, Moon, Sun, ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();

  const isActive = (path: string) => location.pathname === path;
  const isActivePath = (path: string) => location.pathname.startsWith(path);

  // Handle open animation
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      // Trigger animation on next frame
      const raf = requestAnimationFrame(() => {
        setAnimateIn(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      document.body.style.overflow = '';
      setAnimateIn(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close on route change
  useEffect(() => {
    if (open) {
      setAnimateIn(false);
      setTimeout(() => setOpen(false), 50);
    }
  }, [location.pathname]);

  const handleClose = useCallback(() => {
    setAnimateIn(false);
    setTimeout(() => {
      setOpen(false);
    }, 300);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    handleClose();
  };

  const handleNavClick = () => {
    handleClose();
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  // All navigation items organized
  const mainNavItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/categories', label: t('nav.categories'), icon: Grid3X3 },
    { path: '/courses', label: t('nav.courses'), icon: GraduationCap },
    { path: '/tools', label: t('nav.tools'), icon: Wrench },
    { path: '/articles', label: 'زانیاری', icon: FileText },
    { path: '/search', label: t('nav.search'), icon: Search },
  ];

  const toolItems = [
    { path: '/tools/xray-calculator', label: t('tools.xrayCalculator'), icon: Zap },
    { path: '/anatomy/atlas', label: t('tools.anatomyAtlas'), icon: ImageIcon },
    { path: '/demo/image-viewer', label: t('tools.imageViewer'), icon: ScanLine },
    { path: '/anatomy', label: t('tools.3dModel'), icon: Box },
  ];

  const adminItems = [
    { path: '/admin', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/admin/lessons', label: t('admin.manageLessons'), icon: FileText },
    { path: '/admin/categories', label: t('admin.manageCategories'), icon: Grid3X3 },
  ];

  // The fullscreen overlay, rendered via portal to avoid stacking context issues
  const overlay = open
    ? createPortal(
      <div
        className="fixed inset-0 md:hidden"
        style={{ zIndex: 9999 }}
      >
        {/* Background overlay */}
        <div
          className="absolute inset-0 transition-opacity duration-300 ease-out"
          style={{
            backgroundColor: resolvedTheme === 'dark'
              ? 'rgba(0, 0, 0, 0.97)'
              : 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            opacity: animateIn ? 1 : 0,
          }}
          onClick={handleClose}
        />

        {/* Close button - top right */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 flex items-center justify-center w-11 h-11 rounded-full bg-muted/80 hover:bg-muted border border-border/50 transition-all duration-300 ease-out"
          style={{
            opacity: animateIn ? 1 : 0,
            transform: animateIn ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(-90deg)',
            transitionDelay: '100ms',
            zIndex: 10,
          }}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div
          className="relative flex flex-col h-full w-full overflow-y-auto"
          style={{ zIndex: 5 }}
        >
          {/* Header - Logo */}
          <div
            className="flex items-center justify-center pt-16 pb-2 transition-all duration-500 ease-out"
            style={{
              opacity: animateIn ? 1 : 0,
              transform: animateIn ? 'translateY(0)' : 'translateY(-16px)',
              transitionDelay: '80ms',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
                <Microscope className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {t('home.title')}
              </span>
            </div>
          </div>

          {/* Main Navigation - Centered */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-4 -mt-4">
            {/* Primary Nav */}
            <nav className="w-full max-w-xs space-y-1">
              <p
                className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-4 mb-3 transition-all duration-500 ease-out"
                style={{
                  opacity: animateIn ? 1 : 0,
                  transform: animateIn ? 'translateX(0)' : 'translateX(-12px)',
                  transitionDelay: '140ms',
                }}
              >
                {t('nav.navigation')}
              </p>
              {mainNavItems.map((item, index) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 rounded-2xl transition-colors duration-200 group",
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                      : 'text-foreground/80 hover:bg-muted/80 hover:text-foreground active:scale-[0.98]'
                  )}
                  style={{
                    opacity: animateIn ? 1 : 0,
                    transform: animateIn ? 'translateX(0)' : 'translateX(-24px)',
                    transition: 'opacity 0.4s ease-out, transform 0.4s ease-out, background-color 0.2s, color 0.2s',
                    transitionDelay: animateIn ? `${180 + index * 55}ms` : '0ms',
                  }}
                >
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200",
                    isActive(item.path)
                      ? "bg-primary-foreground/20"
                      : "bg-muted/60 group-hover:bg-muted"
                  )}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[15px] font-semibold">{item.label}</span>
                  <ChevronRight className={cn(
                    "h-4 w-4 ml-auto transition-opacity duration-200",
                    isActive(item.path) ? "opacity-80" : "opacity-0 group-hover:opacity-40"
                  )} />
                </Link>
              ))}
            </nav>

            {/* Tools Grid */}
            <div className="w-full max-w-xs mt-5">
              <p
                className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-4 mb-3 transition-all duration-500 ease-out"
                style={{
                  opacity: animateIn ? 1 : 0,
                  transform: animateIn ? 'translateX(0)' : 'translateX(-12px)',
                  transitionDelay: animateIn ? `${180 + mainNavItems.length * 55 + 30}ms` : '0ms',
                }}
              >
                {language === 'ku' ? 'ئامرازەکان' : 'Quick Tools'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {toolItems.map((item, index) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl transition-colors duration-200 group border",
                      isActive(item.path) || isActivePath(item.path)
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-muted/30 text-foreground/70 hover:bg-muted/60 hover:text-foreground active:scale-[0.96] border-transparent'
                    )}
                    style={{
                      opacity: animateIn ? 1 : 0,
                      transform: animateIn ? 'scale(1)' : 'scale(0.85)',
                      transition: 'opacity 0.35s ease-out, transform 0.35s ease-out, background-color 0.2s, color 0.2s',
                      transitionDelay: animateIn ? `${250 + mainNavItems.length * 55 + index * 45}ms` : '0ms',
                    }}
                  >
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-200",
                      isActive(item.path) || isActivePath(item.path)
                        ? "bg-primary/15"
                        : "bg-background/60"
                    )}>
                      <item.icon className="h-[18px] w-[18px]" />
                    </div>
                    <span className="text-[12px] font-medium text-center leading-tight">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Admin Section */}
            {isAdmin && (
              <div className="w-full max-w-xs mt-5">
                <p
                  className="text-[11px] font-semibold uppercase tracking-widest text-orange-500/70 px-4 mb-3 transition-all duration-500 ease-out"
                  style={{
                    opacity: animateIn ? 1 : 0,
                    transform: animateIn ? 'translateX(0)' : 'translateX(-12px)',
                    transitionDelay: animateIn ? `${350 + mainNavItems.length * 55 + toolItems.length * 45}ms` : '0ms',
                  }}
                >
                  {t('nav.administration')}
                </p>
                <nav className="space-y-1">
                  {adminItems.map((item, index) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={handleNavClick}
                      className={cn(
                        "flex items-center gap-4 px-4 py-2.5 rounded-2xl transition-colors duration-200 group",
                        isActivePath(item.path)
                          ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                          : 'text-foreground/70 hover:bg-muted/80 hover:text-foreground active:scale-[0.98]'
                      )}
                      style={{
                        opacity: animateIn ? 1 : 0,
                        transform: animateIn ? 'translateX(0)' : 'translateX(-24px)',
                        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out, background-color 0.2s, color 0.2s',
                        transitionDelay: animateIn ? `${380 + mainNavItems.length * 55 + toolItems.length * 45 + index * 50}ms` : '0ms',
                      }}
                    >
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-200",
                        isActivePath(item.path)
                          ? "bg-orange-500/15"
                          : "bg-muted/60 group-hover:bg-muted"
                      )}>
                        <item.icon className="h-[18px] w-[18px]" />
                      </div>
                      <span className="text-[14px] font-medium">{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </div>

          {/* Footer - Settings & Auth */}
          <div
            className="px-8 pb-8 pt-2 transition-all duration-500 ease-out"
            style={{
              opacity: animateIn ? 1 : 0,
              transform: animateIn ? 'translateY(0)' : 'translateY(16px)',
              transitionDelay: animateIn ? '550ms' : '0ms',
            }}
          >
            <div className="w-full max-w-xs mx-auto space-y-3">
              {/* Quick Settings Row */}
              <div className="flex items-center justify-center gap-3">
                {/* Language Toggle */}
                <button
                  onClick={() => setLanguage(language === 'en' ? 'ku' : 'en')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted/50 border border-border/50 hover:bg-muted transition-all duration-200 active:scale-[0.97]"
                >
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {language === 'en' ? 'کوردی' : 'English'}
                  </span>
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted/50 border border-border/50 hover:bg-muted transition-all duration-200 active:scale-[0.97]"
                >
                  {resolvedTheme === 'dark' ? (
                    <Sun className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-indigo-500" />
                  )}
                  <span className="text-sm font-medium">
                    {resolvedTheme === 'dark'
                      ? (language === 'ku' ? 'ڕووناک' : 'Light')
                      : (language === 'ku' ? 'تاریک' : 'Dark')
                    }
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-border/50 mx-4" />

              {/* Auth Section */}
              {user ? (
                <div className="space-y-2">
                  <Link
                    to="/profile"
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 active:scale-[0.98]",
                      isActive('/profile')
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'bg-muted/40 hover:bg-muted/80'
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm">{t('nav.profile')}</span>
                      <span className="text-xs opacity-60 truncate">
                        {user.primaryEmailAddress?.emailAddress || user.username || ''}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-auto opacity-40" />
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-2xl text-destructive bg-destructive/5 border border-destructive/10 hover:bg-destructive/10 transition-all duration-200 active:scale-[0.98]"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm font-medium">{t('nav.signOut')}</span>
                  </button>
                </div>
              ) : (
                <Link to="/auth" onClick={handleNavClick}>
                  <button className="flex items-center justify-center gap-2.5 w-full px-4 py-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 active:scale-[0.98] font-semibold">
                    <LogIn className="h-5 w-5" />
                    <span>{t('nav.signIn')}</span>
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
    : null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden relative"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
        <span className="sr-only">{open ? t('nav.closeMenu') : t('nav.openMenu')}</span>
      </Button>

      {overlay}
    </>
  );
};

export default MobileNav;
