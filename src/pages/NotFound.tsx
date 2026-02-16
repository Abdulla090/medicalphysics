import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, ArrowLeft, Grid3X3, GraduationCap, Wrench, Microscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';

const NotFound = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const quickLinks = [
    { path: '/', label: language === 'ku' ? 'سەرەتا' : 'Home', icon: Home },
    { path: '/categories', label: language === 'ku' ? 'بەشەکان' : 'Categories', icon: Grid3X3 },
    { path: '/courses', label: language === 'ku' ? 'کۆرسەکان' : 'Courses', icon: GraduationCap },
    { path: '/tools', label: language === 'ku' ? 'ئامرازەکان' : 'Tools', icon: Wrench },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="max-w-lg w-full text-center">
          {/* Animated 404 */}
          <div className="relative mb-8">
            <div className="text-[160px] md:text-[200px] font-black leading-none tracking-tighter select-none">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-muted-foreground/20 to-muted-foreground/5">
                404
              </span>
            </div>
            {/* Floating Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-2xl shadow-primary/30 animate-bounce" style={{ animationDuration: '3s' }}>
                <Microscope className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
          </div>

          {/* Message */}
          <h1 className="text-2xl md:text-3xl font-bold mb-3">
            {language === 'ku' ? 'ئەم پەڕەیە نەدۆزرایەوە!' : 'Page Not Found!'}
          </h1>
          <p className="text-muted-foreground mb-8 text-base leading-relaxed max-w-sm mx-auto">
            {language === 'ku'
              ? 'ببورە، ئەو پەڕەی بەدوایدا دەگەڕێیت بوونی نییە یان گواستراوەتەوە.'
              : "Sorry, the page you're looking for doesn't exist or has been moved."}
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-8 max-w-sm mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ku' ? 'گەڕان لە وانەکان...' : 'Search lessons...'}
                className="pl-10 h-11 rounded-xl bg-muted/50 border-border/50 focus:border-primary"
              />
            </div>
            <Button type="submit" size="sm" className="h-11 px-5 rounded-xl">
              {language === 'ku' ? 'گەڕان' : 'Search'}
            </Button>
          </form>

          {/* Quick Links Grid */}
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-8">
            {quickLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/80 hover:border-border transition-all duration-200 group active:scale-[0.97]"
              >
                <link.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {language === 'ku' ? 'گەڕانەوە' : 'Go Back'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
