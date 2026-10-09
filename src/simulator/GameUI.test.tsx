import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChangingUI, GameExposure, GameReview } from './GameUI';
import { CLINICAL_CASES } from './clinicalCases';
import { DEFAULT_STATE } from './protocols';
import { calculateMetrics } from './physics';
import type { CapturedImage } from './types';

const trainingImage: CapturedImage = {
  id: 'training-image', createdAt: 0, state: DEFAULT_STATE,
  metrics: calculateMetrics(DEFAULT_STATE), pixels: new Uint16Array(1), width: 1, height: 1,
  previewUrl: 'data:image/png;base64,', warnings: [],
};

describe('interactive clinical stations', () => {
  it('requires patient arrival, privacy and active safety communication before gown handoff', () => {
    const onChange = vi.fn();
    const view = render(<ChangingUI clinicalCase={CLINICAL_CASES[2]} patientArrived={false} doorClosed={false} onChange={onChange} onClose={() => {}} />);
    const handover = screen.getByRole('button', { name: /Hand over gown/ });
    expect((handover as HTMLButtonElement).disabled).toBe(true);
    view.rerender(<ChangingUI clinicalCase={CLINICAL_CASES[2]} patientArrived doorClosed={false} onChange={onChange} onClose={() => {}} />);
    expect(screen.getByText(/pregnancy considerations/)).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: /Complete safety screening/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Explain the requested projection/ }));
    expect((handover as HTMLButtonElement).disabled).toBe(false);
    view.rerender(<ChangingUI clinicalCase={CLINICAL_CASES[2]} patientArrived doorClosed onChange={onChange} onClose={() => {}} />);
    expect((handover as HTMLButtonElement).disabled).toBe(true);
    view.rerender(<ChangingUI clinicalCase={CLINICAL_CASES[2]} patientArrived doorClosed={false} onChange={onChange} onClose={() => {}} />);
    fireEvent.click(handover);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('cannot run an exposure while simulator interlocks are open', () => {
    const onExpose = vi.fn();
    render(<GameExposure state={{ ...DEFAULT_STATE, detectorReady: false, shielded: false }} blocked phase="idle" busy={false} onExpose={onExpose} onChange={() => {}} onClose={() => {}} />);
    expect((screen.getByRole('button', { name: /Prepare exposure/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByText('Action required', { exact: true })).toHaveLength(2);
    expect(onExpose).not.toHaveBeenCalled();
  });
  it('requires a fresh intercom breath hold before a prepared exposure', () => {
    const onExpose = vi.fn();
    const onBreathInstruction = vi.fn();
    const baseline = { ...DEFAULT_STATE, breathHeld: false };
    const props = { blocked: false, phase: 'prepared' as const, busy: false, onExpose, onBreathInstruction, onChange: () => {}, onClose: () => {} };
    const scene = render(<GameExposure {...props} state={baseline} breathHoldUntil={0} />);
    expect((screen.getByRole('button', { name: /EXPOSE/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Intercom/ }));
    expect(onBreathInstruction).toHaveBeenCalledTimes(1);
    scene.rerender(<GameExposure {...props} state={{ ...baseline, breathHeld: true }} breathHoldUntil={Date.now() + 10000} />);
    expect((screen.getByRole('button', { name: /EXPOSE/ }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('never silently advances to the next patient after choosing an unavailable repeat', () => {
    const onNext = vi.fn();
    const view = render(<GameReview image={trainingImage} assessment={null} onImage={() => {}} onNext={onNext} onClose={() => {}} />);
    const advance = screen.getByRole('button', { name: /Finish case/i });
    expect((advance as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Consider repeat' }));
    expect((advance as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/repeat is unavailable/i)).toBeTruthy();
    expect(screen.getByText(/No scored technical assessment is available/i)).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Accept image' }));
    expect((advance as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(advance);
    expect(onNext).toHaveBeenCalledTimes(1);
    view.unmount();
  });
  it('flags technical concerns even with a high training score', () => {
    render(<GameReview image={trainingImage} assessment={{ caseId: 'outpatient-chest', score: 92, total: 100,
      items: [{ id: 'position', label: 'Positioning', points: 8, earned: 0, feedback: 'Correct simulated positioning.' }],
      criticalFailures: [], notes: ['Positioning issue.'],
    }} onImage={() => {}} onNext={() => {}} onRepeat={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Technical concerns flagged for review')).toBeTruthy();
    expect(screen.getByText('92%')).toBeTruthy();
  });
});
