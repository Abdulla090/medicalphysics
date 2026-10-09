import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from './protocols';
import { CLINICAL_CASES } from './clinicalCases';
import { evaluateImageCritique, summarizeImageCritique, type CritiqueAnswers } from './imageCritique';
import type { CapturedImage } from './types';

const clinicalCase = CLINICAL_CASES[0];
const snapshot = (changes: Partial<CapturedImage['state']> = {}): CapturedImage => ({
  id: 'test', createdAt: 1, state: { ...DEFAULT_STATE, ...changes },
  pixels: new Uint16Array(1), width: 1, height: 1, previewUrl: '', warnings: [],
  metrics: { mas: 2, magnification: 1.1, unsharpness: .1, noise: .1, relativeExposure: 1 },
});

describe('student image critique', () => {
  it('compares evidence with referral and captures each technical error independently', () => {
    const results = evaluateImageCritique(snapshot({ protocol: 'chest-ap', patientRotation: 9, patientOffsetX: 6, collimationWidth: 9, breathHeld: false }), clinicalCase, {});
    expect(results.map(item => item.expected)).toEqual(['defect', 'defect', 'defect', 'defect']);
    expect(results[0].evidence).toContain('Chest PA');
  });
  it('scores the student decision against the acquisition snapshot and refuses uncertain guesses', () => {
    const answers: CritiqueAnswers = { projection: 'acceptable', alignment: 'defect', coverage: 'uncertain', motion: 'defect' };
    const results = evaluateImageCritique(snapshot({ patientOffsetY: 8, breathHeld: false }), clinicalCase, answers);
    const { correct, total, missed } = summarizeImageCritique(results);
    expect(total).toBe(4);
    expect(correct).toBe(3);
    expect(missed[0].id).toBe('coverage');
    expect(results.find(item => item.id === 'alignment')?.correct).toBe(true);
  });
});
