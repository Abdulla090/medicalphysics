import { getReadinessChecks } from './physics';
import { getProtocol } from './protocols';
import type { ClinicalCase } from './clinicalCases';
import type { CapturedImage } from './types';

export type CritiqueDecision = 'acceptable' | 'defect' | 'uncertain';
export type CritiqueKey = 'projection' | 'alignment' | 'coverage' | 'motion';
export type CritiqueAnswers = Partial<Record<CritiqueKey, CritiqueDecision>>;
export type CritiqueResult = { id: CritiqueKey; title: string; expected: Exclude<CritiqueDecision, 'uncertain'>; answer: CritiqueDecision | null; correct: boolean; evidence: string; correction: string };

export const CRITIQUE_FIELDS: { id: CritiqueKey; title: string; question: string; tip: string }[] = [
  { id: 'projection', title: 'Requested projection', question: 'Does the examination match the referral?', tip: 'Check PA, AP or lateral orientation against the order.' },
  { id: 'alignment', title: 'Positioning & rotation', question: 'Are the patient and essential structures aligned?', tip: 'Review centering, rotation and the position of the upper limbs.' },
  { id: 'coverage', title: 'Anatomical inclusion', question: 'Is the required region inside the exposed field?', tip: 'Inspect apices, costophrenic angles, or the requested abdominal/pelvic boundaries.' },
  { id: 'motion', title: 'Motion & respiration', question: 'Was breathing coordinated for this projection?', tip: 'A timed inspiratory or expiratory hold limits motion in this training phantom.' },
];

/** Reflects observable exercise state, not interpretation of pathology or clinical acceptance. */
export function evaluateImageCritique(image: CapturedImage, clinicalCase: ClinicalCase, answers: CritiqueAnswers): CritiqueResult[] {
  const checks = getReadinessChecks(image.state);
  const passed = (id: string) => checks.find(check => check.id === id)?.passed === true;
  const states: Record<CritiqueKey, { good: boolean; evidence: string; correction: string }> = {
    projection: {
      good: image.state.protocol === clinicalCase.requested,
      evidence: `Referral: ${getProtocol(clinicalCase.requested).name}; acquisition: ${getProtocol(image.state.protocol).name}.`,
      correction: 'Verify the projection and indication before another acquisition.',
    },
    alignment: {
      good: passed('centering') && passed('rotation') && passed('arms'),
      evidence: `Offsets ${image.state.patientOffsetX.toFixed(1)} / ${image.state.patientOffsetY.toFixed(1)} cm; patient rotation ${image.state.patientRotation.toFixed(0)}°; tube ${image.state.tubeAngle.toFixed(0)}°; arms ${image.state.arms}.`,
      correction: 'Reassess the beam center, patient rotation, and limb overlap at the receptor.',
    },
    coverage: {
      good: passed('coverage'),
      evidence: `${image.state.collimationWidth} × ${image.state.collimationHeight} cm modeled field. Central target inclusion ${passed('coverage') ? 'estimated' : 'not demonstrated'} by the simplified projected envelope.`,
      correction: 'Inspect the actual image boundaries and adjust centering or collimation deliberately.',
    },
    motion: {
      good: passed('breath'),
      evidence: `Respiration ${image.state.breathHeld ? 'suspended' : 'not suspended'} at capture; exposure ${image.state.exposureMs} ms. The motion model is approximate.`,
      correction: `Explain and coordinate a short ${getProtocol(image.state.protocol).region === 'abdomen' ? 'expiratory' : 'inspiratory'} hold when the system is ready.`,
    },
  };
  return CRITIQUE_FIELDS.map(field => {
    const status = states[field.id];
    const expected = status.good ? 'acceptable' : 'defect';
    const answer = answers[field.id] ?? null;
    return { id: field.id, title: field.title, expected, answer, correct: answer === expected, evidence: status.evidence, correction: status.correction };
  });
}

export function summarizeImageCritique(results: CritiqueResult[]): { correct: number; total: number; missed: CritiqueResult[] } {
  return { correct: results.filter(item => item.correct).length, total: results.length, missed: results.filter(item => !item.correct) };
}
