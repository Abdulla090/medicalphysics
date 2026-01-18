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
}

const PDFDownloadButton = ({ title, content, instructor, category }: PDFDownloadButtonProps) => {
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    
    try {
      // Process content - convert markdown to HTML
      const htmlContent = content
        .replace(/^### (.*)$/gm, '<h3 style="font-size: 16px; font-weight: bold; margin: 16px 0 8px 0;">$1</h3>')
        .replace(/^## (.*)$/gm, '<h2 style="font-size: 18px; font-weight: bold; margin: 20px 0 10px 0;">$1</h2>')
        .replace(/^# (.*)$/gm, '<h1 style="font-size: 22px; font-weight: bold; margin: 24px 0 12px 0;">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">$1</code>')
        .replace(/```[\s\S]*?```/g, (match) => {
          const code = match.replace(/```\w*\n?/g, '').replace(/```/g, '');
          return `<pre style="background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: monospace; font-size: 12px; direction: ltr;">${code}</pre>`;
        })
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #2563eb;">$1</a>')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/^>\s+(.*)$/gm, '<blockquote style="border-right: 4px solid #e5e7eb; padding-right: 16px; margin: 12px 0; color: #6b7280;">$1</blockquote>')
        .replace(/^[-*+]\s+(.*)$/gm, '<li style="margin: 4px 0;">$1</li>')
        .replace(/(<li.*<\/li>\n?)+/g, '<ul style="list-style-type: disc; padding-right: 24px; margin: 8px 0;">$&</ul>')
        .replace(/^\d+\.\s+(.*)$/gm, '<li style="margin: 4px 0;">$1</li>')
        .replace(/\n\n/g, '</p><p style="margin: 12px 0;">')
        .replace(/\n/g, '<br>');

      // Create the HTML container
      const container = document.createElement('div');
      container.innerHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; text-align: right; padding: 20px; line-height: 1.8;">
          <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 12px; color: #1f2937;">${title}</h1>
          ${(instructor || category) ? `
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">
              ${[instructor, category].filter(Boolean).join(' | ')}
            </p>
          ` : ''}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
          <div style="font-size: 14px; color: #374151;">
            <p style="margin: 12px 0;">${htmlContent}</p>
          </div>
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
