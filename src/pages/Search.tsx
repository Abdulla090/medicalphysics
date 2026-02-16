import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import PageLayout from '@/components/PageLayout';
import LessonCard from '@/components/LessonCard';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import { CategoryType, DifficultyLevel } from '@/lib/api';
import { Clock, User, Tag, FileText } from 'lucide-react';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<DifficultyLevel[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'lessons' | 'articles'>('all');

  const categories = useQuery(api.api.getCategories);
  const lessons = useQuery(api.api.getAllLessons);
  const articles = useQuery(api.api.getArticles);

  const isLoading = lessons === undefined || articles === undefined;

  const difficulties: { id: DifficultyLevel; name: string }[] = [
    { id: 'beginner', name: 'سەرەتایی' },
    { id: 'intermediate', name: 'ناوەندی' },
    { id: 'advanced', name: 'پێشکەوتوو' },
  ];

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleDifficulty = (difficultyId: DifficultyLevel) => {
    setSelectedDifficulties((prev) =>
      prev.includes(difficultyId)
        ? prev.filter((d) => d !== difficultyId)
        : [...prev, difficultyId]
    );
  };

  const filteredLessons = useMemo(() => {
    if (!lessons) return [];
    return lessons.filter((lesson: any) => {
      const matchesSearch =
        searchQuery === '' ||
        lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(lesson.category);
      const matchesDifficulty =
        selectedDifficulties.length === 0 || selectedDifficulties.includes(lesson.difficulty as DifficultyLevel);
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [lessons, searchQuery, selectedCategories, selectedDifficulties]);

  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    return articles.filter((article: any) => {
      const matchesSearch =
        searchQuery === '' ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [articles, searchQuery]);

  const totalResults = (activeTab === 'all' || activeTab === 'lessons' ? filteredLessons.length : 0) +
    (activeTab === 'all' || activeTab === 'articles' ? filteredArticles.length : 0);

  const categoryColors: Record<string, string> = {
    'CT': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'MRI': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'X-Ray': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    'Ultrasound': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    'Nuclear Medicine': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    'Radiation Therapy': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'General': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  };

  return (
    <PageLayout>

      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">گەڕان</h1>
            <p className="text-lg text-muted-foreground">بە ناو، تاگ، یان ناوەڕۆک بگەڕێ لە وانەکان و زانیاریەکان</p>
          </div>

          {/* Search Input */}
          <div className="max-w-2xl mx-auto mb-8">
            <SearchAutocomplete
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          {/* Tab Switcher */}
          <div className="flex justify-center gap-2 mb-8">
            <Button
              variant={activeTab === 'all' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => setActiveTab('all')}
            >
              هەموو ({filteredLessons.length + filteredArticles.length})
            </Button>
            <Button
              variant={activeTab === 'lessons' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => setActiveTab('lessons')}
            >
              وانەکان ({filteredLessons.length})
            </Button>
            <Button
              variant={activeTab === 'articles' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => setActiveTab('articles')}
            >
              زانیاری ({filteredArticles.length})
            </Button>
          </div>

          {/* Filters (only for lessons tab or all) */}
          {(activeTab === 'all' || activeTab === 'lessons') && (
            <div className="max-w-4xl mx-auto mb-12">
              <p className="text-sm text-muted-foreground mb-3">فلتەرکردن:</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {categories?.map((category) => (
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
          )}

          {/* Results */}
          <div className="text-muted-foreground mb-6">
            {totalResults} ئەنجام دۆزرایەوە
          </div>

          {isLoading ? (
            <div className="text-center py-8">بارکردن...</div>
          ) : (
            <div className="space-y-10">
              {/* Lessons Results */}
              {(activeTab === 'all' || activeTab === 'lessons') && filteredLessons.length > 0 && (
                <div>
                  {activeTab === 'all' && (
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      وانەکان
                      <Badge variant="secondary">{filteredLessons.length}</Badge>
                    </h2>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLessons.map((lesson: any) => (
                      <LessonCard key={lesson._id} lesson={lesson} />
                    ))}
                  </div>
                </div>
              )}

              {/* Articles Results */}
              {(activeTab === 'all' || activeTab === 'articles') && filteredArticles.length > 0 && (
                <div>
                  {activeTab === 'all' && (
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      زانیاری
                      <Badge variant="secondary">{filteredArticles.length}</Badge>
                    </h2>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredArticles.map((article: any) => (
                      <Link key={article._id} to={`/articles/${article.slug}`}>
                        <Card className="group h-full overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50">
                          {article.coverImageUrl ? (
                            <div className="aspect-[16/9] overflow-hidden">
                              <img
                                src={article.coverImageUrl}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>
                          ) : (
                            <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                              <FileText className="h-12 w-12 text-primary/30" />
                            </div>
                          )}
                          <CardContent className="p-5">
                            <Badge className={`mb-3 ${categoryColors[article.category] || categoryColors.General}`}>
                              {article.category}
                            </Badge>
                            <h3 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                              {article.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{article.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {article.author}
                              </div>
                              {article.publishDate && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {article.publishDate}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!isLoading && totalResults === 0 && (
            <p className="text-center text-muted-foreground py-12">
              هیچ ئەنجامێک نەدۆزرایەوە
            </p>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Search;
