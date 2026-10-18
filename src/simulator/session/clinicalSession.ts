import { z } from 'zod';
import { CLINICAL_CASES, EMPTY_PREPARATION, assessClinicalAttempt, type CaseId, type ClinicalCase, type PreparationRecord } from '../clinicalCases';
import { applyClinicalDialogue, createClinicalDialogue, getDialogueReadiness, type DialogueAction, type ClinicalDialogueSession } from '../clinicalDialogue';
import { applyProtocol, DEFAULT_STATE } from '../protocols';
import { getReadinessChecks } from '../physics';
import type { SimulatorState } from '../types';
import { DEPARTMENT_ANCHORS } from '../sceneManifest';

export const ENGINE_VERSION = 'analytical-phantom-1.1';
export const SESSION_VERSION = 1;
export type SessionMode = 'guided' | 'independent' | 'assessment';
export type ClinicalStage = 'registration' | 'changing' | 'escort' | 'position' | 'equipment' | 'exposure' | 'review' | 'handoff' | 'complete';
export type PatientLocation = 'waiting' | 'reception' | 'changing' | 'corridor' | 'imaging' | 'exit';
export const FESTIVAL_SKIP_STAGES = ['registration','changing','escort','position','equipment'] as const;
const protocol = z.enum(['chest-pa', 'chest-ap', 'chest-lateral', 'abdomen-ap', 'pelvis-ap']);
export const settingsSchema = z.object({
  protocol, kvp: z.number().min(40).max(150), ma: z.number().min(25).max(500),
  exposureMs: z.number().min(1).max(500), sid: z.number().min(80).max(200),
  tubeAngle: z.number().min(-30).max(30), collimationWidth: z.number().min(8).max(35), collimationHeight: z.number().min(8).max(43),
  patientRotation: z.number().min(-45).max(45), patientOffsetX: z.number().min(-15).max(15), patientOffsetY: z.number().min(-15).max(15),
  patientSize: z.number().min(.75).max(1.4), arms: z.enum(['down','raised','hips']), breathHeld: z.boolean(),
  grid: z.boolean(), focalSpot: z.union([z.literal(.6), z.literal(1.2)]), anatomy: z.enum(['surface','skeleton','organs']),
  lightField: z.boolean(), showLabels: z.boolean(), shielded: z.boolean(), detectorReady: z.boolean(),
}).strict();
const dialogueAction = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ask'), topic: z.enum(['name','identifier','reason','agreement','mobility','metals','pregnancy','explain','breathing','privacy']) }).strict(),
  z.object({ type: z.literal('transcribe'), field: z.enum(['name','identifier']), value: z.string().max(120) }).strict(),
  z.object({ type: z.literal('respond'), response: z.enum(['remove-metals','assist-mobility','reassure','refer-clinician','review-report','dismiss-concern']) }).strict(),
]);
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('festival-skip'), stage: z.enum(FESTIVAL_SKIP_STAGES) }).strict(),
  z.object({ type: z.literal('dialogue'), phase: z.enum(['registration','preparation']), action: dialogueAction }).strict(),
  z.object({ type: z.literal('register') }).strict(),
  z.object({ type: z.literal('call') }).strict(),
  z.object({ type: z.literal('escort'), destination: z.enum(['changing','corridor','imaging','exit']) }).strict(),
  z.object({ type: z.literal('arrived'), location: z.enum(['reception','changing','corridor','imaging','exit']) }).strict(),
  z.object({ type: z.literal('door'), door: z.enum(['changing','control']), closed: z.boolean() }).strict(),
  z.object({ type: z.literal('location'), x: z.number().min(-6.6).max(8.4), z: z.number().min(-3.25).max(12.25) }).strict(),
  z.object({ type: z.literal('gown') }).strict(),
  z.object({ type: z.literal('changed') }).strict(),
  z.object({ type: z.literal('hygiene') }).strict(),
  z.object({ type: z.literal('settings'), patch: settingsSchema.partial().omit({ shielded: true, breathHeld: true }) }).strict(),
  z.object({ type: z.literal('position') }).strict(),
  z.object({ type: z.literal('equipment') }).strict(),
  z.object({ type: z.literal('prepare') }).strict(),
  z.object({ type: z.literal('breathe') }).strict(),
  z.object({ type: z.literal('expose'), id: z.string().min(1).max(100), seed: z.number().int().min(0).max(4294967295) }).strict(),
  z.object({ type: z.literal('processed'), id: z.string().max(100), width: z.number().int().min(32).max(512), height: z.number().int().min(32).max(630) }).strict(),
  z.object({ type: z.literal('cancel') }).strict(),
  z.object({ type: z.literal('review'), id: z.string().max(100), decision: z.enum(['accept','repeat']), coverage: z.string().trim().min(5).max(1500), positioning: z.string().trim().min(5).max(1500), rationale: z.string().trim().min(10).max(3000) }).strict(),
  z.object({ type: z.literal('handoff'), explanation: z.string().trim().min(10).max(2000), notes: z.string().trim().min(10).max(3000) }).strict(),
  z.object({ type: z.literal('hint'), topic: z.string().max(120) }).strict(),
  z.object({ type: z.literal('submit') }).strict(),
]);
type ValidatedAction<A> = A extends { type?: 'dialogue' } ? { type:'dialogue'; phase:'registration'|'preparation'; action:DialogueAction }
  : A extends { type?: 'settings' } ? { type:'settings'; patch:Partial<Omit<SimulatorState,'shielded'|'breathHeld'>> }
  : Required<A>;
export type SessionAction = ValidatedAction<z.infer<typeof actionSchema>>;
export interface ActionEvidence { seq: number; at: number; action: SessionAction }
export interface AcquisitionRecord {
  id: string; seed: number; engineVersion: string; createdAt: number;
  state: SimulatorState; preparation: PreparationRecord; hygiene: boolean; doorSecured: boolean;
  status: 'processing' | 'ready' | 'canceled'; width?: number; height?: number;
  review?: Extract<SessionAction, { type: 'review' }>;
}
export interface ClinicalSession {
  version: 1; id: string; caseId: CaseId; caseSnapshot: ClinicalCase; caseVersion: number; rubricVersion: number;
  mode: SessionMode; stage: ClinicalStage; state: SimulatorState; createdAt: number;
  registration: ClinicalDialogueSession; preparationDialogue: ClinicalDialogueSession; preparation: PreparationRecord;
  registered: boolean; gownHanded: boolean; changed: boolean; hygiene: boolean;
  patientLocation: PatientLocation; destination: PatientLocation | null;
  player: { x: number; z: number }; doors: { changing: boolean; control: boolean };
  positionAdjusted: boolean; positionConfirmed: boolean; equipmentConfirmed: boolean; prepared: boolean; breathUntil: number;
  acquisitions: AcquisitionRecord[]; actions: ActionEvidence[];
  handoff: { explanation: string; notes: string } | null;
  submission: 'draft' | 'submitted'; hints: number;
}
export class SessionError extends Error {
  constructor(public code: string) { super(code); this.name = 'SessionError'; }
}
function requireAction(valid: unknown, code: string): asserts valid { if (!valid) throw new SessionError(code); }
export function clinicalCaseFor(id: CaseId) {
  const found = CLINICAL_CASES.find(item => item.id === id);
  if (!found) throw new SessionError('unknown-case');
  return found;
}
export function createSession(id: string, caseId: CaseId = 'outpatient-chest', mode: SessionMode = 'guided', at = Date.now(), caseVersion = 1, rubricVersion = 1): ClinicalSession {
  const clinicalCase = clinicalCaseFor(caseId);
  return {
    version: SESSION_VERSION, id, caseId, caseSnapshot: JSON.parse(JSON.stringify(clinicalCase)), caseVersion, rubricVersion, mode, stage: 'registration', createdAt: at,
    state: { ...applyProtocol(DEFAULT_STATE, clinicalCase.requested), showLabels: false, shielded: false, detectorReady: false, breathHeld: false, patientOffsetX: 3.5, patientOffsetY: -2.5, patientRotation: 7 },
    registration: createClinicalDialogue(clinicalCase,'registration'), preparationDialogue: createClinicalDialogue(clinicalCase,'preparation'),
    preparation: { ...EMPTY_PREPARATION }, registered: false, gownHanded: false, changed: false, hygiene: false,
    patientLocation: 'waiting', destination: null, player: { x: 7.75, z: 4.77 }, doors: { changing: false, control: false },
    positionAdjusted: false, positionConfirmed: false, equipmentConfirmed: false, prepared: false, breathUntil: 0,
    acquisitions: [], actions: [], handoff: null, submission: 'draft', hints: 0,
  };
}
export function isProtected(s: ClinicalSession) {
  return s.doors.control && s.player.x > 3.65 && s.player.x < 6.6 && s.player.z < 3.02 && s.player.z > -3.05;
}
const near = (s: ClinicalSession, x: number, z: number, radius = 2.5) => Math.hypot(s.player.x - x, s.player.z - z) < radius;
/** The student runs the check-in from the staff side of the counter. */
const atRegistrationStation = (s:ClinicalSession) => s.player.x > 7.25 && near(s,DEPARTMENT_ANCHORS.reception[0],DEPARTMENT_ANCHORS.reception[2],1.55);
export function pendingAcquisition(s: ClinicalSession) { return s.acquisitions.find(a => a.status === 'processing'); }
export function positioningChecks(state:SimulatorState){
  return getReadinessChecks(state).filter(c=>['centering','rotation','arms'].includes(c.id)).map(c=>c.id==='rotation'?{...c,passed:Math.abs(state.patientRotation)<=3}:c);
}
export function exposureBlockers(s: ClinicalSession, at: number) {
  return [
    ...(!s.registered ? ['identity-required'] : []),
    ...(!s.changed || !Object.values(s.preparation).every(Boolean) ? ['preparation-required'] : []),
    ...(!s.hygiene || s.patientLocation !== 'imaging' || !s.positionConfirmed ? ['position-required'] : []),
    ...(!s.equipmentConfirmed || !s.state.detectorReady ? ['detector-required'] : []),
    ...(!isProtected(s) ? ['protection-required'] : []),
    ...(s.state.protocol !== s.caseSnapshot.requested ? ['projection-mismatch'] : []),
    ...getReadinessChecks({ ...s.state, shielded: isProtected(s) }).filter(c => c.blocking && !c.passed).map(c => c.id),
    ...(s.prepared && at >= s.breathUntil ? ['breathing-required'] : []),
  ];
}
/** Same transition validator runs in the browser and Convex. Frame-rate and walking time never affect scores. */
export function applySessionAction(current: ClinicalSession, raw: SessionAction, at = Date.now()): ClinicalSession {
  const action = actionSchema.parse(raw) as SessionAction;
  requireAction(current.submission === 'draft', 'submitted-immutable');
  requireAction(Number.isFinite(at) && at >= (current.actions.at(-1)?.at ?? current.createdAt), 'invalid-time');
  requireAction(!pendingAcquisition(current) || ['processed','cancel'].includes(action.type), 'acquisition-busy');
  const s = { ...current, state: { ...current.state }, doors: { ...current.doors }, acquisitions: [...current.acquisitions] };
  const c = s.caseSnapshot;
  switch (action.type) {
    case 'festival-skip': {
      requireAction(s.mode !== 'assessment', 'assessment-skips-disabled');
      requireAction(s.stage === action.stage, 'skip-stage-mismatch');
      // A recorded demonstration shortcut, never evidence of student performance.
      s.destination = null; s.prepared = false; s.breathUntil = 0; s.state.breathHeld = false;
      if (action.stage === 'registration') {
        s.registered = true; s.preparation = { ...s.preparation, identity:true, request:true };
        s.patientLocation = 'changing'; s.player = {x:-4.6,z:4.85}; s.doors.changing = false; s.stage = 'changing';
      } else if (action.stage === 'changing') {
        s.gownHanded = true; s.changed = true;
        s.preparation = {identity:true,request:true,screening:true,metals:true,communication:true};
        s.patientLocation = 'changing'; s.player = {x:-2.9,z:4.85}; s.doors.changing = false; s.stage = 'escort';
      } else if (action.stage === 'escort') {
        s.patientLocation = 'imaging'; s.player = {x:1.5,z:0}; s.stage = 'position';
      } else if (action.stage === 'position') {
        const preset = applyProtocol(DEFAULT_STATE,c.requested);
        s.hygiene = true; s.positionAdjusted = true; s.positionConfirmed = true;
        s.state = {...s.state,patientOffsetX:0,patientOffsetY:0,patientRotation:0,arms:preset.arms};
        s.stage = 'equipment';
      } else {
        s.state = {...applyProtocol(s.state,c.requested),detectorReady:true,breathHeld:false};
        s.equipmentConfirmed = true; s.doors.control = true; s.player = {x:5.1,z:0}; s.stage = 'exposure';
      }
      s.state.shielded = isProtected(s);
      break;
    }
    case 'location':
      s.player = { x: action.x, z: action.z }; s.state.shielded = isProtected(s);
      if (!s.state.shielded) s.prepared = false;
      break;
    case 'dialogue': {
      requireAction(action.phase === 'registration' ? s.stage === 'registration' && s.patientLocation === 'reception' && !s.destination && atRegistrationStation(s) : s.stage === 'changing' && s.patientLocation === 'changing' && s.player.x < -3.55 && !s.doors.changing, 'dialogue-unreachable');
      const key = action.phase === 'registration' ? 'registration' : 'preparationDialogue';
      s[key] = applyClinicalDialogue(c, s[key], action.action);
      break;
    }
    case 'call':
      requireAction(s.stage === 'registration' && s.patientLocation === 'waiting' && !s.destination && atRegistrationStation(s), 'patient-not-ready');
      s.destination = 'reception';
      break;
    case 'register':
      requireAction(s.stage === 'registration' && s.patientLocation === 'reception' && !s.destination && atRegistrationStation(s) && getDialogueReadiness(c,s.registration).ready, 'identity-required');
      s.registered = true; s.preparation = { ...s.preparation, identity: true, request: true }; s.stage = 'changing';
      break;
    case 'escort': {
      const allowed = action.destination === 'changing' ? s.registered && s.patientLocation === 'reception'
        : action.destination === 'corridor' ? s.changed && s.patientLocation === 'changing' && !s.doors.changing
        : action.destination === 'imaging' ? s.changed && s.patientLocation === 'corridor' && near(s,2.2,3.28)
        : s.stage === 'handoff' && !!s.handoff && s.patientLocation === 'imaging';
      requireAction(allowed && !s.destination, 'escort-not-ready');
      s.destination = action.destination; break;
    }
    case 'arrived':
      requireAction(s.destination === action.location, 'arrival-unrequested');
      requireAction(!['changing','corridor'].includes(action.location) || !s.doors.changing, 'door-closed');
      s.patientLocation = action.location; s.destination = null;
      if (action.location === 'imaging') s.stage = 'position';
      if (action.location === 'exit') s.stage = 'complete';
      break;
    case 'door':
      requireAction(action.door === 'changing' ? near(s,-3.44,4.85) : near(s,5.12,3.22), 'door-unreachable');
      s.doors[action.door] = action.closed; s.state.shielded = isProtected(s); s.prepared = false; break;
    case 'gown': {
      const ready = getDialogueReadiness(c,s.preparationDialogue);
      requireAction(s.stage === 'changing' && s.patientLocation === 'changing' && !s.doors.changing && s.player.x < -3.55 && ready.ready, 'preparation-required');
      s.gownHanded = true;
      s.preparation = { ...s.preparation, screening: ready.preparation.screening, metals: ready.preparation.metals, communication: ready.preparation.communication }; break;
    }
    case 'changed':
      requireAction(s.gownHanded && s.doors.changing && s.player.x > -3.2 && s.patientLocation === 'changing', 'privacy-required');
      s.changed = true; s.stage = 'escort'; break;
    case 'hygiene':
      requireAction(near(s,-1.08,-3.13,2), 'hygiene-unreachable'); s.hygiene = true; break;
    case 'settings': {
      requireAction(!['review','handoff','complete'].includes(s.stage), 'review-before-adjustment');
      const keys = Object.keys(action.patch).filter(k => action.patch[k as keyof typeof action.patch] !== s.state[k as keyof SimulatorState]);
      const positioning = keys.some(k => ['patientRotation','patientOffsetX','patientOffsetY','patientSize','arms'].includes(k));
      if (positioning) requireAction(s.hygiene && s.patientLocation === 'imaging' && ['position','equipment','exposure'].includes(s.stage), 'position-required');
      s.state = settingsSchema.parse({ ...s.state, ...action.patch }) as SimulatorState;
      if (positioning) { s.positionAdjusted = true; s.positionConfirmed = false; s.stage = 'position'; }
      if (keys.some(k => !['anatomy','lightField','showLabels'].includes(k))) {
        s.equipmentConfirmed = false; s.prepared = false; s.breathUntil = 0; s.state.breathHeld = false;
        if (s.stage === 'exposure') s.stage = 'equipment';
      }
      break;
    }
    case 'position':
      requireAction(s.stage === 'position' && s.hygiene && s.patientLocation === 'imaging', 'position-required');
      // A repeat for technique does not require inventing a patient movement.
      // Tube angulation belongs to equipment setup, which follows this station.
      requireAction(positioningChecks(s.state).every(c => c.passed), 'alignment-required');
      s.positionConfirmed = true; s.stage = 'equipment'; break;
    case 'equipment':
      requireAction(s.stage === 'equipment' && s.positionConfirmed && s.state.detectorReady && s.state.protocol === c.requested, 'detector-required');
      s.equipmentConfirmed = true; s.stage = 'exposure'; break;
    case 'prepare':
      requireAction(s.stage === 'exposure' && exposureBlockers({ ...s, prepared: false }, at).length === 0, 'protection-required');
      s.prepared = true; s.breathUntil = 0; break;
    case 'breathe':
      requireAction(s.stage === 'exposure' && s.prepared && isProtected(s), 'prepare-required');
      s.breathUntil = at + (s.state.protocol === 'abdomen-ap' ? 9000 : 12000); s.state.breathHeld = true; break;
    case 'expose':
      requireAction(s.stage === 'exposure' && s.prepared && exposureBlockers(s,at).length === 0, 'exposure-blocked');
      requireAction(!s.acquisitions.some(a => a.id === action.id), 'duplicate-acquisition');
      s.acquisitions.push({ id: action.id, seed: action.seed, engineVersion: ENGINE_VERSION, createdAt: at,
        state: { ...s.state, shielded: true, breathHeld: true }, preparation: { ...s.preparation }, hygiene: s.hygiene, doorSecured: s.doors.control, status: 'processing' });
      s.prepared = false; break;
    case 'processed': {
      const pending = pendingAcquisition(s);
      requireAction(pending?.id === action.id && action.height === Math.round(action.width * 43 / 35), 'stale-acquisition');
      s.acquisitions = s.acquisitions.map(a => a.id === action.id ? { ...a, status: 'ready', width: action.width, height: action.height } : a);
      s.stage = 'review'; s.breathUntil = 0; s.state.breathHeld = false; break;
    }
    case 'cancel':
      s.acquisitions = s.acquisitions.map(a => a.status === 'processing' ? { ...a, status: 'canceled' } : a);
      s.prepared = false; s.breathUntil = 0; s.state.breathHeld = false; break;
    case 'review': {
      const last = s.acquisitions.at(-1);
      requireAction(s.stage === 'review' && last?.id === action.id && last.status === 'ready' && !last.review, 'review-required');
      s.acquisitions = s.acquisitions.map(a => a.id === action.id ? { ...a, review: action } : a);
      s.stage = action.decision === 'accept' ? 'handoff' : 'position';
      if (action.decision === 'repeat') { s.positionConfirmed = false; s.positionAdjusted = false; s.equipmentConfirmed = false; s.state.detectorReady = false; }
      break;
    }
    case 'handoff':
      requireAction(s.stage === 'handoff' && s.patientLocation === 'imaging' && s.player.x < 3.2 && s.player.z < 3.2, 'handoff-unreachable');
      s.handoff = { explanation: action.explanation, notes: action.notes }; break;
    case 'hint':
      requireAction(s.mode !== 'assessment', 'assessment-hints-disabled'); s.hints += 1; break;
    case 'submit':
      requireAction(s.stage === 'complete' && s.patientLocation === 'exit' && !!s.handoff, 'handoff-required');
      s.submission = 'submitted'; break;
  }
  s.actions = [...current.actions, { seq: current.actions.length, at, action }];
  return s;
}
export function replaySession(initial: ClinicalSession, events: ActionEvidence[]) {
  let session = initial;
  for (const event of events) {
    requireAction(event.seq === session.actions.length, 'revision-conflict');
    session = applySessionAction(session,event.action,event.at);
  }
  return session;
}
export function provisionalAssessment(s: ClinicalSession) {
  const accepted = [...s.acquisitions].reverse().find(a => a.review?.decision === 'accept');
  if (!accepted) throw new SessionError('review-required');
  return assessClinicalAttempt(s.caseSnapshot, accepted.state, accepted.preparation, s.changed, accepted.doorSecured, accepted.hygiene);
}
