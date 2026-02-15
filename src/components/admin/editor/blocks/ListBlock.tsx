import { ContentBlock } from '../types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, List, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListBlockProps {
  block: ContentBlock;
  onChange: (content: string, meta?: ContentBlock['meta']) => void;
}

export const ListBlock = ({ block, onChange }: ListBlockProps) => {
  const items = block.meta?.items || [''];
  const listType = block.meta?.listType || 'bullet';

  const updateItem = (index: number, value: string) => {
    const newItems = items.map((item, i) => (i === index ? value : item));
    onChange(block.content, { ...block.meta, items: newItems });
  };

  const addItem = (afterIndex?: number) => {
    const insertIndex = afterIndex !== undefined ? afterIndex + 1 : items.length;
    const newItems = [...items.slice(0, insertIndex), '', ...items.slice(insertIndex)];
    onChange(block.content, { ...block.meta, items: newItems });
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    const newItems = items.filter((_, i) => i !== index);
    onChange(block.content, { ...block.meta, items: newItems });
  };

  const toggleType = () => {
    const newType = listType === 'bullet' ? 'numbered' : 'bullet';
    onChange(block.content, { ...block.meta, listType: newType });
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      addItem(index);
    }
    if (e.key === 'Backspace' && items[index] === '' && items.length > 1) {
      e.preventDefault();
      e.stopPropagation();
      removeItem(index);
    }
  };

  // Prevent Enter from submitting parent form
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 mb-3">
        <Button
          type="button"
          variant={listType === 'bullet' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(block.content, { ...block.meta, listType: 'bullet' })}
          className="gap-1"
        >
          <List className="h-4 w-4" />
          خاڵ
        </Button>
        <Button
          type="button"
          variant={listType === 'numbered' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(block.content, { ...block.meta, listType: 'numbered' })}
          className="gap-1"
        >
          <ListOrdered className="h-4 w-4" />
          ژمارە
        </Button>
      </div>

      <div className="space-y-1">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 group">
            <span className="w-6 text-muted-foreground text-sm">
              {listType === 'numbered' ? `${index + 1}.` : '•'}
            </span>
            <Input
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onKeyPress={handleKeyPress}
              placeholder="بڕگە..."
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
              onClick={() => removeItem(index)}
              disabled={items.length <= 1}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={() => addItem()} className="gap-1">
        <Plus className="h-3 w-3" />
        بڕگەی نوێ
      </Button>
    </div>
  );
};
