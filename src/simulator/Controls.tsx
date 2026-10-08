import { useEffect, useId, useState } from 'react';
import { CheckIcon, MinusIcon, PlusIcon } from '@radix-ui/react-icons';

interface ParameterProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  note?: string;
}

export function Parameter({ label, value, unit, min, max, step = 1, onChange, note }: ParameterProps) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const update = (next: number) => {
    if (!Number.isFinite(next)) return;
    const valid = Number((Math.round(Math.min(max, Math.max(min, next)) / step) * step).toFixed(3));
    setDraft(String(valid));
    onChange(valid);
  };
  const commit = () => { if (draft.trim() && Number.isFinite(Number(draft))) update(Number(draft)); else setDraft(String(value)); };
  return (
    <div className="sim-parameter">
      <div className="sim-parameter-heading">
        <label htmlFor={id}>{label}</label>
        <div className="sim-numeric">
          <input id={id} type="number" min={min} max={max} step={step} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { event.preventDefault(); setDraft(String(value)); } }} />
          <span>{unit}</span>
        </div>
      </div>
      <div className="sim-range-row">
        <button type="button" className="sim-step" aria-label={`Decrease ${label}`} onClick={() => update(value - step)} disabled={value <= min}><MinusIcon /></button>
        <input type="range" aria-label={`${label} slider`} min={min} max={max} step={step} value={value} onChange={(e) => update(Number(e.target.value))} style={{ '--range-progress': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties} />
        <button type="button" className="sim-step" aria-label={`Increase ${label}`} onClick={() => update(value + step)} disabled={value >= max}><PlusIcon /></button>
      </div>
      {note && <p className="sim-field-note">{note}</p>}
    </div>
  );
}

export function Toggle({ label, detail, checked, onChange }: { label: string; detail?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="sim-toggle-row">
      <span><strong>{label}</strong>{detail && <small>{detail}</small>}</span>
      <span className="sim-toggle">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span aria-hidden="true" className="sim-toggle-track"><span>{checked && <CheckIcon />}</span></span>
      </span>
    </label>
  );
}

export function AnatomyGlyph({ region = 'chest', className = '' }: { region?: 'chest' | 'abdomen' | 'pelvis'; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 42 64" fill="none" aria-hidden="true">
      <path d="M21 13c3 0 5-2.4 5-5.5S24 2 21 2s-5 2.4-5 5.5 2 5.5 5 5.5ZM16 16l-5 2-4 17c-.5 2 2.3 3 3 1l5-12 1 15-2 21c0 2.5 3 2.8 3.5.5L21 43l3.5 17.5c.5 2.3 3.5 2 3.5-.5l-2-21 1-15 5 12c.7 2 3.5 1 3-1l-4-17-5-2h-10Z" fill="currentColor" fillOpacity=".09" stroke="currentColor" strokeWidth="1.2" />
      <rect x="14.2" y={region === 'chest' ? 19 : region === 'abdomen' ? 28 : 35} width="13.6" height={region === 'chest' ? 11 : 9} rx="2" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1" />
      <path d="M21 17v22M17 21h8m-8 3h8m-8 3h8" stroke="currentColor" strokeWidth=".7" opacity=".4" />
    </svg>
  );
}
