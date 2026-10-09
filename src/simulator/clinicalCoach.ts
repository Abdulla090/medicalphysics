import { calculateMetrics, getReadinessChecks } from './physics';
import { getProtocol } from './protocols';
import type { ClinicalCase, PreparationRecord, SimulatedAssessment } from './clinicalCases';
import type { GameStage } from './GameJourney';
import type { CapturedImage, SimulatorState } from './types';

export type CoachDomain = 'patient' | 'safety' | 'projection' | 'geometry' | 'technique' | 'receptor' | 'respiration';
export type CoachIssueId =
  | 'identity' | 'request' | 'screening' | 'artifacts' | 'communication' | 'gown' | 'hygiene'
  | 'protection' | 'detector' | 'protocol' | 'rotation' | 'centering' | 'coverage' | 'arms'
  | 'sid' | 'kvp' | 'mas' | 'respiration' | 'equipment';

export interface CoachIssue {
  id: CoachIssueId;
  domain: CoachDomain;
  severity: 'stop' | 'correct' | 'investigate';
  title: string;
  observed: string;
  mechanism: string;
  predictedImage: string;
  correctiveAction: string;
  verify: string;
  assessmentId?: string;
  patch?: Partial<SimulatorState>;
}

export interface CoachInput {
  clinicalCase: ClinicalCase;
  stage: GameStage;
  state: SimulatorState;
  preparation: PreparationRecord;
  patientPrepared?: boolean;
  hygieneDone?: boolean;
  doorSecured?: boolean;
}

export interface CoachAnalysis {
  issues: CoachIssue[];
  chiefIssue: CoachIssue | null;
  acquisitionBlocked: boolean;
  protocolName: string;
  mas: number;
  relativeExposure: number;
  magnification: number;
  geometricBlur: number;
  checksPassed: number;
  checksTotal: number;
  safetyConfirmed: boolean;
  readout: string;
}

export type CoachVariable = 'mas' | 'kvp' | 'sid' | 'rotation' | 'centering' | 'collimation';
export interface CoachExperiment {
  variable: CoachVariable;
  label: string;
  original: string;
  proposed: string;
  change: Partial<SimulatorState>;
  observations: string[];
  baselineFlags: string[];
  adjustedFlags: string[];
  relativeExposureRatio: number | null;
  geometricBlurRatio: number | null;
}

export interface CoachPrediction {
  caseId: ClinicalCase['id'];
  madeAt: number;
  retrospective: boolean;
  state: SimulatorState;
  issueId: CoachIssueId | 'none';
  selectedCorrection: CoachIssueId | 'observe';
  rationale: string;
  expectedImageFinding: string;
  chiefIssueId: CoachIssueId | 'none';
  issuesAtPrediction: CoachIssueId[];
}

export interface CoachDebrief {
  supported: 'confirmed' | 'not-observed' | 'resolved' | 'not-assessed';
  finding: string;
  explanation: string;
  corrections: string[];
  stateChanges: string[];
  assessmentScore: string | null;
  criticalFailures: string[];
  matchedCase: boolean;
}

export interface CoachSessionSummary {
  caseId: ClinicalCase['id'];
  predictionMade: boolean;
  targetRecognition: boolean;
  correctiveDecision: boolean;
  rationaleRecorded: boolean;
  imageDebriefCompleted: boolean;
  score: number;
  total: 100;
  feedback: string[];
  predictedIssue: CoachPrediction['issueId'] | null;
  observedOutcome: CoachDebrief['supported'] | null;
  imageAssessmentScore: number | null;
}

const issue = (id: CoachIssueId, domain: CoachDomain, severity: CoachIssue['severity'], title: string, observed: string, mechanism: string, predictedImage: string, correctiveAction: string, verify: string, assessmentId?: string, patch?: Partial<SimulatorState>): CoachIssue => ({ id, domain, severity, title, observed, mechanism, predictedImage, correctiveAction, verify, assessmentId, patch });
const inRange = (value: number, [low, high]: [number, number]) => Number.isFinite(value) && value >= low && value <= high;
const fmt = (value: number, decimals = 2) => Number.isFinite(value) ? value.toFixed(decimals) : '—';

/** Educational interpretation of simulator checks, never an automatic clinical clearance. */
export function analyzeCoach(input: CoachInput): CoachAnalysis {
  const { clinicalCase: clinical, state: s, preparation: p, patientPrepared, hygieneDone, doorSecured } = input;
  const checks = getReadinessChecks(s);
  const passed = (id: string) => checks.find(check => check.id === id)?.passed === true;
  const metric = calculateMetrics(s);
  const issues: CoachIssue[] = [];
  const add = (newIssue: CoachIssue, when: boolean) => { if (when) issues.push(newIssue); };
  const requested = getProtocol(clinical.requested);
  const isLateral = s.protocol === 'chest-lateral';
  const breathing = clinical.requested === 'abdomen-ap' ? 'expiration' : 'full inspiration';
  add(issue('identity', 'patient', 'stop', 'Identity unresolved', 'The simulated two-identifier check has not been recorded.', 'An otherwise high-quality image would still be associated with an unverified encounter.', 'A radiograph cannot correct a wrong-patient examination.', 'Ask for two independently stated identifiers and compare with the request.', 'Confirm the identity record before preparing the patient.', 'identity'), !p.identity);
  add(issue('request', 'patient', 'stop', 'Referral has not been checked', 'The requested examination and indication are not marked reviewed.', 'Technique must follow a verified question and projection, rather than equipment defaults.', 'The image could cover the wrong anatomy even when technically sharp.', `Review the indication and the requested ${requested.name} projection.`, 'Compare the selected projection with the documented request.', 'identity'), !p.request);
  add(issue('screening', 'safety', 'stop', 'Safety conversation incomplete', 'Relevant patient and justification questions are not recorded as complete.', 'Safety and examination appropriateness cannot be inferred from image appearance.', 'There is no image-quality substitute for appropriate screening.', clinical.id === 'abdominal-survey' ? 'Review the justification and any relevant pregnancy considerations under local policy.' : 'Check relevant safety, mobility and cooperation factors before positioning.', 'Confirm screening according to the local procedure.', 'identity'), !p.screening);
  add(issue('artifacts', 'patient', 'correct', 'Potential clothing artifacts', 'Removal of objects from the requested field has not been recorded.', 'Metal or dense personal items may project over important anatomy.', clinical.requested === 'abdomen-ap' ? 'Watch for belt and waist-fastener shadows over the abdominal field.' : 'Watch for necklaces or pocket objects projected onto the chest.', clinical.preparationNote, 'Inspect the image and patient clothing for superimposition.', 'identity'), !p.metals);
  add(issue('communication', 'patient', 'correct', 'Breathing instructions unconfirmed', 'Patient communication is not marked complete.', 'Breathing and cooperation influence motion and expected anatomy in this phantom.', `Breath-related motion may be visible if the ${breathing} instruction is not coordinated.`, `Explain the requested position and a brief ${breathing} hold before the acquisition.`, 'Confirm patient understanding and coordinate the instruction when ready.', 'identity'), !p.communication);
  add(issue('gown', 'patient', 'stop', 'Preparation workflow incomplete', 'The patient is not recorded as prepared for imaging.', 'Positioning should follow the approved privacy and gowning workflow.', 'Patient preparation cannot be inferred from the projected image.', 'Complete the gown and privacy workflow before imaging.', 'Verify the patient has changed and arrived for the examination.', 'identity'), patientPrepared === false);
  add(issue('hygiene', 'safety', 'stop', 'Hand hygiene not recorded', 'The room hygiene task has not been completed.', 'Patient-contact precautions are a workflow requirement, independent of exposure quality.', 'A clean radiograph does not demonstrate hand hygiene.', 'Complete hand hygiene before positioning the patient.', 'Confirm the hygiene station task is complete.', 'hygiene'), hygieneDone === false);
  if (s.protocol !== clinical.requested) issues.push(issue('protocol', 'projection', 'stop', 'Wrong projection selected', `Selected ${getProtocol(s.protocol).name}, but the fictional request specifies ${requested.name}.`, 'AP, PA and lateral projections are not interchangeable. Different structures overlap in each projection.', 'The requested image cannot be assumed equivalent to the wrong view.', `Return to the ${requested.name} protocol, then recheck positioning.`, 'Confirm protocol and projection labels.', 'protocol', { protocol: clinical.requested }));
  add(issue('rotation', 'geometry', 'correct', 'Rotation or tube angulation', `Patient rotation ${fmt(s.patientRotation, 1)}°; tube angle ${fmt(s.tubeAngle, 1)}°.`, 'Obliquity changes anatomical overlap and asymmetry; digital windowing cannot undo projection geometry.', isLateral ? 'Posterior rib contours may separate, limiting a true lateral view.' : 'Paired landmarks may appear asymmetrical and the mediastinal projection may change.', 'Return the patient and tube toward the intended neutral orientation, then re-evaluate light-field coverage.', 'Inspect rib/clavicle symmetry or posterior-rib superimposition on the actual image.', 'position', { patientRotation: 0, tubeAngle: 0 }), !passed('rotation'));
  add(issue('centering', 'geometry', 'correct', 'Patient displaced from beam center', `Lateral ${fmt(s.patientOffsetX, 1)} cm; longitudinal ${fmt(s.patientOffsetY, 1)} cm.`, 'An offset shifts anatomical landmarks toward detector and collimation edges.', 'Relevant structures can become clipped even if technique exposure is adequate.', 'Recenter the requested anatomical region and then inspect field boundaries.', 'Check whether the requested anatomy remains included at every edge.', 'position', { patientOffsetX: 0, patientOffsetY: 0 }), !passed('centering'));
  add(issue('coverage', 'geometry', 'correct', 'Coverage requires correction or review', `Field ${fmt(s.collimationWidth, 1)} × ${fmt(s.collimationHeight, 1)} cm; projected reference anatomy envelope fails the model check.`, 'Collimation, SID, centering and tube angle together determine which rays reach the anatomy.', clinical.requested === 'abdomen-ap' ? 'The requested abdominal boundary may be absent.' : 'A lung apex, base or other requested boundary may be absent.', 'Recenter first; review tube alignment, receptor and field limits. Widen only where anatomy requires it.', 'Inspect actual anatomical margins on the synthetic image. Passing the envelope estimate cannot prove adequate clinical coverage.', 'coverage'), !passed('coverage'));
  add(issue('arms', 'geometry', 'correct', 'Arms can obscure the lateral thorax', `Arm position is ${s.arms}, rather than raised.`, 'The humeri and shoulder tissues can project over the lateral thorax and retrocardiac region.', 'Upper-limb shadows may obscure the requested lateral anatomy.', 'Raise both arms as tolerated while maintaining a true lateral posture.', 'Inspect humeral shadows over the thorax.', 'position', { arms: 'raised' }), !passed('arms'));
  add(issue('sid', 'geometry', 'correct', 'SID outside this case range', `Current SID ${fmt(s.sid, 0)} cm; illustrative case range ${clinical.expected.sid[0]}–${clinical.expected.sid[1]} cm.`, 'Shorter SID generally increases geometric magnification and geometric unsharpness for a fixed object-to-detector gap; at fixed technique, detector fluence also changes with distance.', 'Compare relative projected size and edge definition before accepting.', 'Review the selected geometry and the relevant local protocol before changing SID.', 'Compare detector-plane magnification and blur readings in the simulator.', 'technique', { sid: Math.round((clinical.expected.sid[0] + clinical.expected.sid[1]) / 2) }), !inRange(s.sid, clinical.expected.sid));
  add(issue('kvp', 'technique', 'correct', 'Tube voltage outside illustrative range', `Current ${fmt(s.kvp, 0)} kVp; exercise interval ${clinical.expected.kvp[0]}–${clinical.expected.kvp[1]} kVp.`, 'Tube voltage affects beam energy, attenuation contrast and modeled detector fluence; it cannot correct a misplaced field.', 'Changes to density and subject contrast may coexist with other image-quality effects.', 'Review local exposure protocols and the patient model before selecting an appropriate kVp.', 'Compare synthetic projection appearance with other settings held constant.', 'technique', { kvp: Math.round((clinical.expected.kvp[0] + clinical.expected.kvp[1]) / 2) }), !inRange(s.kvp, clinical.expected.kvp));
  add(issue('mas', 'technique', 'correct', 'mAs outside illustrative range', `Current ${fmt(metric.mas)} mAs from ${fmt(s.ma, 0)} mA × ${fmt(s.exposureMs, 0)} ms; case interval ${clinical.expected.mas[0]}–${clinical.expected.mas[1]} mAs.`, 'This simulation uses mAs to vary relative photon fluence and stochastic image noise. Changing mAs does not remove rotation or restore clipped anatomy.', metric.mas < clinical.expected.mas[0] ? 'Expect more modeled quantum noise at a low mAs relative to otherwise identical higher-mAs runs.' : 'More mAs changes modeled noise but does not guarantee a better study and increases exposure in real radiography.', 'Review technique selection against the local protocol and clinical indication; avoid exposure changes solely to chase a game score.', 'With geometry unchanged, compare relative fluence and synthetic noise.', 'technique', { exposureMs: Math.min(2000, Math.max(1, Math.round((clinical.expected.mas[0] + clinical.expected.mas[1]) / 2 * 1000 / Math.max(1, s.ma)))) }), !inRange(metric.mas, clinical.expected.mas));
  add(issue('detector', 'receptor', 'stop', 'Detector not armed', 'The detector-ready interlock is off.', 'An unprepared digital receptor prevents image capture in this simulation.', 'There is no image to evaluate until the receptor is prepared.', 'Arm the receptor in the imaging room before proceeding to the control station.', 'Confirm the receptor-ready interlock.', 'detector'), !passed('detector'));
  add(issue('protection', 'safety', 'stop', 'Operator protection unresolved', 'Shielded operator position is not confirmed by the simulator.', 'An exposure must not be initiated from an unprotected operator position.', 'Image appearance provides no evidence of operator protection.', 'Enter the protected control room and close the lead access door.', 'Confirm both the actual door and protected position before exposure.', 'protection'), !passed('operator') || doorSecured === false);
  add(issue('respiration', 'respiration', 'correct', 'Breath hold not active', `The simulated ${breathing} breath hold is not active.`, 'The mathematical phantom adds respiratory motion blur when the breath hold is off.', clinical.requested === 'abdomen-ap' ? 'Abdominal margins may be longitudinally blurred.' : 'Lung inflation and edge sharpness may be reduced in the synthetic chest.', `Cue the patient to suspend respiration briefly after ${breathing} when ready to acquire.`, 'Inspect sharpness and, for chest, the lung-expansion appearance.', 'respiration'), !passed('breath'));
  add(issue('equipment', 'safety', 'stop', 'Invalid simulated equipment setting', 'A hardware range check failed.', 'The model cannot calculate a meaningful acquisition outside its supported parameter ranges.', 'No valid radiograph can be generated until supported limits are restored.', 'Restore finite values within the simulated equipment limits.', 'Confirm all blocking equipment interlocks.', 'technique'), !passed('parameters'));

  // Prioritize unresolved safety, then protocol, then anatomical quality, then technique.
  const priority: Record<CoachIssueId, number> = { identity: 0, request: 1, screening: 2, gown: 3, hygiene: 4, protection: 5, detector: 6, equipment: 7, protocol: 8, coverage: 9, centering: 10, rotation: 11, arms: 12, respiration: 13, artifacts: 14, communication: 15, sid: 16, kvp: 17, mas: 18 };
  issues.sort((a, b) => priority[a.id] - priority[b.id]);
  const blockers = checks.filter(check => check.blocking && !check.passed);
  const safetyConfirmed = p.identity && p.request && p.screening && patientPrepared !== false && hygieneDone !== false && doorSecured !== false && s.shielded;
  return {
    issues,
    chiefIssue: issues[0] ?? null,
    acquisitionBlocked: blockers.length > 0 || !safetyConfirmed || s.protocol !== clinical.requested,
    protocolName: getProtocol(s.protocol).name,
    mas: metric.mas,
    relativeExposure: metric.relativeExposure,
    magnification: metric.magnification,
    geometricBlur: metric.unsharpness,
    checksPassed: checks.filter(check => check.passed).length,
    checksTotal: checks.length,
    safetyConfirmed,
    readout: issues.length ? `${issues.filter(item => item.severity === 'stop').length} stop / ${issues.filter(item => item.severity === 'correct').length} review` : 'No model or workflow flags; image critique still required',
  };
}

const variableNames: Record<CoachVariable, string> = { mas: 'mAs ×2', kvp: 'Tube voltage +10 kVp', sid: 'SID +20 cm', rotation: 'Neutral rotation / angulation', centering: 'Return center to 0', collimation: 'Field width −4 cm' };
export const COACH_VARIABLES: CoachVariable[] = ['mas', 'kvp', 'sid', 'rotation', 'centering', 'collimation'];

/** One-factor what-if interventions. No equipment settings are applied by this function. */
export function experimentCoach(s: SimulatorState, variable: CoachVariable): CoachExperiment {
  let patch: Partial<SimulatorState>;
  switch (variable) {
    case 'mas': patch = { exposureMs: Math.min(2000, s.exposureMs * 2) }; break;
    case 'kvp': patch = { kvp: Math.min(150, s.kvp + 10) }; break;
    case 'sid': patch = { sid: Math.min(220, s.sid + 20) }; break;
    case 'rotation': patch = { patientRotation: 0, tubeAngle: 0 }; break;
    case 'centering': patch = { patientOffsetX: 0, patientOffsetY: 0 }; break;
    case 'collimation': patch = { collimationWidth: Math.max(5, s.collimationWidth - 4) }; break;
  }
  const changed = { ...s, ...patch };
  const before = calculateMetrics(s), after = calculateMetrics(changed);
  const beforeChecks = getReadinessChecks(s), afterChecks = getReadinessChecks(changed);
  const failed = (items: typeof beforeChecks) => items.filter(item => !item.passed && !item.blocking).map(item => item.id);
  const ratio = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && a > 0 ? b / a : null;
  const relativeExposureRatio = ratio(before.relativeExposure, after.relativeExposure);
  const geometricBlurRatio = ratio(before.unsharpness, after.unsharpness);
  const labels: Record<CoachVariable, string> = {
    mas: `${fmt(before.mas, 2)} → ${fmt(after.mas, 2)} mAs`,
    kvp: `${s.kvp} → ${changed.kvp} kVp`, sid: `${s.sid} → ${changed.sid} cm`, rotation: `${s.patientRotation}° / ${s.tubeAngle}° → 0° / 0°`,
    centering: `${s.patientOffsetX} / ${s.patientOffsetY} cm → 0 / 0 cm`, collimation: `${s.collimationWidth} → ${changed.collimationWidth} cm`,
  };
  const observations = [
    variable === 'mas' ? 'Changing exposure time changes mAs and modeled fluence; it does not reposition anatomy. Longer exposure time may increase motion vulnerability.'
      : variable === 'kvp' ? 'Tube voltage changes approximate beam spectrum, attenuation differences and modeled detector fluence; no calibrated image quality or dose estimate is produced.'
      : variable === 'sid' ? 'Longer SID generally reduces projected magnification and geometric unsharpness while reducing detector fluence for fixed technique, within this model.'
      : variable === 'rotation' ? 'Removing unintended angulation changes overlap and projection symmetry; confirm the clinical view requires neutral geometry.'
      : variable === 'centering' ? 'Recentering shifts the projected anatomy relative to the receptor and field; verify that anatomy boundaries remain included.'
      : 'Narrowing the field can limit scatter but may cut off required anatomy. Always verify the projected coverage, not just the field size.',
    relativeExposureRatio === null ? 'Relative detector fluence cannot be compared with these values.' : `Modeled detector fluence: ${fmt(relativeExposureRatio, 2)}× the starting setting (relative ratio, not patient dose).`,
    geometricBlurRatio === null ? 'Geometric blur cannot be compared with these values.' : `Modeled geometric unsharpness: ${fmt(geometricBlurRatio, 2)}× the starting setting.`,
  ];
  return { variable, label: variableNames[variable], original: variableNames[variable].split(' ×')[0], proposed: labels[variable], change: patch, observations, baselineFlags: failed(beforeChecks), adjustedFlags: failed(afterChecks), relativeExposureRatio, geometricBlurRatio };
}

export function createCoachPrediction(input: CoachInput, selectedIssue: CoachPrediction['issueId'], selectedCorrection: CoachPrediction['selectedCorrection'], rationale: string, expectedImageFinding: string, timestamp = Date.now(), retrospective = false): CoachPrediction {
  const analysis = analyzeCoach(input);
  return {
    caseId: input.clinicalCase.id, madeAt: timestamp, retrospective, state: { ...input.state }, issueId: selectedIssue,
    selectedCorrection, rationale: rationale.trim(), expectedImageFinding: expectedImageFinding.trim(),
    chiefIssueId: analysis.chiefIssue?.id ?? 'none', issuesAtPrediction: analysis.issues.map(item => item.id),
  };
}

const assessedIds: Record<CoachIssueId, string | null> = {
  identity: 'identity', request: null, screening: 'identity', artifacts: null, communication: null, gown: null,
  hygiene: 'hygiene', protection: 'protection', detector: 'detector', protocol: 'protocol', rotation: 'position', centering: 'position',
  coverage: 'coverage', arms: 'position', sid: 'technique', kvp: 'technique', mas: 'technique', respiration: 'respiration', equipment: 'technique',
};

/** Per-variable evidence avoids confusing an aggregate rubric failure with a specific cause. */
function capturedIssueSignal(id: CoachIssueId, clinical: ClinicalCase, state: SimulatorState, assessment: SimulatedAssessment): { failed: boolean; evidence: string } | null {
  const metrics = calculateMetrics(state);
  const checks = getReadinessChecks(state);
  const failedCheck = (key: string) => checks.find(item => item.id === key)?.passed !== true;
  const flaggedCritical = (text: string) => assessment.criticalFailures.some(item => item.toLowerCase().includes(text));
  switch (id) {
    case 'identity': return { failed: flaggedCritical('identity'), evidence: 'Patient identity verification on the captured exercise record' };
    case 'screening': return { failed: flaggedCritical('safety screening'), evidence: 'Safety screening on the captured exercise record' };
    case 'hygiene': return { failed: flaggedCritical('hand hygiene'), evidence: 'Hand hygiene on the captured exercise record' };
    case 'protection': return { failed: flaggedCritical('operator protection') || !state.shielded, evidence: 'Protected control-room workflow recorded at exposure' };
    case 'detector': return { failed: !state.detectorReady, evidence: 'Detector-ready state at capture' };
    case 'protocol': return { failed: state.protocol !== clinical.requested, evidence: `Requested ${getProtocol(clinical.requested).name}; captured ${getProtocol(state.protocol).name}` };
    case 'rotation': return { failed: failedCheck('rotation'), evidence: `Patient rotation ${fmt(state.patientRotation, 1)}° and tube angle ${fmt(state.tubeAngle, 1)}°` };
    case 'centering': return { failed: failedCheck('centering'), evidence: `Lateral ${fmt(state.patientOffsetX, 1)} cm and longitudinal ${fmt(state.patientOffsetY, 1)} cm offset` };
    case 'coverage': return { failed: failedCheck('coverage'), evidence: 'Simplified projected reference-anatomy envelope check' };
    case 'arms': return { failed: clinical.requested === 'chest-lateral' && state.arms !== 'raised', evidence: `Arms ${state.arms} in the requested lateral projection` };
    case 'sid': return { failed: !inRange(state.sid, clinical.expected.sid), evidence: `Captured SID ${fmt(state.sid,0)} cm; exercise interval ${clinical.expected.sid.join('–')} cm` };
    case 'kvp': return { failed: !inRange(state.kvp, clinical.expected.kvp), evidence: `Captured ${fmt(state.kvp,0)} kVp; exercise interval ${clinical.expected.kvp.join('–')} kVp` };
    case 'mas': return { failed: !inRange(metrics.mas, clinical.expected.mas), evidence: `Captured ${fmt(metrics.mas)} mAs; exercise interval ${clinical.expected.mas.join('–')} mAs` };
    case 'respiration': return { failed: !state.breathHeld, evidence: 'Breath-hold state recorded in the captured phantom' };
    case 'equipment': return { failed: failedCheck('parameters'), evidence: 'Simulated equipment parameter validity at capture' };
    default: return null;
  }
}

/** Compares the preserved learner prediction with the captured state and exercise rubric. */
export function debriefCoach(prediction: CoachPrediction, clinical: ClinicalCase, capture: CapturedImage | null, assessment: SimulatedAssessment | null): CoachDebrief {
  const valid = !!capture && clinical.id === prediction.caseId && !!assessment && assessment.caseId === clinical.id;
  if (!valid || !capture || !assessment) return { supported: 'not-assessed', finding: 'No matching captured examination and rubric are available.', explanation: 'Revisit your prediction after a completed synthetic acquisition. The coach cannot evaluate real radiographs or infer image abnormalities.', corrections: [], stateChanges: [], assessmentScore: null, criticalFailures: [], matchedCase: false };
  const matchingId = prediction.issueId === 'none' ? null : assessedIds[prediction.issueId];
  const matched = assessment.items.find(item => item.id === matchingId);
  const issueWasPresent = prediction.issueId !== 'none' && prediction.issuesAtPrediction.includes(prediction.issueId);
  const failed = !!matched && matched.earned < matched.points;
  const checks = getReadinessChecks(capture.state);
  const specific = prediction.issueId !== 'none' ? capturedIssueSignal(prediction.issueId, clinical, capture.state, assessment) : null;
  const fields: (keyof SimulatorState)[] = ['protocol','kvp','ma','exposureMs','sid','patientRotation','patientOffsetX','patientOffsetY','tubeAngle','collimationWidth','collimationHeight','arms','breathHeld','detectorReady','shielded'];
  const stateChanges = fields.filter(key => prediction.state[key] !== capture.state[key]).map(key => `${key}: ${String(prediction.state[key])} → ${String(capture.state[key])}`);
  let supported: CoachDebrief['supported'] = 'not-assessed';
  let finding: string;
  let explanation: string;
  if (prediction.issueId === 'none') {
    const defects = assessment.items.filter(item => item.earned < item.points);
    supported = defects.length ? 'not-observed' : 'confirmed';
    finding = defects.length ? `Your “no concern” prediction missed ${defects.length} scored workflow/technique flag(s).` : 'The exercise rubric recorded no failed items in this capture.';
    explanation = 'Even a complete rubric does not establish diagnostic acceptability. Inspect the synthetic image and the clinical request.';
  } else if (specific) {
    supported = specific.failed ? 'confirmed' : issueWasPresent ? 'resolved' : 'not-observed';
    finding = specific.failed ? `The captured setup still flags ${specific.evidence}.` : issueWasPresent ? `The earlier ${prediction.issueId} concern now passes its specific captured model check.` : `The selected ${prediction.issueId} concern was not flagged at either snapshot.`;
    explanation = `${specific.evidence}. ${matched ? `The overall ${matched.label.toLowerCase()} rubric item is ${matched.earned}/${matched.points}; its other constituent checks may still fail. ` : ''}${!specific.failed && stateChanges.length ? `Settings changed before capture: ${stateChanges.slice(0, 4).join('; ')}. ` : ''}Inspect the actual synthetic radiograph for the expected anatomical sign before concluding the image meets the request.`;
  } else if (!matched) {
    finding = 'This predicted concern was not directly evaluated by the captured rubric.';
    explanation = 'Do not infer a diagnostic finding from a model value without an observable image sign.';
  } else if (failed) {
    supported = 'confirmed';
    finding = `The captured rubric flags ${matched.label.toLowerCase()} (${matched.earned}/${matched.points} exercise points).`;
    explanation = matched.feedback;
  } else if (issueWasPresent) {
    supported = 'resolved';
    finding = `${matched.label} passes in the captured exercise; the predicted issue was present at your earlier snapshot.`;
    explanation = stateChanges.length ? `Settings changed before capture: ${stateChanges.slice(0, 4).join('; ')}. These changes may explain the improvement; inspect the image to verify.` : 'The captured rubric may reflect workflow changes that are not represented by a simple setting comparison.';
  } else {
    supported = 'not-observed';
    finding = `${matched.label} passes in the captured exercise; the chosen issue was not flagged at prediction time.`;
    explanation = 'Reconsider the evidence for your original hypothesis and compare the image with the request.';
  }
  const flagged = assessment.items.filter(item => item.earned < item.points);
  const corrections = flagged.map(item => item.feedback);
  if (!checks.find(item => item.id === 'coverage')?.passed && !corrections.some(line => /coverage/i.test(line))) corrections.push('Inspect the projected anatomy and collimation margins, even if the image appears sharp.');
  return { supported, finding, explanation, corrections, stateChanges, assessmentScore: `${assessment.score} / ${assessment.total}`, criticalFailures: assessment.criticalFailures, matchedCase: true };
}

/** Transparent exercise points for decisions and completion, not clinical competency. */
export function gradeCoachSession(prediction: CoachPrediction | null, debrief: CoachDebrief | null, imageAssessmentScore: number | null, reviewEvidence: string, inspected: readonly string[] = []): CoachSessionSummary {
  const prospective = !!prediction && !prediction.retrospective;
  const targetRecognition = prospective && prediction.issueId === prediction.chiefIssueId;
  const correctiveDecision = prospective && (prediction.chiefIssueId === 'none' ? prediction.selectedCorrection === 'observe' : prediction.selectedCorrection === prediction.chiefIssueId);
  const rationaleRecorded = prospective && prediction.rationale.trim().length >= 20 && prediction.expectedImageFinding.trim().length >= 12;
  const imageDebriefCompleted = !!debrief?.matchedCase && reviewEvidence.trim().length >= 25 && inspected.length >= 2;
  const score = (prospective ? 10 : 0) + (targetRecognition ? 25 : 0) + (correctiveDecision ? 25 : 0) + (rationaleRecorded ? 15 : 0) + (imageDebriefCompleted ? 25 : 0);
  const feedback = [
    !prediction ? 'Record an evidence-based prediction before acquisition.' : prediction.retrospective ? 'The prediction was recorded after capture; pre-exposure prediction points are unavailable. You can still earn debrief credit.' : !targetRecognition ? 'Your first concern did not match the most urgent flagged issue at the time. Review the priority of identity, safety and anatomy.' : 'Your initial priority matched the flagged concern.',
    !correctiveDecision ? 'State a correction directed at the predicted cause, or choose observation only when no flags are present.' : 'Your selected next action corresponds to the identified concern.',
    !rationaleRecorded ? 'Explain both the proposed physical mechanism and the visual sign you would expect to inspect.' : 'You recorded a testable mechanism and expected observation.',
    !imageDebriefCompleted ? 'After capture, inspect at least two image-quality dimensions and describe the evidence you actually observed.' : 'A post-capture critique was recorded. The simulator does not validate clinical image acceptability.',
  ];
  return { caseId: prediction?.caseId ?? 'outpatient-chest', predictionMade: !!prediction, targetRecognition, correctiveDecision, rationaleRecorded, imageDebriefCompleted, score, total: 100, feedback, predictedIssue: prediction?.issueId ?? null, observedOutcome: debrief?.supported ?? null, imageAssessmentScore };
}
