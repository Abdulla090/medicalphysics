import { useState, useRef } from 'react';
import { ContentBlock } from '../types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, Upload, Link as LinkIcon, HardDrive, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

type VideoSource = 'youtube' | 'drive' | 'vimeo' | 'direct' | 'upload';

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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const videoUrl = block.meta?.url || block.content || '';
  const uploadSource = block.meta?.uploadSource || 'embed'; // embed, upload, drive
  const { source, id } = detectVideoSource(videoUrl);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('تەنها فایلی ڤیدیۆ ڕێگەپێدراوە');
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('قەبارەی فایل زۆر گەورەیە (زۆرترین: ١٠٠MB)');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('lesson-content')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('lesson-content')
        .getPublicUrl(filePath);

      onChange(publicUrl, { 
        ...block.meta, 
        url: publicUrl, 
        uploadSource: 'upload',
        fileName: file.name 
      });
      toast.success('ڤیدیۆ بارکرا!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('هەڵە لە بارکردنی ڤیدیۆ');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlChange = (value: string, sourceType: 'embed' | 'drive') => {
    onChange(value, { ...block.meta, url: value, uploadSource: sourceType });
  };

  const removeVideo = () => {
    onChange('', { url: '', uploadSource: 'embed' });
  };

  const renderPreview = () => {
    if (!id && source !== 'direct' && uploadSource !== 'upload') {
      return (
        <div className="flex items-center justify-center h-32 bg-muted/30 rounded-lg border-2 border-dashed">
          <div className="text-center text-muted-foreground">
            <Video className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">بەستەری ڤیدیۆ زیاد بکە</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 left-2 h-7 w-7 z-10"
          onClick={removeVideo}
        >
          <X className="h-4 w-4" />
        </Button>
        
        {source === 'youtube' && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/30">
            <iframe
              src={`https://www.youtube.com/embed/${id}`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        )}
        
        {source === 'drive' && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/30">
            <iframe
              src={`https://drive.google.com/file/d/${id}/preview`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="autoplay"
            />
          </div>
        )}
        
        {source === 'vimeo' && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/30">
            <iframe
              src={`https://player.vimeo.com/video/${id}`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture"
            />
          </div>
        )}
        
        {(source === 'direct' || uploadSource === 'upload') && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/30">
            <video
              src={videoUrl}
              className="absolute inset-0 w-full h-full"
              controls
            />
          </div>
        )}

        <div className="absolute bottom-2 right-2 px-2 py-1 bg-background/80 rounded text-xs">
          {source === 'youtube' && '📺 YouTube'}
          {source === 'drive' && '📁 Google Drive'}
          {source === 'vimeo' && '🎬 Vimeo'}
          {(source === 'direct' || uploadSource === 'upload') && '🎥 ڤیدیۆی بارکراو'}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="embed" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="embed" className="text-xs py-2 gap-1">
            <LinkIcon className="h-3 w-3" />
            بەستەر
          </TabsTrigger>
          <TabsTrigger value="upload" className="text-xs py-2 gap-1">
            <Upload className="h-3 w-3" />
            ئامێر
          </TabsTrigger>
          <TabsTrigger value="drive" className="text-xs py-2 gap-1">
            <HardDrive className="h-3 w-3" />
            گووگڵ درایڤ
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="embed" className="space-y-3 mt-3">
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">
              بەستەری ڤیدیۆ (YouTube, Vimeo, یان MP4)
            </Label>
            <Input
              value={uploadSource === 'embed' ? videoUrl : ''}
              onChange={(e) => handleUrlChange(e.target.value, 'embed')}
              placeholder="https://youtube.com/watch?v=..."
              dir="ltr"
            />
          </div>
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              پشتگیری: YouTube, Vimeo, و بەستەری ڕاستەوخۆی MP4/WebM
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-3 mt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full h-24 border-dashed flex flex-col gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">بارکردن...</span>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6" />
                <span className="text-sm">هەڵبژاردنی ڤیدیۆ لە ئامێرەکەت</span>
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            فۆرماتەکان: MP4, WebM, OGG (زۆرترین: ١٠٠MB)
          </p>
        </TabsContent>
        
        <TabsContent value="drive" className="space-y-3 mt-3">
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">
              بەستەری گووگڵ درایڤ
            </Label>
            <Input
              value={uploadSource === 'drive' ? videoUrl : ''}
              onChange={(e) => handleUrlChange(e.target.value, 'drive')}
              placeholder="https://drive.google.com/file/d/.../view"
              dir="ltr"
            />
          </div>
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <p className="text-xs font-medium">چۆن بەستەر بدۆزیتەوە:</p>
            <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
              <li>ڤیدیۆکە بکەرەوە لە Google Drive</li>
              <li>کلیک لە "Share" یان "هاوبەشکردن"</li>
              <li>ڕێگەپێدان بگۆڕە بۆ "Anyone with the link"</li>
              <li>بەستەرەکە کۆپی بکە</li>
            </ol>
          </div>
        </TabsContent>
      </Tabs>

      {renderPreview()}
    </div>
  );
};
