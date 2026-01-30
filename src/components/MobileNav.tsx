import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu, X, Home, Grid3X3, Search, User, LogIn, LogOut,
  GraduationCap, ScanLine, Box, LayoutDashboard, FileText, ChevronDown,
  Microscope
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, VisuallyHidden } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import ThemeToggle from './ThemeToggle';

const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const isActivePath = (path: string) => location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  const navItems = [
    { path: '/', label: 'سەرەتا', icon: Home },
    { path: '/categories', label: 'بەشەکان', icon: Grid3X3 },
    { path: '/courses', label: 'کۆرسەکان', icon: GraduationCap },
    { path: '/search', label: 'گەڕان', icon: Search },
  ];

  const toolItems = [
    { path: '/demo/image-viewer', label: 'بینەری وێنەی پزیشکی', icon: ScanLine },
    { path: '/anatomy', label: 'مۆدێلی 3D ی جەستە', icon: Box },
  ];

  const adminItems = [
    { path: '/admin', label: 'داشبۆرد', icon: LayoutDashboard },
    { path: '/admin/lessons', label: 'بەڕێوەبردنی وانەکان', icon: FileText },
    { path: '/admin/categories', label: 'بەڕێوەبردنی بەشەکان', icon: Grid3X3 },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">کردنەوەی مێنو</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] p-0" hideCloseButton>
        <VisuallyHidden>
          <SheetTitle>مێنوی گەشتکردن</SheetTitle>
        </VisuallyHidden>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-md">
                <Microscope className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">فیزیای پزیشکی</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {/* Main Navigation */}
            <div className="pb-2">
              <p className="text-xs font-medium text-muted-foreground px-3 mb-2">گەشتکردن</p>
              {navItems.map((item) => (
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

            {/* Tools Section */}
            <div className="py-2 border-t">
              <button
                onClick={() => setToolsExpanded(!toolsExpanded)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>ئامرازەکان</span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  toolsExpanded && "rotate-180"
                )} />
              </button>
              <div className={cn(
                "space-y-1 overflow-hidden transition-all duration-300",
                toolsExpanded ? "max-h-40 opacity-100 mt-1" : "max-h-0 opacity-0"
              )}>
                {toolItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActivePath(item.path)
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Admin Section */}
            {isAdmin && (
              <div className="py-2 border-t">
                <p className="text-xs font-medium text-muted-foreground px-3 mb-2">بەڕێوەبردن</p>
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
            {/* Theme Toggle */}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-medium">دۆخی تاریک</span>
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
                    <span className="font-medium text-sm">پرۆفایل</span>
                    <span className="text-xs opacity-70">{user.email}</span>
                  </div>
                </Link>
                <Button
                  variant="outline"
                  className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  چوونەدەرەوە
                </Button>
              </div>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)}>
                <Button className="w-full gap-2 shadow-md">
                  <LogIn className="h-4 w-4" />
                  چوونەژوورەوە
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
