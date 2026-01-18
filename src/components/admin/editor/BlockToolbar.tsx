import { 
  Heading1, 
  Heading2, 
  Heading3, 
  Type, 
  Quote, 
  Code, 
  Image, 
  Video, 
  Table, 
  Minus, 
  List, 
  ListOrdered,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BlockType, BLOCK_LABELS } from './types';

interface BlockToolbarProps {
  onAddBlock: (type: BlockType) => void;
}

const blockGroups = [
  {
    label: 'دەق',
    items: [
      { type: 'heading1' as BlockType, icon: Heading1, label: BLOCK_LABELS.heading1 },
      { type: 'heading2' as BlockType, icon: Heading2, label: BLOCK_LABELS.heading2 },
      { type: 'heading3' as BlockType, icon: Heading3, label: BLOCK_LABELS.heading3 },
      { type: 'paragraph' as BlockType, icon: Type, label: BLOCK_LABELS.paragraph },
      { type: 'quote' as BlockType, icon: Quote, label: BLOCK_LABELS.quote },
      { type: 'code' as BlockType, icon: Code, label: BLOCK_LABELS.code },
    ]
  },
  {
    label: 'میدیا',
    items: [
      { type: 'image' as BlockType, icon: Image, label: BLOCK_LABELS.image },
      { type: 'video' as BlockType, icon: Video, label: BLOCK_LABELS.video },
    ]
  },
  {
    label: 'تر',
    items: [
      { type: 'table' as BlockType, icon: Table, label: BLOCK_LABELS.table },
      { type: 'list' as BlockType, icon: List, label: BLOCK_LABELS.list },
      { type: 'callout' as BlockType, icon: AlertCircle, label: BLOCK_LABELS.callout },
      { type: 'divider' as BlockType, icon: Minus, label: BLOCK_LABELS.divider },
    ]
  }
];

export const BlockToolbar = ({ onAddBlock }: BlockToolbarProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          زیادکردنی بلۆک
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {blockGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {groupIndex > 0 && <DropdownMenuSeparator />}
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
              {group.label}
            </div>
            {group.items.map((item) => (
              <DropdownMenuItem
                key={item.type}
                onClick={() => onAddBlock(item.type)}
                className="gap-2"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
