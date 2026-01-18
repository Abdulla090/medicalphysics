import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Grid3X3, Search, User, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';

const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  const navItems = [
    { path: '/', label: 'سەرەتا', icon: Home },
    { path: '/categories', label: 'بەشەکان', icon: Grid3X3 },
    { path: '/search', label: 'گەڕان', icon: Search },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">کردنەوەی مێنو</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] p-0">
        <SheetTitle className="sr-only">مێنوی گەشتکردن</SheetTitle>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <span className="text-lg font-bold text-primary">📚 فێرکاری</span>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t">
            {user ? (
              <div className="space-y-3">
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive('/profile')
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <User className="h-5 w-5" />
                  <span className="font-medium">پرۆفایل</span>
                </Link>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  چوونەدەرەوە
                </Button>
              </div>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)}>
                <Button className="w-full gap-2">
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
