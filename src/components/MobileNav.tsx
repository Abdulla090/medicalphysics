import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu, X, Home, Grid3X3, Search, User, LogIn, LogOut,
  GraduationCap, ScanLine, Box, LayoutDashboard, FileText, ChevronDown,
  Microscope, Languages, ImageIcon, Zap, Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, VisuallyHidden } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import ThemeToggle from './ThemeToggle';

const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const isActive = (path: string) => location.pathname === path;
  const isActivePath = (path: string) => location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  const navItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/categories', label: t('nav.categories'), icon: Grid3X3 },
    { path: '/courses', label: t('nav.courses'), icon: GraduationCap },
    { path: '/search', label: t('nav.search'), icon: Search },
  ];

  const toolItems = [
    { path: '/tools', label: language === 'ku' ? 'هەموو ئامرازەکان' : 'All Tools', icon: Wrench, highlight: false },
    { path: '/tools/xray-calculator', label: t('tools.xrayCalculator'), icon: Zap, highlight: true },
    { path: '/anatomy/atlas', label: t('tools.anatomyAtlas'), icon: ImageIcon, highlight: true },
    { path: '/demo/image-viewer', label: t('tools.imageViewer'), icon: ScanLine },
    { path: '/anatomy', label: t('tools.3dModel'), icon: Box },
  ];

  const adminItems = [
    { path: '/admin', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/admin/lessons', label: t('admin.manageLessons'), icon: FileText },
    { path: '/admin/categories', label: t('admin.manageCategories'), icon: Grid3X3 },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">{t('nav.openMenu')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] p-0" hideCloseButton>
        <VisuallyHidden>
          <SheetTitle>{t('nav.navigationMenu')}</SheetTitle>
        </VisuallyHidden>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-md">
                <Microscope className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">{t('home.title')}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {/* Main Navigation */}
            <div className="pb-2">
              <p className="text-xs font-medium text-muted-foreground px-3 mb-2">{t('nav.navigation')}</p>
              {[...navItems, { path: '/tools', label: t('nav.tools'), icon: Wrench }].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'hover:bg-muted'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Admin Section */}
            {isAdmin && (
              <div className="py-2 border-t">
                <p className="text-xs font-medium text-muted-foreground px-3 mb-2">{t('nav.administration')}</p>
                {adminItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActivePath(item.path)
                        ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                        : 'hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </nav>

          {/* Footer Section */}
          <div className="p-4 border-t bg-muted/30 space-y-3">
            {/* Language Toggle */}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-medium">{t('language.toggle')}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLanguage(language === 'en' ? 'ku' : 'en')}
                className="gap-2"
              >
                <Languages className="h-4 w-4" />
                {language === 'en' ? 'کوردی' : 'English'}
              </Button>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-medium">{t('theme.toggle')}</span>
              <ThemeToggle />
            </div>

            {/* User Section */}
            {user ? (
              <div className="space-y-2">
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive('/profile')
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-background'
                  )}
                >
                  <User className="h-5 w-5" />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{t('nav.profile')}</span>
                    <span className="text-xs opacity-70">{user.primaryEmailAddress?.emailAddress || user.username || ''}</span>
                  </div>
                </Link>
                <Button
                  variant="outline"
                  className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.signOut')}
                </Button>
              </div>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)}>
                <Button className="w-full gap-2 shadow-md">
                  <LogIn className="h-4 w-4" />
                  {t('nav.signIn')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
