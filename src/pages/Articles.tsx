import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Clock, User, Tag, Search, Loader2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';

const CATEGORIES = ['All', 'CT', 'MRI', 'X-Ray', 'Ultrasound', 'Nuclear Medicine', 'Radiation Therapy', 'General'];

const categoryColors: Record<string, string> = {
    'CT': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'MRI': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'X-Ray': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    'Ultrasound': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    'Nuclear Medicine': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    'Radiation Therapy': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'General': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const Articles = () => {
    const articles = useQuery(api.api.getArticles);
    const isLoading = articles === undefined;
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = articles?.filter(a => {
        const matchCategory = selectedCategory === 'All' || a.category === selectedCategory;
        const matchSearch = !searchQuery ||
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchCategory && matchSearch;
    }) || [];

    // Sort by publish date descending
    const sorted = [...filtered].sort((a, b) => {
        const dateA = a.publishDate ? new Date(a.publishDate).getTime() : 0;
        const dateB = b.publishDate ? new Date(b.publishDate).getTime() : 0;
        return dateB - dateA;
    });

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            {/* Hero */}
            <section className="relative overflow-hidden py-16 md:py-24">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
                <div className="container relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                        <FileText className="h-4 w-4" />
                        زانیاری ئەکادیمی
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        زانیاری ڕادیۆلۆجی
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                        بابەتە زانستییەکان لەبارەی فیزیای پزیشکی، CT، MRI، و تەکنەلۆژیای تیشکبینی
                    </p>

                    {/* Search */}
                    <div className="max-w-md mx-auto relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="گەڕان لە بابەتەکان..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-10 rounded-full"
                        />
                    </div>
                </div>
            </section>

            {/* Category Filter */}
            <section className="container -mt-4 mb-8">
                <div className="flex flex-wrap gap-2 justify-center">
                    {CATEGORIES.map((cat) => (
                        <Button
                            key={cat}
                            variant={selectedCategory === cat ? 'default' : 'outline'}
                            size="sm"
                            className="rounded-full"
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {cat === 'All' ? 'هەموو' : cat}
                        </Button>
                    ))}
                </div>
            </section>

            {/* Articles Grid */}
            <section className="container pb-16">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : sorted.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="text-xl">هیچ بابەتێک نەدۆزرایەوە</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sorted.map((article) => (
                            <Link key={article._id} to={`/articles/${article.slug}`}>
                                <Card className="group h-full overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50">
                                    {/* Cover Image */}
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
                                        {/* Category Badge */}
                                        <Badge className={`mb-3 ${categoryColors[article.category] || categoryColors.General}`}>
                                            {article.category}
                                        </Badge>

                                        {/* Title */}
                                        <h2 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                            {article.title}
                                        </h2>

                                        {/* Description */}
                                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                                            {article.description}
                                        </p>

                                        {/* Meta */}
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

                                        {/* Tags */}
                                        {article.tags && article.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-3">
                                                {article.tags.slice(0, 3).map((tag) => (
                                                    <span key={tag} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                        <Tag className="h-2.5 w-2.5" />
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Articles;
