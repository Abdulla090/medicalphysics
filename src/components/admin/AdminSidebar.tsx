import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  FolderOpen, 
  LogOut,
  Home,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'داشبۆرد' },
    { path: '/admin/lessons', icon: BookOpen, label: 'وانەکان' },
    { path: '/admin/categories', icon: FolderOpen, label: 'بەشەکان' },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-64 min-h-screen bg-card border-l flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-primary">پانێڵی بەڕێوەبەر</h1>
        <p className="text-sm text-muted-foreground">بەڕێوەبردنی ناوەڕۆک</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link key={item.path} to={item.path}>
            <Button
              variant={isActive(item.path) ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3',
                isActive(item.path) && 'bg-secondary'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t space-y-2">
        <Link to="/">
          <Button variant="outline" className="w-full justify-start gap-3">
            <Home className="h-4 w-4" />
            گەڕانەوە بۆ ماڵەوە
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-destructive hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          چوونە دەرەوە
        </Button>
      </div>
    </div>
  );
};

export default AdminSidebar;
