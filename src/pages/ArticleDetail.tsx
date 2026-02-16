import { useParams, Link } from 'react-router-dom';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChevronLeft, Clock, User, Tag, ArrowLeft, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import PageLayout from '@/components/PageLayout';
import { MarkdownPreview } from '@/components/admin/editor/MarkdownPreview';

const categoryColors: Record<string, string> = {
    'CT': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'MRI': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'X-Ray': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    'Ultrasound': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    'Nuclear Medicine': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    'Radiation Therapy': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'General': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const ArticleDetail = () => {
    const { slug } = useParams<{ slug: string }>();
    const article = useQuery(api.api.getArticleBySlug, { slug: slug || '' });
    const isLoading = article === undefined;

    // Fetch related articles from same category
    const relatedArticles = useQuery(api.api.getArticlesByCategory,
        article ? { category: article.category } : "skip"
    );
    const filteredRelated = relatedArticles?.filter(a => a._id !== article?._id).slice(0, 3) || [];

    if (isLoading) {
        return (
            <PageLayout showReadingProgress={true}>
                <div className="container py-16 text-center">بارکردن...</div>
            </PageLayout>
        );
    }

    if (!article) {
        return (
            <PageLayout showReadingProgress={true}>
                <div className="container py-16 text-center">
                    <h1 className="text-2xl font-bold">بابەت نەدۆزرایەوە</h1>
                    <Link to="/articles" className="text-primary hover:underline mt-4 inline-block">
                        گەڕانەوە بۆ بابەتەکان
                    </Link>
                </div>
            </PageLayout>
        );
    }

    return (
        <PageLayout showReadingProgress={true}>

            {/* Hero with cover image */}
            {article.coverImageUrl && (
                <div className="relative h-64 md:h-96 w-full overflow-hidden">
                    <img
                        src={article.coverImageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                </div>
            )}

            <section className="py-8">
                <div className="container">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                        <Link to="/" className="hover:text-primary">سەرەتا</Link>
                        <ChevronLeft className="h-4 w-4" />
                        <Link to="/articles" className="hover:text-primary">بابەتەکان</Link>
                        <ChevronLeft className="h-4 w-4" />
                        <span className="text-foreground line-clamp-1">{article.title}</span>
                    </nav>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2">
                            {/* Header */}
                            <div className="mb-8">
                                <Badge className={`mb-4 ${categoryColors[article.category] || categoryColors.General}`}>
                                    {article.category}
                                </Badge>
                                <h1 className="text-3xl md:text-4xl font-bold mb-4">{article.title}</h1>
                                <p className="text-lg text-muted-foreground">{article.description}</p>

                                <div className="flex flex-wrap items-center gap-6 mt-6 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        {article.author}
                                    </div>
                                    {article.publishDate && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            {article.publishDate}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <Card className="mb-8">
                                <CardContent className="p-6 md:p-8">
                                    <MarkdownPreview content={article.content} />
                                </CardContent>
                            </Card>

                            {/* Tags */}
                            {article.tags && article.tags.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="font-semibold mb-3">تاگەکان:</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {article.tags.map((tag: string) => (
                                            <Badge key={tag} variant="secondary" className="gap-1">
                                                <Tag className="h-3 w-3" />
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Back Link */}
                            <Link to="/articles" className="inline-flex items-center gap-2 text-primary hover:underline">
                                <ArrowLeft className="h-4 w-4" />
                                گەڕانەوە بۆ هەموو بابەتەکان
                            </Link>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-24">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    بابەتەکانی تر لە ئەم بەشە
                                </h3>
                                {filteredRelated.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">هیچ بابەتی تر نییە لەم بەشەدا</p>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredRelated.map((related) => (
                                            <Link key={related._id} to={`/articles/${related.slug}`}>
                                                <Card className="hover:shadow-md transition-shadow mb-3">
                                                    <CardContent className="p-4">
                                                        {related.coverImageUrl && (
                                                            <img
                                                                src={related.coverImageUrl}
                                                                alt=""
                                                                className="w-full h-24 object-cover rounded mb-2"
                                                            />
                                                        )}
                                                        <p className="font-medium line-clamp-2">{related.title}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">{related.author}</p>
                                                    </CardContent>
                                                </Card>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </PageLayout>
    );
};

export default ArticleDetail;
