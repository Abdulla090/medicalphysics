import { calculateMetrics, getReadinessChecks } from './physics';
import { getProtocol } from './protocols';
import type { ProtocolId, SimulatorState } from './types';

/** Fictional case material for educational practice. None is patient data or clinical advice. */
export type CaseId = 'outpatient-chest' | 'lateral-followup' | 'abdominal-survey';
export type PreparationKey = 'identity' | 'request' | 'screening' | 'metals' | 'communication';
export type PreparationRecord = Record<PreparationKey, boolean>;
export const EMPTY_PREPARATION: PreparationRecord = {
  identity: false, request: false, screening: false, metals: false, communication: false,
};

export interface ClinicalCase {
  id: CaseId;
  accession: string;
  name: string;
  identifier: string;
  age: number;
  indication: string;
  clinicalContext: string;
  question: string;
  requested: ProtocolId;
  preparationNote: string;
  teachingFocus: string;
  expected: { kvp: [number, number]; sid: [number, number]; mas: [number, number] };
}

export const CLINICAL_CASES: ClinicalCase[] = [
  {
    id: 'outpatient-chest', accession: 'EDU-DR-2401', name: 'Alex Morgan', identifier: 'EDU 0417', age: 37,
    indication: 'Persistent cough • two weeks', clinicalContext: 'Ambulatory outpatient. Able to stand and follow breathing instructions. No acute distress reported.',
    question: 'Demonstrate adequate lung inclusion, positioning and a correctly timed exposure.',
    requested: 'chest-pa', preparationNote: 'Remove necklaces and chest pocket objects; explain breath-hold at inspiration.',
    teachingFocus: 'PA centering, erect positioning, full inspiration and deliberate collimation.',
    expected: { kvp: [100, 125], sid: [170, 200], mas: [1, 5] },
  },
  {
    id: 'lateral-followup', accession: 'EDU-DR-2402', name: 'Jordan Lee', identifier: 'EDU 0836', age: 56,
    indication: 'Follow-up of left basal opacity', clinicalContext: 'Ambulatory, comfortable standing. Requested lateral view as part of a follow-up examination.',
    question: 'Show the retrocardiac region without superimposed arms and minimize motion.',
    requested: 'chest-lateral', preparationNote: 'Check the request, remove jewelry and raise both arms before collimating the lung fields.',
    teachingFocus: 'True lateral posture, raised arms, field coverage and motion control.',
    expected: { kvp: [105, 135], sid: [170, 200], mas: [3, 14] },
  },
  {
    id: 'abdominal-survey', accession: 'EDU-DR-2403', name: 'Sam Taylor', identifier: 'EDU 1264', age: 29,
    indication: 'Non-specific abdominal pain', clinicalContext: 'Mobile outpatient requiring supine abdominal imaging. Radiation justification and pregnancy considerations must be reviewed according to local policy.',
    question: 'Demonstrate a justified, correctly centered AP abdominal projection with intentional coverage.',
    requested: 'abdomen-ap', preparationNote: 'Review pregnancy status where relevant, empty clothing pockets, remove metallic waist accessories and give an expiration breath instruction.',
    teachingFocus: 'Clinical justification, pregnancy screening, table setup and requested anatomical coverage.',
    expected: { kvp: [70, 95], sid: [90, 115], mas: [10, 30] },
  },
];

export const PREPARATION_ITEMS: { key: PreparationKey; title: string; detail: string }[] = [
  { key: 'identity', title: 'Match two patient identifiers', detail: 'Ask the patient to state their name and identifier; compare with the simulated request.' },
  { key: 'request', title: 'Confirm the request and indication', detail: 'Read the ordered view, clinical question, and any relevant mobility limits.' },
  { key: 'screening', title: 'Complete the safety conversation', detail: 'Review pregnancy considerations when relevant, consent, mobility and local justification requirements.' },
  { key: 'metals', title: 'Remove relevant artifacts', detail: 'Jewelry, metal fasteners or pocket items can obscure the requested anatomy.' },
  { key: 'communication', title: 'Explain positioning and breathing', detail: 'Tell the patient what you will do and how to cooperate, including the appropriate respiration instruction.' },
];

export interface AssessmentItem { id: string; label: string; points: number; earned: number; feedback: string }
export interface SimulatedAssessment {
  caseId: CaseId;
  score: number;
  total: number;
  items: AssessmentItem[];
  criticalFailures: string[];
  notes: string[];
}

/** Transparent exercise rubric. This is a teaching heuristic, not a clinical competency instrument. */
export function assessClinicalAttempt(
  clinicalCase: ClinicalCase,
  settings: SimulatorState,
  preparation: PreparationRecord,
  patientPrepared: boolean,
  doorSecuredAtExposure: boolean,
  hygieneDone = false,
): SimulatedAssessment {
  const metrics = calculateMetrics(settings);
  const checks = getReadinessChecks(settings);
  const check = (id: string) => checks.find(item => item.id === id)?.passed === true;
  const items: AssessmentItem[] = [];
  const record = (id: string, label: string, points: number, passed: boolean, feedback: string) => {
    items.push({ id, label, points, earned: passed ? points : 0, feedback });
  };
  const allVerified = PREPARATION_ITEMS.every(item => preparation[item.key]);
  const projectionMatch = settings.protocol === clinicalCase.requested;
  const { expected } = clinicalCase;
  const inRange = (value: number, bounds: [number, number]) => value >= bounds[0] && value <= bounds[1];

  record('identity', 'Identification and clinical preparation', 15, allVerified && patientPrepared, 'Review two identifiers, referral, safety screening, artifacts and patient communication before gowning.');
  record('hygiene', 'Infection prevention', 5, hygieneDone, 'Use the hand hygiene dispenser at the imaging room before preparing the synthetic patient.');
  record('protocol', 'Requested projection', 15, projectionMatch, `The request is ${getProtocol(clinicalCase.requested).name}. Compare the selected projection with the clinical indication.`);
  record('protection', 'Simulated operator protection', 15, doorSecuredAtExposure && settings.shielded, 'The operator must be inside the shielded room with its lead access door closed.');
  record('position', 'Centering and alignment', 15, check('centering') && check('rotation') && check('arms'), 'Recenter the patient, remove avoidable rotation and keep limbs clear of the field.');
  record('coverage', 'Anatomical coverage', 10, check('coverage'), 'Inspect collimator dimensions and whether the requested anatomy is fully included.');
  record('technique', 'Technique selection', 15, inRange(settings.kvp, expected.kvp) && inRange(settings.sid, expected.sid) && inRange(metrics.mas, expected.mas), 'Compare kVp, SID and mAs with the illustrative exercise ranges. Local clinical protocols take precedence.');
  record('detector', 'Receptor readiness', 5, settings.detectorReady, 'Check detector availability and any grid requirements before exposure.');
  record('respiration', 'Respiratory instruction', 5, settings.breathHeld, 'Give the correct respiratory instruction and assess motion in the resulting image.');

  const criticalFailures = [
    ...(!preparation.identity ? ['Patient identity was not verified.'] : []),
    ...(!preparation.screening ? ['Safety screening was not completed.'] : []),
    ...(!hygieneDone ? ['Hand hygiene was not completed before patient contact.'] : []),
    ...(!doorSecuredAtExposure || !settings.shielded ? ['Operator protection was incomplete.'] : []),
    ...(!projectionMatch ? ['The acquired projection differs from the request.'] : []),
  ];
  const notes = items.filter(item => item.earned === 0).map(item => item.feedback);
  return { caseId: clinicalCase.id, score: items.reduce((sum, item) => sum + item.earned, 0), total: items.reduce((sum, item) => sum + item.points, 0), items, criticalFailures, notes };
}
