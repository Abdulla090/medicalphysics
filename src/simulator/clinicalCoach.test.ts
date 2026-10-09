import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ClinicalCoach } from './ClinicalCoach.tsx';
import { assessClinicalAttempt, CLINICAL_CASES, EMPTY_PREPARATION } from './clinicalCases';
import { calculateMetrics } from './physics';
import { DEFAULT_STATE, applyProtocol } from './protocols';
import { analyzeCoach, createCoachPrediction, debriefCoach, experimentCoach, gradeCoachSession, type CoachInput } from './clinicalCoach.ts';
import type { CapturedImage, SimulatorState } from './types';

const completedPreparation = { identity: true, request: true, screening: true, metals: true, communication: true };
const patient = CLINICAL_CASES[0];
const goodState = applyProtocol({ ...DEFAULT_STATE, shielded: true, detectorReady: true }, patient.requested);

function input(state: SimulatorState = goodState, overrides: Partial<CoachInput> = {}): CoachInput {
  return { clinicalCase: patient, state, stage: 'exposure', preparation: completedPreparation, patientPrepared: true, hygieneDone: true, doorSecured: true, ...overrides };
}

function capture(state: SimulatorState): CapturedImage {
  return { id: 'test-capture', createdAt: 1720000000000, state, metrics: calculateMetrics(state), pixels: new Uint16Array(1), width: 1, height: 1, previewUrl: 'data:image/png;base64,', warnings: [] };
}

describe('live clinical coach observations', () => {
  it('prioritizes real patient identification and safety before image-quality preferences', () => {
    const faulty = { ...goodState, patientRotation: 14, detectorReady: false, shielded: false };
    const review = analyzeCoach(input(faulty, { preparation: EMPTY_PREPARATION, hygieneDone: false, doorSecured: false }));
    expect(review.chiefIssue?.id).toBe('identity');
    expect(review.acquisitionBlocked).toBe(true);
    expect(review.issues.find(item => item.id === 'hygiene')?.severity).toBe('stop');
    expect(review.issues.find(item => item.id === 'detector')?.severity).toBe('stop');
    expect(review.issues.find(item => item.id === 'rotation')?.predictedImage).toContain('symmetrical');
    expect(review.issues.find(item => item.id === 'protection')?.correctiveAction).toContain('control room');
  });

  it('ties geometry and technique to simulated patient position, equipment and case ranges', () => {
    const shifted = { ...goodState, patientRotation: 13, patientOffsetX: 9, sid: 110, kvp: 65, exposureMs: 1, breathHeld: false };
    const review = analyzeCoach(input(shifted));
    const ids = review.issues.map(item => item.id);
    expect(ids).toEqual(expect.arrayContaining(['rotation', 'centering', 'sid', 'kvp', 'mas', 'respiration']));
    expect(review.issues.find(item => item.id === 'mas')?.mechanism).toContain('stochastic image noise');
    expect(review.issues.find(item => item.id === 'sid')?.mechanism).toContain('magnification');
    expect(review.issues.find(item => item.id === 'coverage')?.verify).toContain('cannot prove');
  });

  it('uses specific explanations for the lateral and abdominal referrals without inventing diagnoses or dose', () => {
    const lateral = CLINICAL_CASES[1];
    const sideState = { ...applyProtocol(goodState, lateral.requested), arms: 'down' as const };
    const side = analyzeCoach(input(sideState, { clinicalCase: lateral }));
    expect(side.issues.find(item => item.id === 'arms')?.predictedImage).toContain('lateral anatomy');
    const abdomen = CLINICAL_CASES[2];
    const abs = analyzeCoach(input({ ...applyProtocol(goodState, abdomen.requested), breathHeld: false }, { clinicalCase: abdomen, preparation: EMPTY_PREPARATION }));
    expect(abs.issues.find(item => item.id === 'screening')?.correctiveAction).toContain('pregnancy');
    expect(abs.issues.find(item => item.id === 'respiration')?.observed).toContain('expiration');
    expect(abs.issues.find(item => item.id === 'respiration')?.predictedImage).toContain('Abdominal');
  });
});

describe('counterfactual physics lab', () => {
  it('doubling mAs raises relative model fluence approximately 2x with geometry unchanged', () => {
    const result = experimentCoach(goodState, 'mas');
    expect(result.change).toEqual({ exposureMs: goodState.exposureMs * 2 });
    expect(result.relativeExposureRatio).toBeCloseTo(2, 6);
    expect(result.geometricBlurRatio).toBeCloseTo(1, 6);
    expect(goodState.exposureMs).toBe(10);
  });

  it('increasing SID changes fluence and geometric blur in the expected directions', () => {
    const result = experimentCoach(goodState, 'sid');
    expect(result.change.sid).toBe(200);
    expect(result.relativeExposureRatio).toBeLessThan(1);
    expect(result.geometricBlurRatio).toBeLessThan(1);
    expect(result.observations.join(' ')).toContain('not patient dose');
  });

  it('parameter experiments never mutate source settings and do not directly alter operator safety', () => {
    for (const variable of ['mas', 'kvp', 'sid', 'rotation', 'centering', 'collimation'] as const) {
      const source = Object.freeze({ ...goodState, patientRotation: 8, patientOffsetX: 6 });
      const result = experimentCoach(source, variable);
      expect(source.patientRotation).toBe(8);
      expect(result.change.shielded).toBeUndefined();
      expect(result.change.detectorReady).toBeUndefined();
      expect(result.observations.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('snapshot prediction and capture-linked debrief', () => {
  const faulty = { ...goodState, patientRotation: 14 };
  const rationale = 'Rotation alters the overlap of projected anatomical landmarks; I must correct positioning.';
  const expectedSign = 'Unequal clavicle symmetry.';
  const prediction = createCoachPrediction(input(faulty), 'rotation', 'rotation', rationale, expectedSign, 1700000000000);

  it('preserves the exact preflight equipment state, prediction and correctable priority', () => {
    expect(prediction.chiefIssueId).toBe('rotation');
    expect(prediction.issueId).toBe('rotation');
    expect(prediction.state.patientRotation).toBe(14);
    expect(prediction.retrospective).toBe(false);
    faulty.patientRotation = 0;
    expect(prediction.state.patientRotation).toBe(14);
  });

  it('recognizes the predicted issue when the captured rubric still flags positioning', () => {
    const unsafeCapture = { ...goodState, patientRotation: 14 };
    const rubric = assessClinicalAttempt(patient, unsafeCapture, completedPreparation, true, true, true);
    const result = debriefCoach(prediction, patient, capture(unsafeCapture), rubric);
    expect(result.supported).toBe('confirmed');
    expect(result.finding).toContain('Patient rotation');
    expect(result.matchedCase).toBe(true);
  });

  it('reports resolved issues and explicit state changes when student repositions before capture', () => {
    const rubric = assessClinicalAttempt(patient, goodState, completedPreparation, true, true, true);
    const result = debriefCoach(prediction, patient, capture(goodState), rubric);
    expect(result.supported).toBe('resolved');
    expect(result.stateChanges).toContain('patientRotation: 14 → 0');
    expect(result.explanation).toContain('Settings changed');
  });

  it('does not blame rotation when rotation is corrected but centering still fails the combined rubric', () => {
    const recenteredRotation = { ...goodState, patientRotation: 0, patientOffsetX: 9 };
    const aggregateRubric = assessClinicalAttempt(patient, recenteredRotation, completedPreparation, true, true, true);
    expect(aggregateRubric.items.find(item => item.id === 'position')?.earned).toBe(0);
    const result = debriefCoach(prediction, patient, capture(recenteredRotation), aggregateRubric);
    expect(result.supported).toBe('resolved');
    expect(result.explanation).toContain('other constituent checks may still fail');
    expect(result.corrections.length).toBeGreaterThan(0);
  });

  it('never attributes a wrong-case assessment to this prediction', () => {
    const otherCase = CLINICAL_CASES[2];
    const rubric = assessClinicalAttempt(otherCase, goodState, completedPreparation, true, true, true);
    expect(debriefCoach(prediction, patient, capture(goodState), rubric).supported).toBe('not-assessed');
    expect(debriefCoach(prediction, patient, null, null).matchedCase).toBe(false);
  });

  it('scores documented reasoning and evidence while rejecting retrospective pre-exposure credit', () => {
    const rubric = assessClinicalAttempt(patient, goodState, completedPreparation, true, true, true);
    const result = debriefCoach(prediction, patient, capture(goodState), rubric);
    const full = gradeCoachSession(prediction, result, rubric.score, 'Both clavicles and costophrenic angles are visible, with no apparent motion.', ['alignment','coverage']);
    expect(full.score).toBe(100);
    expect(full.imageDebriefCompleted).toBe(true);
    expect(gradeCoachSession(prediction, result, rubric.score, 'Both clavicles and costophrenic angles are visible, with no apparent motion.', ['coverage']).score).toBe(75);
    const late = createCoachPrediction(input(faulty), 'rotation', 'rotation', rationale, expectedSign, 1700000000000, true);
    const retrospective = gradeCoachSession(late, result, rubric.score, 'Both clavicles and costophrenic angles are visible, with no apparent motion.', ['alignment','coverage']);
    expect(retrospective.score).toBe(25);
    expect(retrospective.feedback[0]).toContain('after capture');
  });
});

describe('clinical coach dialog behavior', () => {
  const props = { open: true, onClose: vi.fn(), clinicalCase: patient, stage: 'exposure' as const, state: goodState, preparation: completedPreparation, guided: false, patientPrepared: true, hygieneDone: true, doorSecured: true };

  it('is hidden while closed, traps the initial focus, and dismisses via Escape', () => {
    const onClose = vi.fn();
    const ui = render(createElement(ClinicalCoach, { ...props, open: false, onClose }));
    expect(screen.queryByRole('dialog')).toBeNull();
    ui.rerender(createElement(ClinicalCoach, { ...props, onClose }));
    expect(screen.getByRole('dialog', { name: /Before the beam/ })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close radiography coach' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps independent diagnostics sealed until the student requests a hint', () => {
    render(createElement(ClinicalCoach, { ...props, state: { ...goodState, patientRotation: 11 } }));
    expect(screen.getByText('Independent station')).toBeTruthy();
    expect(screen.queryByText('Mechanism')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reveal a hint' }));
    expect(screen.getByText('Rotation or tube angulation')).toBeTruthy();
  });

  it('supports a non-mutating physics experiment and optional explicit application', () => {
    const onAdjust = vi.fn();
    render(createElement(ClinicalCoach, { ...props, onAdjust }));
    fireEvent.click(screen.getByRole('button', { name: /Physics lab/ }));
    fireEvent.click(screen.getByRole('button', { name: 'mAs' }));
    expect(screen.getByText('2.00×')).toBeTruthy();
    expect(onAdjust).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Apply selected setting/ }));
    expect(onAdjust).toHaveBeenCalledWith({ exposureMs: 20 });
  });
});
