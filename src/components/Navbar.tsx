import { Link, useLocation } from 'react-router-dom';
import { Search, User, LogIn, LogOut, GraduationCap, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import MobileNav from './MobileNav';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">📚 ڤیدیۆ و وێنەی فێرکاری</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <Link to="/">
            <Button
              variant={isActive('/') ? 'secondary' : 'ghost'}
              className="font-medium"
            >
              سەرەتا
            </Button>
          </Link>
          <Link to="/categories">
            <Button
              variant={isActive('/categories') ? 'secondary' : 'ghost'}
              className="font-medium"
            >
              بەشەکان
            </Button>
          </Link>
          <Link to="/courses">
            <Button
              variant={isActive('/courses') ? 'secondary' : 'ghost'}
              className="font-medium gap-1"
            >
              <GraduationCap className="h-4 w-4" />
              کۆرسەکان
            </Button>
          </Link>
          <Link to="/demo/image-viewer">
            <Button
              variant={location.pathname.startsWith('/demo') ? 'secondary' : 'ghost'}
              className="font-medium gap-1"
            >
              <ScanLine className="h-4 w-4" />
              بینەری وێنە
            </Button>
          </Link>
          <Link to="/search">
            <Button variant="outline" size="icon" className="mr-2">
              <Search className="h-4 w-4" />
            </Button>
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="h-4 w-4 ml-2" />
                    پرۆفایل
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        داشبۆردی بەڕێوەبەر
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="h-4 w-4 ml-2" />
                  چوونەدەرەوە
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="default" className="gap-2">
                <LogIn className="h-4 w-4" />
                چوونەژوورەوە
              </Button>
            </Link>
          )}
        </nav>

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </header>
  );
};

export default Navbar;
