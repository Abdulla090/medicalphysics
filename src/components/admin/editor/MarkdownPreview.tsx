import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export const MarkdownPreview = ({ content, className }: MarkdownPreviewProps) => {
  if (!content.trim()) {
    return (
      <div className={cn('text-muted-foreground text-center py-12', className)}>
        ناوەڕۆکێک نییە بۆ پیشاندان
      </div>
    );
  }

  return (
    <div className={cn('prose prose-lg dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom rendering for YouTube/Drive embeds
          p: ({ children, ...props }) => {
            const text = String(children);
            
            // YouTube embed syntax
            const youtubeMatch = text.match(/\{% youtube ([^\s]+) %\}/);
            if (youtubeMatch) {
              const videoId = youtubeMatch[1];
              return (
                <div className="aspect-video rounded-lg overflow-hidden my-4">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              );
            }
            
            // Google Drive embed
            const driveMatch = text.match(/\{% drive ([^\s]+) %\}/);
            if (driveMatch) {
              const fileId = driveMatch[1];
              return (
                <div className="aspect-video rounded-lg overflow-hidden my-4">
                  <iframe
                    src={`https://drive.google.com/file/d/${fileId}/preview`}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              );
            }
            
            return <p {...props}>{children}</p>;
          },
          
          // Style tables
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full border-collapse border border-border" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="border border-border bg-muted px-4 py-2 text-right font-semibold" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-border px-4 py-2" {...props}>
              {children}
            </td>
          ),
          
          // Style code blocks
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            
            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }
            
            return (
              <div className="relative">
                {match && (
                  <span className="absolute top-2 left-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {match[1]}
                  </span>
                )}
                <code className={cn('block bg-muted p-4 rounded-lg overflow-x-auto font-mono text-sm', match && 'pt-8')} {...props}>
                  {children}
                </code>
              </div>
            );
          },
          
          // Style blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote 
              className="border-r-4 border-primary pr-4 my-4 text-muted-foreground italic"
              {...props}
            >
              {children}
            </blockquote>
          ),
          
          // Style images with captions
          img: ({ src, alt, ...props }) => (
            <figure className="my-4">
              <img 
                src={src} 
                alt={alt} 
                className="rounded-lg max-w-full h-auto mx-auto"
                {...props}
              />
              {alt && (
                <figcaption className="text-center text-sm text-muted-foreground mt-2 italic">
                  {alt}
                </figcaption>
              )}
            </figure>
          ),
          
          // Style headings
          h1: ({ children, ...props }) => (
            <h1 className="text-3xl font-bold mt-8 mb-4" {...props}>{children}</h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-2xl font-semibold mt-6 mb-3" {...props}>{children}</h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-xl font-medium mt-4 mb-2" {...props}>{children}</h3>
          ),
          
          // Style links
          a: ({ children, href, ...props }) => (
            <a 
              href={href} 
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          
          // Style lists
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside my-4 space-y-1" {...props}>{children}</ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside my-4 space-y-1" {...props}>{children}</ol>
          ),
          
          // Style horizontal rule
          hr: () => <hr className="my-8 border-t-2 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
