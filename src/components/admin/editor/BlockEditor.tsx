import { useState, useCallback, useEffect } from 'react';
import { 
  GripVertical, 
  Trash2, 
  Plus,
  ChevronUp,
  ChevronDown,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  ContentBlock, 
  BlockType, 
  BLOCK_LABELS, 
  createEmptyBlock, 
  blocksToMarkdown, 
  markdownToBlocks,
  generateId 
} from './types';
import { BlockToolbar } from './BlockToolbar';
import { TextBlock } from './blocks/TextBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { VideoBlock } from './blocks/VideoBlock';
import { TableBlock } from './blocks/TableBlock';
import { ListBlock } from './blocks/ListBlock';
import { CalloutBlock } from './blocks/CalloutBlock';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BlockEditorProps {
  value: string;
  onChange: (markdown: string) => void;
}

export const BlockEditor = ({ value, onChange }: BlockEditorProps) => {
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => markdownToBlocks(value));
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Sync blocks to markdown when blocks change
  useEffect(() => {
    const markdown = blocksToMarkdown(blocks);
    if (markdown !== value) {
      onChange(markdown);
    }
  }, [blocks]);

  // Parse initial value only once
  useEffect(() => {
    if (value && blocks.length === 1 && blocks[0].content === '' && blocks[0].type === 'paragraph') {
      const parsed = markdownToBlocks(value);
      if (parsed.length > 1 || parsed[0].content !== '') {
        setBlocks(parsed);
      }
    }
  }, []);

  const updateBlock = useCallback((id: string, content: string, meta?: ContentBlock['meta']) => {
    setBlocks(prev => prev.map(block => 
      block.id === id ? { ...block, content, meta: meta !== undefined ? meta : block.meta } : block
    ));
  }, []);

  const addBlock = useCallback((type: BlockType, afterId?: string) => {
    const newBlock = createEmptyBlock(type);
    setBlocks(prev => {
      if (!afterId) return [...prev, newBlock];
      const index = prev.findIndex(b => b.id === afterId);
      return [...prev.slice(0, index + 1), newBlock, ...prev.slice(index + 1)];
    });
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const filtered = prev.filter(block => block.id !== id);
      return filtered.length > 0 ? filtered : [createEmptyBlock('paragraph')];
    });
  }, []);

  const duplicateBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === id);
      if (index === -1) return prev;
      const block = prev[index];
      const newBlock = { ...block, id: generateId() };
      return [...prev.slice(0, index + 1), newBlock, ...prev.slice(index + 1)];
    });
  }, []);

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;
      
      const newBlocks = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
      return newBlocks;
    });
  }, []);

  const changeBlockType = useCallback((id: string, newType: BlockType) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== id) return block;
      const newBlock = createEmptyBlock(newType);
      return { ...newBlock, id: block.id, content: block.content };
    }));
  }, []);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDropIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dropIndex !== null && draggedIndex !== dropIndex) {
      setBlocks(prev => {
        const newBlocks = [...prev];
        const [movedBlock] = newBlocks.splice(draggedIndex, 1);
        newBlocks.splice(dropIndex, 0, movedBlock);
        return newBlocks;
      });
    }
    setDraggedIndex(null);
    setDropIndex(null);
  };

  const renderBlock = (block: ContentBlock) => {
    switch (block.type) {
      case 'heading1':
      case 'heading2':
      case 'heading3':
      case 'paragraph':
      case 'quote':
        return (
          <TextBlock
            block={block}
            onChange={(content) => updateBlock(block.id, content)}
          />
        );
      case 'code':
        return (
          <CodeBlock
            block={block}
            onChange={(content, meta) => updateBlock(block.id, content, meta)}
          />
        );
      case 'image':
        return (
          <ImageBlock
            block={block}
            onChange={(content, meta) => updateBlock(block.id, content, meta)}
          />
        );
      case 'video':
        return (
          <VideoBlock
            block={block}
            onChange={(content, meta) => updateBlock(block.id, content, meta)}
          />
        );
      case 'table':
        return (
          <TableBlock
            block={block}
            onChange={(content, meta) => updateBlock(block.id, content, meta)}
          />
        );
      case 'list':
        return (
          <ListBlock
            block={block}
            onChange={(content, meta) => updateBlock(block.id, content, meta)}
          />
        );
      case 'callout':
        return (
          <CalloutBlock
            block={block}
            onChange={(content, meta) => updateBlock(block.id, content, meta)}
          />
        );
      case 'divider':
        return <hr className="border-t-2 border-border my-2" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <BlockToolbar onAddBlock={(type) => addBlock(type)} />
        <span className="text-xs text-muted-foreground">
          {blocks.length} بلۆک
        </span>
      </div>

      <div className="space-y-2">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              'group relative',
              draggedIndex === index && 'opacity-50',
              dropIndex === index && 'ring-2 ring-primary ring-offset-2 rounded-lg'
            )}
          >
            <Card className="p-4 transition-shadow hover:shadow-md">
              <div className="flex gap-2">
                {/* Drag handle & actions */}
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => moveBlock(block.id, 'up')} disabled={index === 0}>
                        <ChevronUp className="h-4 w-4 ml-2" />
                        بردن بۆ سەرەوە
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => moveBlock(block.id, 'down')} disabled={index === blocks.length - 1}>
                        <ChevronDown className="h-4 w-4 ml-2" />
                        بردن بۆ خوارەوە
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => duplicateBlock(block.id)}>
                        <Copy className="h-4 w-4 ml-2" />
                        کۆپی
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => deleteBlock(block.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 ml-2" />
                        سڕینەوە
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Block content */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                    {BLOCK_LABELS[block.type]}
                  </div>
                  {renderBlock(block)}
                </div>
              </div>
            </Card>

            {/* Quick add button between blocks */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-6 w-6 rounded-full bg-background shadow-md"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(BLOCK_LABELS).map(([type, label]) => (
                    <DropdownMenuItem 
                      key={type} 
                      onClick={() => addBlock(type as BlockType, block.id)}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
