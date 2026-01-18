import { Link, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">📚 ڤیدیۆ و وێنەی فێرکاری</span>
        </Link>

        <nav className="flex items-center gap-1">
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
          <Link to="/search">
            <Button 
              variant={isActive('/search') ? 'secondary' : 'ghost'} 
              className="font-medium"
            >
              گەڕان
            </Button>
          </Link>
          <Link to="/search">
            <Button variant="outline" size="icon" className="mr-2">
              <Search className="h-4 w-4" />
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
