import { ContentBlock } from '../types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const extractGoogleDriveId = (url: string): string | null => {
  const patterns = [
    /drive\.google\.com\/file\/d\/([^\/]+)/,
    /drive\.google\.com\/open\?id=([^&]+)/,
    /docs\.google\.com\/file\/d\/([^\/]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const extractVimeoId = (url: string): string | null => {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
};

type VideoSource = 'youtube' | 'drive' | 'vimeo' | 'direct';

const detectVideoSource = (url: string): { source: VideoSource; id: string | null } => {
  if (!url) return { source: 'youtube', id: null };
  
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) return { source: 'youtube', id: youtubeId };
  
  const driveId = extractGoogleDriveId(url);
  if (driveId) return { source: 'drive', id: driveId };
  
  const vimeoId = extractVimeoId(url);
  if (vimeoId) return { source: 'vimeo', id: vimeoId };
  
  // Direct video URL
  if (url.match(/\.(mp4|webm|ogg)$/i)) {
    return { source: 'direct', id: url };
  }
  
  return { source: 'youtube', id: null };
};

export const VideoBlock = ({ block, onChange }: VideoBlockProps) => {
  const videoUrl = block.meta?.url || block.content || '';
  const { source, id } = detectVideoSource(videoUrl);

  const handleChange = (value: string) => {
    onChange(value, { ...block.meta, url: value });
  };

  const renderPreview = () => {
    if (!id && source !== 'direct') {
      return (
        <div className="flex items-center justify-center h-32 bg-muted/30 rounded-lg border-2 border-dashed">
          <div className="text-center text-muted-foreground">
            <Video className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">بەستەری ڤیدیۆ زیاد بکە</p>
          </div>
        </div>
      );
    }

    switch (source) {
      case 'youtube':
        return (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/30">
            <iframe
              src={`https://www.youtube.com/embed/${id}`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        );
      
      case 'drive':
        return (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/30">
            <iframe
              src={`https://drive.google.com/file/d/${id}/preview`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="autoplay"
            />
          </div>
        );
      
      case 'vimeo':
        return (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/30">
            <iframe
              src={`https://player.vimeo.com/video/${id}`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture"
            />
          </div>
        );
      
      case 'direct':
        return (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/30">
            <video
              src={id || ''}
              className="absolute inset-0 w-full h-full"
              controls
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <Tabs defaultValue="url" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="url">بەستەر</TabsTrigger>
          <TabsTrigger value="help">یارمەتی</TabsTrigger>
        </TabsList>
        
        <TabsContent value="url" className="space-y-3">
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">
              بەستەری ڤیدیۆ (YouTube, Google Drive, Vimeo, یان MP4)
            </Label>
            <Input
              value={videoUrl}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=... یان https://drive.google.com/file/d/..."
              dir="ltr"
            />
          </div>
          
          {source !== 'youtube' || id ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="px-2 py-1 rounded bg-muted">
                {source === 'youtube' && '📺 YouTube'}
                {source === 'drive' && '📁 Google Drive'}
                {source === 'vimeo' && '🎬 Vimeo'}
                {source === 'direct' && '🎥 ڤیدیۆی ڕاستەوخۆ'}
              </span>
            </div>
          ) : null}
        </TabsContent>
        
        <TabsContent value="help" className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">چۆن بەستەری ڤیدیۆ بدۆزیتەوە:</p>
          
          <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
            <p><strong>YouTube:</strong></p>
            <code className="text-xs bg-muted px-2 py-1 rounded block" dir="ltr">
              https://youtube.com/watch?v=VIDEO_ID
            </code>
          </div>
          
          <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
            <p><strong>Google Drive:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>ڤیدیۆکە بکەرەوە لە Google Drive</li>
              <li>کلیک لە "Share" یان "هاوبەشکردن"</li>
              <li>ڕێگەپێدان بگۆڕە بۆ "Anyone with the link"</li>
              <li>بەستەرەکە کۆپی بکە</li>
            </ol>
            <code className="text-xs bg-muted px-2 py-1 rounded block mt-2" dir="ltr">
              https://drive.google.com/file/d/FILE_ID/view
            </code>
          </div>
          
          <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
            <p><strong>Vimeo:</strong></p>
            <code className="text-xs bg-muted px-2 py-1 rounded block" dir="ltr">
              https://vimeo.com/VIDEO_ID
            </code>
          </div>
        </TabsContent>
      </Tabs>

      {renderPreview()}
    </div>
  );
};
