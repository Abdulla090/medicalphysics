import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';

interface PDFDownloadButtonProps {
  title: string;
  content: string;
  instructor?: string;
  category?: string;
  videoId?: string;
}

// Extract video/media information from content
const extractMediaInfo = (content: string) => {
  const media: { type: string; url: string; id?: string }[] = [];
  
  // YouTube embeds - {% youtube VIDEO_ID %}
  const youtubeMatches = content.matchAll(/\{% youtube ([^\s]+) %\}/g);
  for (const match of youtubeMatches) {
    media.push({ 
      type: 'youtube', 
      id: match[1], 
      url: `https://youtube.com/watch?v=${match[1]}` 
    });
  }
  
  // Google Drive embeds - {% drive FILE_ID %}
  const driveMatches = content.matchAll(/\{% drive ([^\s]+) %\}/g);
  for (const match of driveMatches) {
    media.push({ 
      type: 'drive', 
      id: match[1], 
      url: `https://drive.google.com/file/d/${match[1]}/view` 
    });
  }
  
  // Direct image URLs
  const imageMatches = content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);
  for (const match of imageMatches) {
    media.push({ 
      type: 'image', 
      url: match[2] 
    });
  }
  
  return media;
};

const PDFDownloadButton = ({ title, content, instructor, category, videoId }: PDFDownloadButtonProps) => {
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    
    try {
      const media = extractMediaInfo(content);
      
      // Process content - convert markdown to HTML
      let htmlContent = content
        .replace(/^### (.*)$/gm, '<h3 style="font-size: 16px; font-weight: 600; margin: 16px 0 8px 0; color: #1f2937;">$1</h3>')
        .replace(/^## (.*)$/gm, '<h2 style="font-size: 18px; font-weight: 600; margin: 20px 0 10px 0; color: #1f2937;">$1</h2>')
        .replace(/^# (.*)$/gm, '<h1 style="font-size: 22px; font-weight: 700; margin: 24px 0 12px 0; color: #111827;">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px;">$1</code>')
        .replace(/```[\s\S]*?```/g, (match) => {
          const code = match.replace(/```\w*\n?/g, '').replace(/```/g, '');
          return `<pre style="background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px; direction: ltr; margin: 12px 0;">${code}</pre>`;
        })
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #2563eb; text-decoration: underline;">$1</a>')
        .replace(/^>\s+(.*)$/gm, '<blockquote style="border-right: 3px solid #d1d5db; padding-right: 16px; margin: 12px 0; color: #4b5563; font-style: italic;">$1</blockquote>')
        .replace(/^[-*+]\s+(.*)$/gm, '<li style="margin: 6px 0; padding-right: 8px;">$1</li>')
        .replace(/(<li.*<\/li>\n?)+/g, '<ul style="list-style-type: disc; padding-right: 24px; margin: 12px 0;">$&</ul>')
        .replace(/^\d+\.\s+(.*)$/gm, '<li style="margin: 6px 0; padding-right: 8px;">$1</li>')
        .replace(/\{% youtube ([^\s]+) %\}/g, '<div style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 12px 0; text-align: center;"><p style="margin: 0; color: #374151;">🎬 ڤیدیۆی یوتیوب</p><a href="https://youtube.com/watch?v=$1" style="color: #2563eb; font-size: 14px;">https://youtube.com/watch?v=$1</a></div>')
        .replace(/\{% drive ([^\s]+) %\}/g, '<div style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 12px 0; text-align: center;"><p style="margin: 0; color: #374151;">📁 فایلی گووگڵ درایڤ</p><a href="https://drive.google.com/file/d/$1/view" style="color: #2563eb; font-size: 14px;">https://drive.google.com/file/d/$1/view</a></div>')
        .replace(/\n\n/g, '</p><p style="margin: 12px 0; line-height: 1.8;">')
        .replace(/\n/g, '<br>');

      // Handle images - keep them in PDF
      htmlContent = htmlContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
        return `<figure style="margin: 16px 0; text-align: center;"><img src="${src}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;" />${alt ? `<figcaption style="margin-top: 8px; font-size: 13px; color: #6b7280; font-style: italic;">${alt}</figcaption>` : ''}</figure>`;
      });

      // Build media references section
      let mediaSection = '';
      if (videoId || media.length > 0) {
        mediaSection = `
          <div style="margin-top: 24px; padding-top: 16px; border-top: 2px solid #e5e7eb;">
            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #1f2937;">📎 سەرچاوەکانی مەڵتیمیدیا</h3>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
        `;
        
        if (videoId) {
          const isYouTube = videoId.length === 11;
          const videoUrl = isYouTube 
            ? `https://youtube.com/watch?v=${videoId}`
            : `https://drive.google.com/file/d/${videoId}/view`;
          mediaSection += `
            <div style="margin-bottom: 8px;">
              <span style="color: #374151; font-weight: 500;">ڤیدیۆی سەرەکی:</span><br>
              <a href="${videoUrl}" style="color: #2563eb; font-size: 14px; word-break: break-all;">${videoUrl}</a>
            </div>
          `;
        }
        
        media.forEach((item, index) => {
          if (item.type === 'youtube') {
            mediaSection += `
              <div style="margin-bottom: 8px;">
                <span style="color: #374151;">🎬 ڤیدیۆ ${index + 1}:</span>
                <a href="${item.url}" style="color: #2563eb; font-size: 14px; margin-right: 8px;">${item.url}</a>
              </div>
            `;
          } else if (item.type === 'drive') {
            mediaSection += `
              <div style="margin-bottom: 8px;">
                <span style="color: #374151;">📁 فایل ${index + 1}:</span>
                <a href="${item.url}" style="color: #2563eb; font-size: 14px; margin-right: 8px;">${item.url}</a>
              </div>
            `;
          }
        });
        
        mediaSection += `</div></div>`;
      }

      // Create the HTML container
      const container = document.createElement('div');
      container.innerHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; text-align: right; padding: 24px; line-height: 1.8; color: #1f2937;">
          <header style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb;">
            <h1 style="font-size: 26px; font-weight: 700; margin: 0 0 8px 0; color: #111827;">${title}</h1>
            ${(instructor || category) ? `
              <p style="font-size: 14px; color: #6b7280; margin: 0;">
                ${[instructor, category].filter(Boolean).join(' • ')}
              </p>
            ` : ''}
          </header>
          <main style="font-size: 15px; color: #374151;">
            <p style="margin: 12px 0; line-height: 1.8;">${htmlContent}</p>
          </main>
          ${mediaSection}
          <footer style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              دروستکراوە لە پلاتفۆرمی فێربوونی ڕادیۆلۆجی بە کوردی
            </p>
          </footer>
        </div>
      `;

      const opt = {
        margin: [15, 15, 20, 15] as [number, number, number, number],
        filename: `${title.replace(/[^a-zA-Z0-9\u0600-\u06FF\u0750-\u077F]/g, '_')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          allowTaint: true,
        },
        jsPDF: { 
          unit: 'mm' as const, 
          format: 'a4' as const, 
          orientation: 'portrait' as const 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(container).save();
      
      toast.success('PDF دروستکرا!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('هەڵە لە دروستکردنی PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generatePDF}
      disabled={generating}
      className="gap-2"
    >
      {generating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      {generating ? 'دروستکردن...' : 'داگرتنی PDF'}
    </Button>
  );
};

export default PDFDownloadButton;
