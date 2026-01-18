import { ContentBlock } from '../types';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface CalloutBlockProps {
  block: ContentBlock;
  onChange: (content: string, meta?: ContentBlock['meta']) => void;
}

const calloutTypes = [
  { type: 'info', icon: Info, label: 'زانیاری', color: 'bg-blue-500/10 border-blue-500/30 text-blue-600' },
  { type: 'warning', icon: AlertTriangle, label: 'ئاگاداری', color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600' },
  { type: 'success', icon: CheckCircle, label: 'سەرکەوتوو', color: 'bg-green-500/10 border-green-500/30 text-green-600' },
  { type: 'error', icon: XCircle, label: 'هەڵە', color: 'bg-red-500/10 border-red-500/30 text-red-600' },
];

export const CalloutBlock = ({ block, onChange }: CalloutBlockProps) => {
  const calloutType = block.meta?.calloutType || 'info';
  const currentType = calloutTypes.find(t => t.type === calloutType) || calloutTypes[0];
  const Icon = currentType.icon;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {calloutTypes.map((type) => (
          <Button
            key={type.type}
            variant={calloutType === type.type ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(block.content, { ...block.meta, calloutType: type.type as any })}
            className="gap-1"
          >
            <type.icon className="h-3 w-3" />
            {type.label}
          </Button>
        ))}
      </div>

      <div className={cn('flex gap-3 p-4 rounded-lg border', currentType.color)}>
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <Textarea
          value={block.content}
          onChange={(e) => onChange(e.target.value, block.meta)}
          placeholder="ناوەڕۆکی تێبینی..."
          className="flex-1 bg-transparent border-0 p-0 resize-none focus-visible:ring-0 min-h-[60px]"
        />
      </div>
    </div>
  );
};
