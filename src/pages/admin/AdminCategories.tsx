import { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Pencil, Save, X, Plus } from 'lucide-react';
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

interface Category {
  id: string;
  name: string;
  englishName: string;
  description: string;
  icon?: string;
  _id?: string;
}

const AdminCategories = () => {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Category>>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<Partial<Category>>({
    id: '', name: '', englishName: '', description: '', icon: ''
  });

  const categories = useQuery(api.api.getCategories);
  const isLoading = categories === undefined;
  const updateMutation = useMutation(api.admin_actions.updateCategory);
  const createMutation = useMutation(api.admin_actions.createCategory);

  // Use real lesson counts
  const lessonCountsQuery = useQuery(api.admin.getCategoryLessonCounts);
  const lessonCounts = lessonCountsQuery || {};

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditForm({
      name: category.name,
      englishName: category.englishName,
      description: category.description,
      icon: category.icon,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleCreate = async () => {
    try {
      await createMutation({
        id: newCategory.id!,
        name: newCategory.name!,
        englishName: newCategory.englishName!,
        description: newCategory.description!,
        icon: newCategory.icon!
      });
      toast({ title: 'سەرکەوتوو', description: 'بەشی نوێ زیادکرا' });
      setIsCreateOpen(false);
      setNewCategory({ id: '', name: '', englishName: '', description: '', icon: '' });
    } catch (error) {
      toast({ title: 'هەڵە', description: 'زیادکردن سەرکەوتوو نەبوو. دڵنیابە ID دووبارە نییە.', variant: 'destructive' });
    }
  };

  const saveEditing = async () => {
    if (editingId && editForm) {
      try {
        await updateMutation({
          id: editingId,
          updates: {
            name: editForm.name,
            englishName: editForm.englishName,
            description: editForm.description,
            icon: editForm.icon
          }
        });
        toast({ title: 'سەرکەوتوو', description: 'بەش نوێکرایەوە' });
        setEditingId(null);
        setEditForm({});
      } catch (error) {
        toast({ title: 'هەڵە', description: 'نوێکردنەوە سەرکەوتوو نەبوو', variant: 'destructive' });
      }
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center px-1">
          <div>
            <h1 className="text-3xl font-bold">بەشەکان</h1>
            <p className="text-muted-foreground mt-1">بەڕێوەبردنی بەشەکانی وێنەگرتن</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> زیادکردنی بەش
          </Button>
        </div>

        {/* Create Dialog */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background p-6 rounded-lg w-full max-w-md space-y-4 shadow-lg border">
              <h2 className="text-xl font-bold">زیادکردنی بەشی نوێ</h2>
              <div className="space-y-2">
                <Input placeholder="ID (e.g., xray)" value={newCategory.id} onChange={e => setNewCategory({ ...newCategory, id: e.target.value })} />
                <Input placeholder="Name (Kurdish)" value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} />
                <Input placeholder="English Name" value={newCategory.englishName} onChange={e => setNewCategory({ ...newCategory, englishName: e.target.value })} />
                <Input placeholder="Icon Emoji" value={newCategory.icon} onChange={e => setNewCategory({ ...newCategory, icon: e.target.value })} />
                <Textarea placeholder="Description" value={newCategory.description} onChange={e => setNewCategory({ ...newCategory, description: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>betala</Button>
                <Button onClick={handleCreate}>Save</Button>
              </div>
            </div>
          </div>
        )}

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
                categories?.map((category: any) => (
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
                          value={editForm.englishName || ''}
                          onChange={(e) => setEditForm({ ...editForm, englishName: e.target.value })}
                          dir="ltr"
                        />
                      ) : (
                        category.englishName
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
