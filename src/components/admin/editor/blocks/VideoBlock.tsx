import { ContentBlock } from '../types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video } from 'lucide-react';

interface VideoBlockProps {
  block: ContentBlock;
  onChange: (content: string, meta?: ContentBlock['meta']) => void;
}

const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^[a-zA-Z0-9_-]{11}$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1] || url;
  }
  return null;
};

export const VideoBlock = ({ block, onChange }: VideoBlockProps) => {
  const videoId = extractYouTubeId(block.meta?.url || block.content || '');

  const handleChange = (value: string) => {
    const id = extractYouTubeId(value);
    onChange(id || value, { ...block.meta, url: id || value });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label className="text-xs text-muted-foreground">بەستەری یوتیوب یان ئایدی ڤیدیۆ</Label>
        <Input
          value={block.meta?.url || block.content || ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="https://youtube.com/watch?v=... یان dQw4w9WgXcQ"
          dir="ltr"
        />
      </div>

      {videoId ? (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/30">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 bg-muted/30 rounded-lg border-2 border-dashed">
          <div className="text-center text-muted-foreground">
            <Video className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">بەستەری ڤیدیۆ زیاد بکە</p>
          </div>
        </div>
      )}
    </div>
  );
};
