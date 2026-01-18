export type BlockType = 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'quote' | 'code' | 'image' | 'video' | 'table' | 'divider' | 'list' | 'callout';

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string;
  meta?: {
    url?: string;
    alt?: string;
    caption?: string;
    rows?: string[][];
    listType?: 'bullet' | 'numbered';
    items?: string[];
    calloutType?: 'info' | 'warning' | 'success' | 'error';
    language?: string;
  };
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading1: 'سەردێڕی ١',
  heading2: 'سەردێڕی ٢',
  heading3: 'سەردێڕی ٣',
  paragraph: 'پاراگراف',
  quote: 'ووتە',
  code: 'کۆد',
  image: 'وێنە',
  video: 'ڤیدیۆ',
  table: 'خشتە',
  divider: 'هێڵی جیاکەر',
  list: 'لیست',
  callout: 'تێبینی',
};

export const generateId = () => Math.random().toString(36).substring(2, 11);

export const createEmptyBlock = (type: BlockType): ContentBlock => ({
  id: generateId(),
  type,
  content: '',
  meta: type === 'table' 
    ? { rows: [['', ''], ['', '']] }
    : type === 'list'
    ? { listType: 'bullet', items: [''] }
    : type === 'callout'
    ? { calloutType: 'info' }
    : type === 'code'
    ? { language: 'javascript' }
    : undefined,
});

export const blocksToMarkdown = (blocks: ContentBlock[]): string => {
  return blocks.map(block => {
    switch (block.type) {
      case 'heading1':
        return `# ${block.content}`;
      case 'heading2':
        return `## ${block.content}`;
      case 'heading3':
        return `### ${block.content}`;
      case 'paragraph':
        return block.content;
      case 'quote':
        return `> ${block.content}`;
      case 'code':
        return `\`\`\`${block.meta?.language || ''}\n${block.content}\n\`\`\``;
      case 'image':
        return `![${block.meta?.alt || ''}](${block.meta?.url || ''})\n${block.meta?.caption ? `*${block.meta.caption}*` : ''}`;
      case 'video':
        return `{% youtube ${block.meta?.url || block.content} %}`;
      case 'table':
        if (!block.meta?.rows || block.meta.rows.length === 0) return '';
        const header = `| ${block.meta.rows[0].join(' | ')} |`;
        const separator = `| ${block.meta.rows[0].map(() => '---').join(' | ')} |`;
        const body = block.meta.rows.slice(1).map(row => `| ${row.join(' | ')} |`).join('\n');
        return `${header}\n${separator}\n${body}`;
      case 'divider':
        return '---';
      case 'list':
        if (!block.meta?.items) return '';
        return block.meta.items.map((item, i) => 
          block.meta?.listType === 'numbered' ? `${i + 1}. ${item}` : `- ${item}`
        ).join('\n');
      case 'callout':
        const icons: Record<string, string> = {
          info: 'ℹ️',
          warning: '⚠️',
          success: '✅',
          error: '❌'
        };
        return `> ${icons[block.meta?.calloutType || 'info']} **${block.meta?.calloutType?.toUpperCase()}**: ${block.content}`;
      default:
        return block.content;
    }
  }).join('\n\n');
};

export const markdownToBlocks = (markdown: string): ContentBlock[] => {
  if (!markdown.trim()) {
    return [createEmptyBlock('paragraph')];
  }

  const lines = markdown.split('\n');
  const blocks: ContentBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Heading 1
    if (line.startsWith('# ')) {
      blocks.push({ id: generateId(), type: 'heading1', content: line.slice(2) });
      i++;
      continue;
    }

    // Heading 2
    if (line.startsWith('## ')) {
      blocks.push({ id: generateId(), type: 'heading2', content: line.slice(3) });
      i++;
      continue;
    }

    // Heading 3
    if (line.startsWith('### ')) {
      blocks.push({ id: generateId(), type: 'heading3', content: line.slice(4) });
      i++;
      continue;
    }

    // Divider
    if (line.trim() === '---') {
      blocks.push({ id: generateId(), type: 'divider', content: '' });
      i++;
      continue;
    }

    // Code block
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ 
        id: generateId(), 
        type: 'code', 
        content: codeLines.join('\n'),
        meta: { language }
      });
      i++;
      continue;
    }

    // Quote
    if (line.startsWith('> ')) {
      blocks.push({ id: generateId(), type: 'quote', content: line.slice(2) });
      i++;
      continue;
    }

    // Image
    const imageMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
    if (imageMatch) {
      blocks.push({ 
        id: generateId(), 
        type: 'image', 
        content: '',
        meta: { alt: imageMatch[1], url: imageMatch[2] }
      });
      i++;
      continue;
    }

    // List (bullet)
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push({
        id: generateId(),
        type: 'list',
        content: '',
        meta: { listType: 'bullet', items }
      });
      continue;
    }

    // List (numbered)
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      blocks.push({
        id: generateId(),
        type: 'list',
        content: '',
        meta: { listType: 'numbered', items }
      });
      continue;
    }

    // Table
    if (line.includes('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        if (!lines[i].includes('---')) {
          const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
          rows.push(cells);
        }
        i++;
      }
      if (rows.length > 0) {
        blocks.push({
          id: generateId(),
          type: 'table',
          content: '',
          meta: { rows }
        });
      }
      continue;
    }

    // Default: paragraph
    blocks.push({ id: generateId(), type: 'paragraph', content: line });
    i++;
  }

  return blocks.length > 0 ? blocks : [createEmptyBlock('paragraph')];
};
