import { describe, expect, it } from 'vitest';
import { assessClinicalAttempt, CLINICAL_CASES, EMPTY_PREPARATION, PREPARATION_ITEMS } from './clinicalCases';
import { applyProtocol, DEFAULT_STATE } from './protocols';

const prepared = Object.fromEntries(PREPARATION_ITEMS.map(item => [item.key, true])) as typeof EMPTY_PREPARATION;

describe('fictional clinical encounter rubric', () => {
  it('awards the full 100 teaching points only when the acquisition matches the requested clinical scenario', () => {
    for (const clinicalCase of CLINICAL_CASES) {
      const setting = applyProtocol({ ...DEFAULT_STATE, shielded: true }, clinicalCase.requested);
      const assessment = assessClinicalAttempt(clinicalCase, setting, prepared, true, true, true);
      expect(assessment.total).toBe(100);
      expect(assessment.score).toBe(100);
      expect(assessment.criticalFailures).toEqual([]);
    }
  });

  it('flags omitted ID verification, skipped hand hygiene, an unprotected exposure, and incorrect view', () => {
    const clinicalCase = CLINICAL_CASES[0];
    const settings = applyProtocol({ ...DEFAULT_STATE, shielded: false }, 'abdomen-ap');
    const unsafe = assessClinicalAttempt(clinicalCase, settings, { ...prepared, identity: false }, true, false, false);
    expect(unsafe.score).toBeLessThan(60);
    expect(unsafe.criticalFailures).toEqual(expect.arrayContaining([
      expect.stringContaining('identity'),
      expect.stringContaining('Hand hygiene'),
      expect.stringContaining('protection'),
      expect.stringContaining('projection'),
    ]));
  });

  it('responds to image geometry, respiration and technique rather than awarding points for a button press', () => {
    const clinicalCase = CLINICAL_CASES[1];
    const reference = applyProtocol(DEFAULT_STATE, clinicalCase.requested);
    const faulty = { ...reference, patientRotation: 13, patientOffsetX: 7, breathHeld: false, kvp: 65, exposureMs: 120 };
    const score = assessClinicalAttempt(clinicalCase, faulty, prepared, true, true, true);
    expect(score.items.find(item => item.id === 'position')?.earned).toBe(0);
    expect(score.items.find(item => item.id === 'technique')?.earned).toBe(0);
    expect(score.items.find(item => item.id === 'respiration')?.earned).toBe(0);
    expect(score.score).toBeLessThan(100);
  });
});
