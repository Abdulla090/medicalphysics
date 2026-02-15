import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Search, User, LogIn, LogOut, GraduationCap, ScanLine,
  BookOpen, Grid3X3, ChevronDown, Box, Microscope, Settings,
  LayoutDashboard, Users, FileText, Languages, Image as ImageIcon, Zap, Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileNav from './MobileNav';
import ThemeToggle from './ThemeToggle';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [toolsOpen, setToolsOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const isActivePath = (path: string) => location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await signOut();
  };

  // Navigation items
  const navItems = [
    { name: t('nav.home'), path: '/', icon: null },
    { name: t('nav.categories'), path: '/categories', icon: Grid3X3 },
    { name: t('nav.tools'), path: '/tools', icon: Wrench },
    { name: t('nav.courses'), path: '/courses', icon: GraduationCap },
    { name: 'زانیاری ', path: '/articles', icon: FileText },
  ];

  // Tools dropdown items
  const toolItems = [
    {
      name: t('tools.anatomyAtlas'),
      path: '/anatomy/atlas',
      icon: ImageIcon,
      description: t('tools.anatomyAtlasDesc'),
      highlight: true
    },
    {
      name: t('tools.imageViewer'),
      path: '/demo/image-viewer',
      icon: ScanLine,
      description: t('tools.imageViewerDesc')
    },
    {
      name: t('tools.3dModel'),
      path: '/anatomy',
      icon: Box,
      description: t('tools.3dModelDesc')
    },
    {
      name: t('tools.xrayCalculator'),
      path: '/tools/xray-calculator',
      icon: Zap,
      description: t('tools.xrayCalculatorDesc'),
      highlight: true
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-md shadow-primary/20 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
              <Microscope className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {t('home.title')}
              </span>
            </div>
          </Link>

          {/* Centered Desktop Navigation */}
          <nav className="hidden md:flex items-center justify-center flex-1 mx-8">
            <div className="flex items-center gap-1 p-1.5 rounded-full bg-muted/50 border border-border/50">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-full px-4 h-9 font-medium transition-all duration-200",
                      isActive(item.path)
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                    )}
                  >
                    {item.icon && <item.icon className="h-4 w-4 ml-1.5" />}
                    {item.name}
                  </Button>
                </Link>
              ))}

              <Link to="/search">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-full px-4 h-9 font-medium transition-all duration-200",
                    isActive('/search')
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                  )}
                >
                  <Search className="h-4 w-4 ml-1.5" />
                  {t('nav.search')}
                </Button>
              </Link>
            </div>
          </nav>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-2">
            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'ku' : 'en')}
              className="rounded-full h-9 px-3 gap-1.5 border border-border/50 hover:border-border hover:bg-accent"
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs font-medium">{t('language.toggle')}</span>
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-9 w-9 border border-border/50 hover:border-border hover:bg-accent"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2">
                  <div className="px-2 py-1.5 mb-2">
                    <p className="text-sm font-medium">{user.primaryEmailAddress?.emailAddress || user.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {isAdmin ? t('role.admin') : t('role.user')}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer p-2">
                      <User className="h-4 w-4" />
                      {t('nav.profile')}
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                        {t('nav.management')}
                      </DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2 cursor-pointer p-2">
                          <LayoutDashboard className="h-4 w-4" />
                          {t('nav.dashboard')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/lessons" className="flex items-center gap-2 cursor-pointer p-2">
                          <FileText className="h-4 w-4" />
                          {t('nav.lessons')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/categories" className="flex items-center gap-2 cursor-pointer p-2">
                          <Grid3X3 className="h-4 w-4" />
                          {t('nav.categories')}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 cursor-pointer p-2 text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button
                  size="sm"
                  className="rounded-full px-4 h-9 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                >
                  <LogIn className="h-4 w-4 ml-1.5" />
                  {t('nav.login')}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Navigation */}
          <MobileNav />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
