import { ContentBlock } from '../types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface TableBlockProps {
  block: ContentBlock;
  onChange: (content: string, meta?: ContentBlock['meta']) => void;
}

export const TableBlock = ({ block, onChange }: TableBlockProps) => {
  const rows = block.meta?.rows || [['', ''], ['', '']];

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = rows.map((row, ri) =>
      ri === rowIndex
        ? row.map((cell, ci) => (ci === colIndex ? value : cell))
        : [...row]
    );
    onChange(block.content, { ...block.meta, rows: newRows });
  };

  const addRow = () => {
    const newRow = new Array(rows[0]?.length || 2).fill('');
    onChange(block.content, { ...block.meta, rows: [...rows, newRow] });
  };

  const addColumn = () => {
    const newRows = rows.map(row => [...row, '']);
    onChange(block.content, { ...block.meta, rows: newRows });
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    const newRows = rows.filter((_, i) => i !== index);
    onChange(block.content, { ...block.meta, rows: newRows });
  };

  const removeColumn = (index: number) => {
    if ((rows[0]?.length || 0) <= 1) return;
    const newRows = rows.map(row => row.filter((_, i) => i !== index));
    onChange(block.content, { ...block.meta, rows: newRows });
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="group">
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border border-border p-0">
                    <Input
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className={`border-0 rounded-none h-10 ${rowIndex === 0 ? 'font-semibold bg-muted/50' : ''}`}
                      placeholder={rowIndex === 0 ? 'سەرنووس' : 'داتا'}
                    />
                  </td>
                ))}
                <td className="border-0 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeRow(rowIndex)}
                    disabled={rows.length <= 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1">
          <Plus className="h-3 w-3" />
          ڕیز
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addColumn} className="gap-1">
          <Plus className="h-3 w-3" />
          ستوون
        </Button>
        {(rows[0]?.length || 0) > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeColumn((rows[0]?.length || 1) - 1)}
            className="gap-1 text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            ستوون
          </Button>
        )}
      </div>
    </div>
  );
};
