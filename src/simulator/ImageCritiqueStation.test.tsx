import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ImageCritiqueStation } from './ImageCritiqueStation';
import { CLINICAL_CASES } from './clinicalCases';
import { DEFAULT_STATE } from './protocols';
import type { CapturedImage } from './types';

const image: CapturedImage = {
  id: 'capture-001', createdAt: 1, state: { ...DEFAULT_STATE, breathHeld: true },
  metrics: { mas: 2, magnification: 1.05, unsharpness: .05, relativeExposure: 1, noise: .02 },
  pixels: new Uint16Array(1), width: 1, height: 1,
  previewUrl: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', warnings: [],
};

describe('image critique workflow', () => {
  it('requires an evidence-based critique and a documented repeat justification', () => {
    const onRepeat = vi.fn();
    const onAccept = vi.fn();
    render(<ImageCritiqueStation image={image} clinicalCase={CLINICAL_CASES[0]} assessment={null} onInspect={vi.fn()} onAccept={onAccept} onRepeat={onRepeat} onClose={vi.fn()} />);
    const grade = screen.getByRole('button', { name: 'Compare with training evidence' });
    expect(grade).toBeDisabled();
    const radios = screen.getAllByRole('radio');
    for (const index of [0, 3, 6, 9]) fireEvent.click(radios[index]);
    expect(grade).toBeEnabled();
    fireEvent.click(grade);
    expect(screen.getByText(/YOUR TECHNICAL CRITIQUE/)).toBeInTheDocument();
    const action = screen.getByRole('button', { name: 'Consider corrective repeat' });
    fireEvent.click(action);
    const returnToRoom = screen.getByRole('button', { name: 'Return to the imaging room' });
    expect(returnToRoom).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Document the intended correction' }), { target: { value: 'Recheck the costophrenic angles and recenter the beam.' } });
    expect(returnToRoom).toBeEnabled();
    fireEvent.click(returnToRoom);
    expect(onRepeat).toHaveBeenCalledTimes(1);
    expect(onRepeat.mock.calls[0][0].total).toBe(4);
    expect(onRepeat.mock.calls[0][1]).toMatch(/costophrenic/);
    expect(onAccept).not.toHaveBeenCalled();
  });
});
