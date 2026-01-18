import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

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
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Set RTL direction and Arabic font
      pdf.setR2L(true);
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Title
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(title, contentWidth);
      pdf.text(titleLines, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += titleLines.length * 10 + 5;

      // Metadata
      if (instructor || category) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100);
        const meta = [instructor, category].filter(Boolean).join(' | ');
        pdf.text(meta, pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 10;
        pdf.setTextColor(0);
      }

      // Divider line
      pdf.setDrawColor(200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Process content - remove markdown syntax and format
      const cleanContent = content
        .replace(/^#{1,6}\s+(.*)$/gm, '$1') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/`([^`]+)`/g, '$1') // Remove inline code
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
        .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
        .replace(/^>\s+/gm, '') // Remove blockquotes
        .replace(/^[-*+]\s+/gm, '• ') // Convert lists
        .replace(/^\d+\.\s+/gm, '• ') // Convert numbered lists
        .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
        .trim();

      // Content
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      const lines = cleanContent.split('\n');
      
      for (const line of lines) {
        if (line.trim() === '') {
          yPosition += 5;
          continue;
        }

        const textLines = pdf.splitTextToSize(line, contentWidth);
        
        for (const textLine of textLines) {
          if (yPosition > pageHeight - margin - 20) {
            pdf.addPage();
            yPosition = margin;
          }
          
          pdf.text(textLine, pageWidth - margin, yPosition, { align: 'right' });
          yPosition += 7;
        }
      }

      // Footer with page numbers
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(150);
        pdf.text(
          `${i} / ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Download
      const fileName = `${title.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')}.pdf`;
      pdf.save(fileName);
      
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
