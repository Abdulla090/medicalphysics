import { useState, useMemo } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import LessonCard from '@/components/LessonCard';
import { lessons, categories, type Category, type Difficulty } from '@/data/lessons';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>([]);

  const difficulties: { id: Difficulty; name: string }[] = [
    { id: 'beginner', name: 'سەرەتایی' },
    { id: 'intermediate', name: 'ناوەندی' },
    { id: 'advanced', name: 'پێشکەوتوو' },
  ];

  const toggleCategory = (categoryId: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleDifficulty = (difficultyId: Difficulty) => {
    setSelectedDifficulties((prev) =>
      prev.includes(difficultyId)
        ? prev.filter((d) => d !== difficultyId)
        : [...prev, difficultyId]
    );
  };

  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      const matchesSearch =
        searchQuery === '' ||
        lesson.title.includes(searchQuery) ||
        lesson.description.includes(searchQuery) ||
        lesson.tags.some((tag) => tag.includes(searchQuery));

      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(lesson.category);

      const matchesDifficulty =
        selectedDifficulties.length === 0 || selectedDifficulties.includes(lesson.difficulty);

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [searchQuery, selectedCategories, selectedDifficulties]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">گەڕان لە وانەکان</h1>
            <p className="text-lg text-muted-foreground">بە ناو، تاگ، یان ناوەڕۆک بگەڕێ</p>
          </div>

          {/* Search Input */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="گەڕان..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-12 h-14 text-lg rounded-2xl"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="max-w-4xl mx-auto mb-12">
            <p className="text-sm text-muted-foreground mb-3">فلتەرکردن:</p>
            
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategories.includes(category.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleCategory(category.id)}
                  className="rounded-full"
                >
                  {category.name}
                </Button>
              ))}
            </div>

            {/* Difficulty Filters */}
            <div className="flex flex-wrap gap-2">
              {difficulties.map((difficulty) => (
                <Button
                  key={difficulty.id}
                  variant={selectedDifficulties.includes(difficulty.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleDifficulty(difficulty.id)}
                  className="rounded-full"
                >
                  {difficulty.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="text-muted-foreground mb-6">
            {filteredLessons.length} وانە دۆزرایەوە
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>

          {filteredLessons.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              هیچ وانەیەک نەدۆزرایەوە
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Search;
