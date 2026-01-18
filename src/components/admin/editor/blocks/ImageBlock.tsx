import { useState, useRef } from 'react';
import { ContentBlock } from '../types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ImageIcon, Upload, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImageBlockProps {
  block: ContentBlock;
  onChange: (content: string, meta?: ContentBlock['meta']) => void;
}

export const ImageBlock = ({ block, onChange }: ImageBlockProps) => {
  const { url, alt, caption } = block.meta || {};
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const updateMeta = (updates: Partial<ContentBlock['meta']>) => {
    onChange(block.content, { ...block.meta, ...updates });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'هەڵە',
        description: 'تەنها فایلی وێنە ڕێگەپێدراوە',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'هەڵە',
        description: 'قەبارەی وێنە زۆرترە لە ٥ میگابایت',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('lesson-content')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('lesson-content')
        .getPublicUrl(filePath);

      updateMeta({ url: publicUrl, alt: file.name.split('.')[0] });
      
      toast({
        title: 'سەرکەوتوو',
        description: 'وێنە بارکرا',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'هەڵە',
        description: error.message || 'بارکردنی وێنە سەرکەوتوو نەبوو',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = () => {
    updateMeta({ url: '', alt: '', caption: '' });
  };

  return (
    <div className="space-y-3">
      {/* Upload area */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="gap-2"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isUploading ? 'بارکردن...' : 'هەڵبژاردنی وێنە'}
        </Button>
        <span className="text-xs text-muted-foreground self-center">
          یان بەستەر بنووسە
        </span>
      </div>

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
        <div className="relative rounded-lg overflow-hidden bg-muted/30 group">
          <img 
            src={url} 
            alt={alt || ''} 
            className="max-h-64 mx-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={removeImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!url && (
        <div 
          className="flex items-center justify-center h-32 bg-muted/30 rounded-lg border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">کلیک بکە بۆ بارکردنی وێنە</p>
            <p className="text-xs mt-1">یان بەستەر بنووسە</p>
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
