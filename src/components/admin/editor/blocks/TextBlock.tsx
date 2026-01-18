import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ContentBlock, BlockType } from '../types';

interface TextBlockProps {
  block: ContentBlock;
  onChange: (content: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
}

const typeStyles: Record<string, string> = {
  heading1: 'text-3xl font-bold',
  heading2: 'text-2xl font-semibold',
  heading3: 'text-xl font-medium',
  paragraph: 'text-base',
  quote: 'text-lg italic border-r-4 border-primary pr-4 text-muted-foreground',
};

const placeholders: Record<string, string> = {
  heading1: 'سەردێڕی سەرەکی...',
  heading2: 'سەردێڕی لاوەکی...',
  heading3: 'سەردێڕی بچووک...',
  paragraph: 'دەقی خۆت بنووسە...',
  quote: 'ووتەیەک بنووسە...',
};

export const TextBlock = ({ block, onChange, onKeyDown, placeholder }: TextBlockProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [block.content]);

  return (
    <textarea
      ref={textareaRef}
      value={block.content}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder || placeholders[block.type] || 'دەق...'}
      className={cn(
        'w-full bg-transparent border-none outline-none resize-none overflow-hidden',
        'focus:ring-0 focus:outline-none placeholder:text-muted-foreground/50',
        typeStyles[block.type] || typeStyles.paragraph
      )}
      rows={1}
    />
  );
};
