import { ContentBlock } from '../types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageIcon } from 'lucide-react';

interface ImageBlockProps {
  block: ContentBlock;
  onChange: (content: string, meta?: ContentBlock['meta']) => void;
}

export const ImageBlock = ({ block, onChange }: ImageBlockProps) => {
  const { url, alt, caption } = block.meta || {};

  const updateMeta = (updates: Partial<ContentBlock['meta']>) => {
    onChange(block.content, { ...block.meta, ...updates });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label className="text-xs text-muted-foreground">بەستەری وێنە</Label>
        <Input
          value={url || ''}
          onChange={(e) => updateMeta({ url: e.target.value })}
          placeholder="https://example.com/image.jpg"
          dir="ltr"
        />
      </div>

      {url && (
        <div className="relative rounded-lg overflow-hidden bg-muted/30">
          <img 
            src={url} 
            alt={alt || ''} 
            className="max-h-64 mx-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {!url && (
        <div className="flex items-center justify-center h-32 bg-muted/30 rounded-lg border-2 border-dashed">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">بەستەری وێنە زیاد بکە</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">تێکستی جێگرەوە (Alt)</Label>
          <Input
            value={alt || ''}
            onChange={(e) => updateMeta({ alt: e.target.value })}
            placeholder="وەسفی وێنە"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">سەرنووس</Label>
          <Input
            value={caption || ''}
            onChange={(e) => updateMeta({ caption: e.target.value })}
            placeholder="سەرنووسی وێنە"
          />
        </div>
      </div>
    </div>
  );
};
