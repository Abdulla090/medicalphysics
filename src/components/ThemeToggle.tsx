import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';

const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Sun className={`h-5 w-5 transition-all ${resolvedTheme === 'dark' ? 'scale-0 rotate-90' : 'scale-100 rotate-0'}`} />
          <Moon className={`absolute h-5 w-5 transition-all ${resolvedTheme === 'dark' ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`} />
          <span className="sr-only">گۆڕینی ڕووکار</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setTheme('light')}
          className={`cursor-pointer gap-2 ${theme === 'light' ? 'bg-accent' : ''}`}
        >
          <Sun className="h-4 w-4" />
          ڕووناک
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('dark')}
          className={`cursor-pointer gap-2 ${theme === 'dark' ? 'bg-accent' : ''}`}
        >
          <Moon className="h-4 w-4" />
          تاریک
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('system')}
          className={`cursor-pointer gap-2 ${theme === 'system' ? 'bg-accent' : ''}`}
        >
          <Monitor className="h-4 w-4" />
          سیستەم
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;
