import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface SearchSuggestion {
  id: string;
  title: string;
  slug: string;
  category: string;
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (lesson: SearchSuggestion) => void;
}

const SearchAutocomplete = ({ value, onChange, onSelect }: SearchAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['search-suggestions', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, slug, category')
        .eq('is_published', true)
        .or(`title.ilike.%${debouncedQuery}%,description.ilike.%${debouncedQuery}%,content.ilike.%${debouncedQuery}%`)
        .limit(8);

      if (error) throw error;
      return data as SearchSuggestion[];
    },
    enabled: debouncedQuery.length >= 2,
  });

  const handleSelect = (suggestion: SearchSuggestion) => {
    onChange(suggestion.title);
    setOpen(false);
    onSelect?.(suggestion);
  };

  const showSuggestions = open && debouncedQuery.length >= 2 && (suggestions?.length || isLoading);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="گەڕان لە ناوەڕۆک، ناونیشان..."
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pr-12 h-14 text-lg rounded-2xl"
        />
        {value && (
          <button
            onClick={() => {
              onChange('');
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-2 bg-card border rounded-xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">گەڕان...</div>
          ) : suggestions && suggestions.length > 0 ? (
            <ul>
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <Link
                    to={`/lesson/${suggestion.slug}`}
                    onClick={() => handleSelect(suggestion)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
                  >
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{suggestion.title}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-muted-foreground">هیچ ئەنجامێک نەدۆزرایەوە</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
