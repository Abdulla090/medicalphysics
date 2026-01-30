import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Search, User, LogIn, LogOut, GraduationCap, ScanLine,
  BookOpen, Grid3X3, ChevronDown, Box, Microscope, Settings,
  LayoutDashboard, Users, FileText
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
import MobileNav from './MobileNav';
import ThemeToggle from './ThemeToggle';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const [toolsOpen, setToolsOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const isActivePath = (path: string) => location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await signOut();
  };

  // Navigation items
  const navItems = [
    { name: 'سەرەتا', path: '/', icon: null },
    { name: 'بەشەکان', path: '/categories', icon: Grid3X3 },
    { name: 'کۆرسەکان', path: '/courses', icon: GraduationCap },
  ];

  // Tools dropdown items
  const toolItems = [
    {
      name: 'بینەری وێنەی پزیشکی',
      path: '/demo/image-viewer',
      icon: ScanLine,
      description: 'بینین و شیکردنەوەی وێنەکانی DICOM'
    },
    {
      name: 'مۆدێلی 3Dی جەستە',
      path: '/anatomy',
      icon: Box,
      description: 'گەڕان لە ئەناتۆمی جەستەی مرۆڤ'
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
                فیزیای پزیشکی
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

              {/* Tools Dropdown - Opens on Hover */}
              <div
                className="relative"
                onMouseEnter={() => setToolsOpen(true)}
                onMouseLeave={() => setToolsOpen(false)}
              >
                <DropdownMenu open={toolsOpen} onOpenChange={setToolsOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "rounded-full px-4 h-9 font-medium transition-all duration-200 gap-1",
                        isActivePath('/demo') || isActivePath('/anatomy')
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                      )}
                    >
                      <ScanLine className="h-4 w-4 ml-1.5" />
                      ئامرازەکان
                      <ChevronDown className={cn(
                        "h-3 w-3 transition-transform duration-200",
                        toolsOpen && "rotate-180"
                      )} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    className="w-64 p-2"
                    onMouseEnter={() => setToolsOpen(true)}
                    onMouseLeave={() => setToolsOpen(false)}
                  >
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pb-2">
                      ئامرازە پزیشکییەکان
                    </DropdownMenuLabel>
                    {toolItems.map((tool) => (
                      <DropdownMenuItem key={tool.path} asChild>
                        <Link
                          to={tool.path}
                          className="flex items-start gap-3 p-2 cursor-pointer rounded-lg hover:bg-accent"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <tool.icon className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm">{tool.name}</span>
                            <span className="text-xs text-muted-foreground">{tool.description}</span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Search Link */}
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
                  گەڕان
                </Button>
              </Link>
            </div>
          </nav>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-2">
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
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {isAdmin ? 'بەڕێوەبەر' : 'بەکارهێنەر'}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer p-2">
                      <User className="h-4 w-4" />
                      پرۆفایلی من
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                        بەڕێوەبردن
                      </DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2 cursor-pointer p-2">
                          <LayoutDashboard className="h-4 w-4" />
                          داشبۆرد
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/lessons" className="flex items-center gap-2 cursor-pointer p-2">
                          <FileText className="h-4 w-4" />
                          وانەکان
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/categories" className="flex items-center gap-2 cursor-pointer p-2">
                          <Grid3X3 className="h-4 w-4" />
                          بەشەکان
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
                    چوونەدەرەوە
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
                  چوونەژوورەوە
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
