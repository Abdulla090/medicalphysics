import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import RadiographViewer from './RadiographViewer';
import { calculateMetrics, generateRadiograph } from './physics';
import { applyProtocol, DEFAULT_STATE } from './protocols';

afterEach(() => vi.restoreAllMocks());

describe('synthetic image critique viewer', () => {
  it('connects captured data to projection cues, signal metrics, field flags and interactive landmark overlay', () => {
    const putImageData = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
      createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
      putImageData,
    }) as unknown as CanvasRenderingContext2D);
    const state = { ...applyProtocol(DEFAULT_STATE, 'chest-lateral'), collimationWidth: 12, arms: 'down' as const, patientRotation: 8 };
    const result = generateRadiograph(state, 14, 64);
    render(<RadiographViewer image={{ id: 'case-42', createdAt: 1, state, metrics: calculateMetrics(state),
      ...result, previewUrl: 'data:image/png;base64,', warnings: [] }} onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/sampled volume visible/i)).toBeTruthy();
    expect(screen.getByText(/left side is receptor-adjacent/i)).toBeTruthy();
    expect(screen.getByText(/modeled concern\(s\) to discuss/i)).toBeTruthy();
    expect(putImageData).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Coverage' }));
    expect(screen.queryByText(/nearest edge margin/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Within exercise reference' }));
    expect(screen.getByText(/nearest edge margin/i)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Compare your prediction with the model');
    fireEvent.click(screen.getByRole('button', { name: 'Position' }));
    fireEvent.click(screen.getByRole('button', { name: 'Inspect a concern' }));
    expect(screen.getByText(/Patient rotation 8°/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Signal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Within exercise reference' }));
    expect(screen.getByText(/Relative detector air-fluence proxy/)).toBeTruthy();
    const overlay = screen.getByRole('button', { name: 'Show reference points' });
    fireEvent.click(overlay);
    expect(screen.getByRole('button', { name: 'Hide reference points' }).getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.sim-review-overlay')).toBeTruthy();
  });
});
