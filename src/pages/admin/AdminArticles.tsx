import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/admin/AdminLayout';

const AdminArticles = () => {
    const articles = useQuery(api.api.getAllArticles);
    const deleteArticle = useMutation(api.admin_actions.deleteArticle);
    const { toast } = useToast();

    const handleDelete = async (id: Id<"articles">) => {
        try {
            await deleteArticle({ id });
            toast({ title: 'سەرکەوتوو', description: 'بابەت سڕایەوە' });
        } catch (error: any) {
            toast({ title: 'هەڵە', description: error.message, variant: 'destructive' });
        }
    };

    const isLoading = articles === undefined;

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">بابەتەکان (Articles)</h1>
                        <p className="text-muted-foreground">بەڕێوەبردنی بابەتە ئەکادیمییەکان</p>
                    </div>
                    <Link to="/admin/articles/new">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            بابەتی نوێ
                        </Button>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            هەموو بابەتەکان ({articles?.length || 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : articles.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>هیچ بابەتێک نییە</p>
                                <Link to="/admin/articles/new">
                                    <Button variant="outline" className="mt-4 gap-2">
                                        <Plus className="h-4 w-4" />
                                        یەکەم بابەت دروستبکە
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ناونیشان</TableHead>
                                        <TableHead>بەش</TableHead>
                                        <TableHead>نووسەر</TableHead>
                                        <TableHead>بەروار</TableHead>
                                        <TableHead>بار</TableHead>
                                        <TableHead>کردار</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {articles.map((article) => (
                                        <TableRow key={article._id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {article.coverImageUrl && (
                                                        <img
                                                            src={article.coverImageUrl}
                                                            alt=""
                                                            className="h-10 w-14 object-cover rounded"
                                                        />
                                                    )}
                                                    <div>
                                                        <p className="font-medium line-clamp-1">{article.title}</p>
                                                        <p className="text-xs text-muted-foreground line-clamp-1">{article.description}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{article.category}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{article.author}</TableCell>
                                            <TableCell className="text-sm">{article.publishDate || '—'}</TableCell>
                                            <TableCell>
                                                {article.isPublished ? (
                                                    <Badge className="bg-green-100 text-green-700 gap-1">
                                                        <Eye className="h-3 w-3" /> بڵاوکراوە
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="gap-1">
                                                        <EyeOff className="h-3 w-3" /> ڕەشنووس
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Link to={`/admin/articles/${article._id}/edit`}>
                                                        <Button variant="ghost" size="icon">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>دڵنیایت لە سڕینەوە؟</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    ئەم بابەتە بەتەواوی دەسڕدرێتەوە و ناتوانرێت بگەڕێنرێتەوە.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDelete(article._id)}
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                >
                                                                    سڕینەوە
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default AdminArticles;
