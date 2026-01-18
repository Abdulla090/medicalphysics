import { ContentBlock } from '../types';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CodeBlockProps {
  block: ContentBlock;
  onChange: (content: string, meta?: ContentBlock['meta']) => void;
}

const languages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: '', label: 'Plain Text' },
];

export const CodeBlock = ({ block, onChange }: CodeBlockProps) => {
  return (
    <div className="space-y-2">
      <Select
        value={block.meta?.language || ''}
        onValueChange={(lang) => onChange(block.content, { ...block.meta, language: lang })}
      >
        <SelectTrigger className="w-40 h-8 text-xs">
          <SelectValue placeholder="زمان" />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.value} value={lang.value}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea
        value={block.content}
        onChange={(e) => onChange(e.target.value, block.meta)}
        placeholder="// کۆدەکەت لێرە بنووسە..."
        className="font-mono text-sm bg-muted/50 min-h-[100px]"
        dir="ltr"
      />
    </div>
  );
};
