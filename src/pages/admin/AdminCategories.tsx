import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { fetchCategories, updateCategory, fetchCategoryLessonCounts, Category, CategoryType } from '@/lib/api';

const AdminCategories = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<CategoryType | null>(null);
  const [editForm, setEditForm] = useState<Partial<Category>>({});

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: fetchCategories,
  });

  const { data: lessonCounts } = useQuery({
    queryKey: ['category-lesson-counts'],
    queryFn: fetchCategoryLessonCounts,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: CategoryType; updates: Partial<Category> }) =>
      updateCategory(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast({ title: 'سەرکەوتوو', description: 'بەش نوێکرایەوە' });
      setEditingId(null);
      setEditForm({});
    },
    onError: () => {
      toast({ title: 'هەڵە', description: 'نوێکردنەوە سەرکەوتوو نەبوو', variant: 'destructive' });
    },
  });

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditForm({
      name: category.name,
      english_name: category.english_name,
      description: category.description,
      icon: category.icon,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEditing = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, updates: editForm });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">بەشەکان</h1>
          <p className="text-muted-foreground mt-1">بەڕێوەبردنی بەشەکانی وێنەگرتن</p>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ئایکۆن</TableHead>
                <TableHead>ناوی کوردی</TableHead>
                <TableHead>ناوی ئینگلیزی</TableHead>
                <TableHead>وەسف</TableHead>
                <TableHead>ژمارەی وانەکان</TableHead>
                <TableHead>کردارەکان</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    بارکردن...
                  </TableCell>
                </TableRow>
              ) : (
                categories?.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      {editingId === category.id ? (
                        <Input
                          value={editForm.icon || ''}
                          onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                          className="w-16"
                        />
                      ) : (
                        <span className="text-2xl">{category.icon}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === category.id ? (
                        <Input
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      ) : (
                        <span className="font-medium">{category.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === category.id ? (
                        <Input
                          value={editForm.english_name || ''}
                          onChange={(e) => setEditForm({ ...editForm, english_name: e.target.value })}
                          dir="ltr"
                        />
                      ) : (
                        category.english_name
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      {editingId === category.id ? (
                        <Textarea
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          rows={2}
                        />
                      ) : (
                        <span className="line-clamp-2">{category.description}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {lessonCounts?.[category.id] || 0} وانە
                      </span>
                    </TableCell>
                    <TableCell>
                      {editingId === category.id ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={saveEditing}
                            disabled={updateMutation.isPending}
                          >
                            <Save className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={cancelEditing}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => startEditing(category)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;
