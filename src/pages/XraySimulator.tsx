import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowUpIcon, ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, CameraIcon, CheckIcon, ChevronRightIcon, Cross2Icon, CubeIcon,
  DownloadIcon, EnterFullScreenIcon, EyeOpenIcon, FileTextIcon, InfoCircledIcon,
  LayersIcon, LightningBoltIcon, MixerHorizontalIcon, PersonIcon, PlayIcon,
  QuestionMarkCircledIcon, ResetIcon, SpeakerLoudIcon, SpeakerOffIcon, SunIcon, TargetIcon,
} from '@radix-ui/react-icons';
import { AnatomyGlyph, Parameter, Toggle } from '@/simulator/Controls';
import { applyProtocol, DEFAULT_STATE, getProtocol, PROTOCOLS } from '@/simulator/protocols';
import { analyzeRadiographQuality, calculateMetrics, getReadinessChecks, renderPixelsToCanvas } from '@/simulator/physics';
import type { AnatomyView, CameraView, CapturedImage, ProtocolId, SimulatorState } from '@/simulator/types';
import { getWorldTargets, type WorldTargetId } from '@/simulator/worldInteraction';
import type { WorldAction } from '@/simulator/WorldInteractions';
import { assessClinicalAttempt, CLINICAL_CASES, EMPTY_PREPARATION, type CaseId, type PreparationRecord, type SimulatedAssessment } from '@/simulator/clinicalCases';
import { playClinicalCue } from '@/simulator/clinicalAudio';
import { PhysicsWorkshop, type PhysicsTopic } from '@/simulator/PhysicsWorkshop';
import { GAME_OBJECTIVES, GAME_STAGE_ORDER, getGameStage } from '@/simulator/GameJourney';
import { GameHUD, PositionUI, GameExposure, CaseInformation } from '@/simulator/GameUI';
import { ClinicalConversation } from '@/simulator/ClinicalConversation';
import { ClinicalTeachingPanel } from '@/simulator/ClinicalTeachingPanel';
import { ClinicalCoach } from '@/simulator/ClinicalCoach.tsx';
import { ImageCritiqueStation } from '@/simulator/ImageCritiqueStation';
import type { ClinicalDialogueOutcome, ClinicalDialogueSession } from '@/simulator/clinicalDialogue';
import '@/simulator/simulator.css';
import '@/simulator/campus.css';
import '@/simulator/clinical.css';
import '@/simulator/workshop.css';
import '@/simulator/game.css';

const XrayScene = lazy(() => import('@/simulator/XrayScene'));
const RadiographViewer = lazy(() => import('@/simulator/RadiographViewer'));
type ConsoleTab = 'exposure' | 'position' | 'patient';
const CONSOLE_TABS: ConsoleTab[] = ['exposure', 'position', 'patient'];
const ROOM_DIALS = [
  { key: 'kvp', label: 'Tube voltage', unit: 'kVp', step: 1, min: 40, max: 150 },
  { key: 'ma', label: 'Tube current', unit: 'mA', step: 25, min: 25, max: 500 },
  { key: 'exposureMs', label: 'Exposure time', unit: 'ms', step: 1, min: 1, max: 500 },
  { key: 'collimationWidth', label: 'Field width', unit: 'cm', step: 1, min: 8, max: 35 },
  { key: 'collimationHeight', label: 'Field height', unit: 'cm', step: 1, min: 8, max: 43 },
] as const;
type AcquisitionPhase = 'idle' | 'prepared' | 'exposing';
type InfoPanel = 'help' | 'model' | 'positioning' | null;
type GamePanel = 'registration' | 'changing' | 'position' | 'exposure' | 'review' | null;
type TrainingEvent = { id: string; at: string; caseId: CaseId; label: string; detail: string; kind: 'workflow' | 'safety' | 'image' };

const CAMERA_VIEWS: { id: CameraView; label: string; icon: typeof CubeIcon }[] = [
  { id: 'room', label: 'Room', icon: CubeIcon },
  { id: 'patient', label: 'Patient', icon: PersonIcon },
  { id: 'tube', label: 'Tube', icon: TargetIcon },
  { id: 'detector', label: 'Detector', icon: LayersIcon },
];

function InfoDialog({ panel, onClose, state, game = false, onRestart }: { panel: InfoPanel; onClose: () => void; state: SimulatorState; game?: boolean; onRestart?: () => void }) {
  return <Dialog.Root open={!!panel} onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className="sim-dialog-overlay" /><Dialog.Content className="sim-info-dialog sim-font" dir="ltr">
      <div className="sim-dialog-heading"><span className="sim-eyebrow">MEDICALPHYSICS / RADIOGRAPHY STUDIO</span><Dialog.Close className="sim-icon-button" aria-label="Close information"><Cross2Icon /></Dialog.Close></div>
      <Dialog.Title>{panel === 'help' ? game ? 'Your clinical shift' : 'Your room. Your controls.' : panel === 'positioning' ? getProtocol(state.protocol).description : 'The model behind the image'}</Dialog.Title>
      <Dialog.Description>{panel === 'help' ? 'Move around the room, position the synthetic patient, and acquire a radiograph.' : panel === 'positioning' ? 'Positioning guidance for this training projection. Adapt real examinations to local protocols and the clinical indication.' : 'An inspectable analytical simulation with explicit limits.'}</Dialog.Description>
      {panel === 'help' && game ? <div className="sim-help-content">
        <ol><li><strong>Register.</strong> Approach the reception counter and press E to check the patient identity and requested examination.</li><li><strong>Change clothing.</strong> Follow the patient to the changing room. Close the privacy door and provide a hospital gown.</li><li><strong>Escort.</strong> Return to the X-ray entrance and call the prepared patient in.</li><li><strong>Position.</strong> Let the patient reach the equipment, then approach and manually adjust centering, rotation, and breathing instruction.</li><li><strong>Expose.</strong> Enter the radiographer control room, secure the lead door, and use the workstation to make an exposure.</li><li><strong>Review.</strong> Inspect the synthetic image and start the next patient.</li></ol>
        <div className="sim-key-guide"><div><kbd>W A S D</kbd><span>Walk / arrow keys</span></div><div><kbd>Drag</kbd><span>Look around</span></div><div><kbd>E</kbd><span>Use nearby equipment</span></div><div><kbd>Esc</kbd><span>Release mouse look</span></div></div>
        <button className="sim-outline-button" onClick={() => { onRestart?.(); onClose(); }}>Restart current shift</button>
      </div> : panel === 'help' ? <div className="sim-help-content">
        <ol><li><strong>Prepare the patient.</strong> Use the rear doorway into the clinical corridor, enter the changing room on the left, close its privacy door, and press E at the gown station. Reopen the door to return to imaging.</li><li><strong>Position the patient.</strong> Hold and drag the patient or tube. Shift-drag rotates. At the patient, R changes the arms and B changes the breathing instruction.</li><li><strong>Prepare the equipment.</strong> Arm the detector with E. Aim at the tube to adjust beam or select a dial with T and the wheel; N changes the examination at a station.</li><li><strong>Enter the separate shielded room.</strong> From the corridor, take the radiographer control-room door on the right. Close its door, approach the console, and press E to prepare, then E again to acquire. V opens the latest synthetic image.</li></ol>
        <div className="sim-key-guide"><div><kbd>W A S D</kbd><span>Walk / arrow keys also work</span></div><div><kbd>Shift / C</kbd><span>Move faster / crouch</span></div><div><kbd>Hold + drag</kbd><span>Move nearby patient or tube</span></div><div><kbd>Shift + drag</kbd><span>Rotate patient or tube</span></div><div><kbd>E / T / wheel</kbd><span>Use / select dial / adjust</span></div><div><kbd>Esc</kbd><span>Release mouse look / close review</span></div></div>
        <p>Drag empty room space to look without mouse lock. On touch screens, use the movement pad, drag equipment to position it, and tap nearby doors and controls. Room, Patient, Tube and Detector provide inspection views. Technique reference shows numeric settings. This is an educational simulation: protection and interlocks are simplified.</p>
      </div> : panel === 'positioning' ? <ol className="sim-position-guide">{getProtocol(state.protocol).positioning.map((step) => <li key={step}>{step}</li>)}</ol> : <div className="sim-model-content">
        <div className="sim-model-banner"><InfoCircledIcon /><p><strong>Training model · clinical validation pending</strong><br />This version cannot support a claim of 100% anatomical or diagnostic accuracy.</p></div>
        <h3>What drives the radiograph</h3><p>Divergent rays intersect a procedural volumetric phantom. Material attenuation, beam energy, mAs, source distance, patient rotation, collimation, and image noise affect acquisition. The 3D internals and projection engine share the same anatomy definitions.</p>
        <h3>Reference physics</h3><p>Attenuation coefficients use the <a href="https://physics.nist.gov/PhysRefData/XrayMassCoef/ComTab/tissue.html" target="_blank" rel="noreferrer">NIST soft tissue</a> and <a href="https://physics.nist.gov/PhysRefData/XrayMassCoef/ComTab/bone.html" target="_blank" rel="noreferrer">cortical bone</a> tables. Geometry follows the principles described in the <a href="https://www-pub.iaea.org/MTCD/Publications/PDF/Pub1564webNew-74666420.pdf" target="_blank" rel="noreferrer">IAEA Diagnostic Radiology Physics handbook</a>.</p>
        <h3>What remains approximate</h3><p>The anatomy is a synthetic mathematical phantom. The tube spectrum, scatter, grid transmission, detector response, and motion models are approximations. Exposure presets are illustrative. Relative exposure is a model ratio; no calibrated patient dose is reported.</p>
        <h3>Before hospital adoption</h3><p>Validate against measured equipment output, licensed patient anatomy or CT phantoms, reference images, detector response, and local positioning protocols with radiographers and medical physicists. Record tolerances and independent acceptance results.</p>
      </div>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}

function ShiftLogDialog({ open, onClose, onExport, events, clinicalCase, assessment, captures }: {
  open: boolean; onClose: () => void; onExport: () => void; events: TrainingEvent[];
  clinicalCase: (typeof CLINICAL_CASES)[number]; assessment: SimulatedAssessment | null; captures: number;
}) {
  return <Dialog.Root open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="sim-dialog-overlay" />
      <Dialog.Content className="sim-shift-dialog sim-font" dir="ltr" aria-describedby="sim-shift-description">
        <div className="sim-shift-topline"><span className="sim-eyebrow">RADIOGRAPHY CAMPUS / TRAINING RECORD</span><Dialog.Close className="sim-icon-button" aria-label="Close shift record"><Cross2Icon /></Dialog.Close></div>
        <Dialog.Title>Clinical shift record</Dialog.Title>
        <Dialog.Description id="sim-shift-description">Review the simulated decisions and observations recorded during your practice session.</Dialog.Description>
        <div className="sim-shift-summary">
          <div><span>CURRENT ENCOUNTER</span><strong>{clinicalCase.accession}</strong><small>{getProtocol(clinicalCase.requested).name}</small></div>
          <div><span>IMAGE ACQUISITIONS</span><strong>{String(captures).padStart(2, '0')}</strong><small>Stored this session</small></div>
          <div><span>LAST EXERCISE RUBRIC</span><strong>{assessment ? `${assessment.score} / ${assessment.total}` : '—'}</strong><small>{assessment ? 'Teaching heuristic only' : 'Awaiting image review'}</small></div>
        </div>
        <div className="sim-shift-heading"><h3>Encounter timeline</h3><span>{events.length} recorded events</span></div>
        {events.length ? <ol className="sim-shift-events">{[...events].reverse().map(event => <li key={event.id}>
          <span className={`sim-shift-event-mark is-${event.kind}`}><CheckIcon /></span>
          <div><span className="sim-shift-event-time">{new Date(event.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {event.kind.toUpperCase()}</span><strong>{event.label}</strong><p>{event.detail}</p></div>
        </li>)}</ol> : <div className="sim-shift-empty">No clinical actions logged yet. Register a training patient at reception to begin the record.</div>}
        <div className="sim-shift-foot"><p>Fictional encounters and synthetic radiographs. Scores are for learning feedback and are not a clinical competency certification.</p><button className="sim-shift-export" onClick={onExport}><DownloadIcon /> Export complete session JSON</button></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function WalkPad() {
  const send = (direction: 'forward' | 'backward' | 'left' | 'right', pressed: boolean) => window.dispatchEvent(new CustomEvent('xray-walk', { detail: { direction, pressed } }));
  return <div className="sim-walk-pad" aria-label="First person movement controls">
    {([{ direction: 'forward', icon: ArrowUpIcon }, { direction: 'left', icon: ArrowLeftIcon }, { direction: 'backward', icon: ArrowDownIcon }, { direction: 'right', icon: ArrowRightIcon }] as const).map(({ direction, icon: Icon }) => <button key={direction} className={`sim-walk-${direction}`} aria-label={`Walk ${direction}`} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); send(direction, true); }} onPointerUp={(event) => { send(direction, false); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => send(direction, false)} onLostPointerCapture={() => send(direction, false)} onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); send(direction, true); } }} onKeyUp={() => send(direction, false)} onBlur={() => send(direction, false)}><Icon /></button>)}
  </div>;
}

export default function XraySimulator() {
  const [state, setState] = useState<SimulatorState>({ ...DEFAULT_STATE, showLabels: false, shielded: false });
  const [tab, setTab] = useState<ConsoleTab>('exposure');
  const [view, setView] = useState<CameraView>('first-person');
  const [cameraReset, setCameraReset] = useState(0);
  const [phase, setPhase] = useState<AcquisitionPhase>('idle');
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [reviewImage, setReviewImage] = useState<CapturedImage | null>(null);
  const [info, setInfo] = useState<InfoPanel>(null);
  const [error, setError] = useState('');
  const [walking, setWalking] = useState(false);
  const [hoveredTarget, setHoveredTarget] = useState<WorldTargetId | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<WorldTargetId | null>(null);
  const [barrierClosed, setBarrierClosed] = useState(false);
  const [changingDoorClosed, setChangingDoorClosed] = useState(false);
  const [patientPrepared, setPatientPrepared] = useState(false);
  const [gownHanded, setGownHanded] = useState(false);
  const [hygieneDone, setHygieneDone] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [patientInRoom, setPatientInRoom] = useState(false);
  const [patientAtChanging, setPatientAtChanging] = useState(false);
  const [patientAtCorridor, setPatientAtCorridor] = useState(false);
  const [patientAtImaging, setPatientAtImaging] = useState(false);
  const [positionAdjusted, setPositionAdjusted] = useState(false);
  const [positionConfirmed, setPositionConfirmed] = useState(false);
  const [caseCaptured, setCaseCaptured] = useState<CapturedImage | null>(null);
  const [breathHoldUntil, setBreathHoldUntil] = useState(0);
  const [gamePanel, setGamePanel] = useState<GamePanel>(null);
  const [registrationDialogue, setRegistrationDialogue] = useState<ClinicalDialogueSession | null>(null);
  const [preparationDialogue, setPreparationDialogue] = useState<ClinicalDialogueSession | null>(null);
  const [caseInfoOpen, setCaseInfoOpen] = useState(false);
  const [roomAudio, setRoomAudio] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState<CaseId>('outpatient-chest');
  const [preparation, setPreparation] = useState<PreparationRecord>({ ...EMPTY_PREPARATION });
  const [workshopTopic, setWorkshopTopic] = useState<PhysicsTopic | null>(null);
  const [currentZone, setCurrentZone] = useState('Imaging room');
  const [assessments, setAssessments] = useState<Record<string, SimulatedAssessment>>({});
  const [pointerLocked, setPointerLocked] = useState(false);
  const [holding, setHolding] = useState(false);
  const [guided, setGuided] = useState(true);
  const [shiftLogOpen, setShiftLogOpen] = useState(false);
  const [teachingOpen, setTeachingOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [trainingEvents, setTrainingEvents] = useState<TrainingEvent[]>([]);
  const [roomDial, setRoomDial] = useState(0);
  const [status, setStatus] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const captureRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breathTimerRef = useRef<number | null>(null);
  const breathExpiryRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const protocol = getProtocol(state.protocol);
  const clinicalCase = CLINICAL_CASES.find(item => item.id === activeCaseId)!;
  const metrics = calculateMetrics(state);
  const immersive = view === 'first-person';
  const gameStage = getGameStage({ registered, changed: patientPrepared, escorted: patientInRoom, positioned: positionConfirmed, acquired: !!caseCaptured });
  const checks = getReadinessChecks(state);
  const blocked = checks.some((check) => check.blocking && !check.passed) || (immersive && (!registered || !patientPrepared || !patientInRoom || !positionConfirmed));
  const warnings = checks.filter((check) => !check.passed && !check.blocking);
  const busy = phase === 'exposing';
  const target = getWorldTargets(state).find((item) => item.id === (hoveredTarget ?? (holding ? selectedTarget : null)));
  const dial = ROOM_DIALS[roomDial];
  const currentEvents = trainingEvents.filter(event => event.caseId === activeCaseId);
  const latestAssessment = caseCaptured ? assessments[caseCaptured.id] ?? null : null;

  const logTrainingEvent = useCallback((label: string, detail: string, kind: TrainingEvent['kind'] = 'workflow', caseId: CaseId = activeCaseId) => {
    setTrainingEvents(previous => [...previous, { id: `${Date.now()}-${previous.length}`, at: new Date().toISOString(), caseId, label, detail, kind }].slice(-120));
  }, [activeCaseId]);


  useEffect(() => {
    const location = (event: Event) => {
      const detail = (event as CustomEvent<{ zone?: string }>).detail;
      const zone = detail?.zone;
      if (zone) setCurrentZone(previous => previous === zone ? previous : zone);
    };
    window.addEventListener('xray-location', location);
    return () => window.removeEventListener('xray-location', location);
  }, []);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(''), 5500);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    // Dressing is private: hand over a gown, step into the corridor and close
    // the door. The actor changes clothes only after all three conditions hold.
    if (!gownHanded || patientPrepared || !changingDoorClosed || currentZone === 'Patient changing room') return;
    const timer = window.setTimeout(() => {
      setPatientPrepared(true);
      setPreparation(previous => ({ ...previous, metals: true }));
      setStatus('The patient has changed privately. Reopen the door and guide them to Imaging 01.');
      logTrainingEvent('Private preparation completed', 'Gown change completed after the clinician left and closed the privacy door.');
      playClinicalCue('confirm', roomAudio);
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [gownHanded, patientPrepared, changingDoorClosed, currentZone, roomAudio, logTrainingEvent]);

  useEffect(() => {
    const arrived = (event: Event) => {
      const destination = (event as CustomEvent<string>).detail;
      if (destination === 'changing') {
        setPatientAtChanging(true);
        setStatus('The patient has arrived at the changing room. Enter and close the privacy door.');
      }
      if (destination === 'imaging') {
        setPatientAtImaging(true);
        setStatus('The patient is at the X-ray equipment. Position them manually.');
      }
      if (destination === 'corridor') {
        setPatientAtCorridor(true);
        setStatus('The patient is waiting outside the changing room. Call them into Imaging 01.');
      }
    };
    window.addEventListener('xray-patient-arrived', arrived);
    return () => window.removeEventListener('xray-patient-arrived', arrived);
  }, []);

  useEffect(() => {
    const lock = () => setPointerLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', lock);
    return () => document.removeEventListener('pointerlockchange', lock);
  }, []);

  useEffect(() => {
    if (info || reviewImage || workshopTopic || gamePanel || caseInfoOpen || shiftLogOpen || teachingOpen || coachOpen || !immersive) {
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }, [info, reviewImage, workshopTopic, gamePanel, caseInfoOpen, shiftLogOpen, teachingOpen, coachOpen, immersive]);

  useEffect(() => {
    // Inspection views keep their standalone virtual console; first-person
    // protection is recomputed only from the actual operator's room position.
    setState((previous) => previous.shielded === !immersive ? previous : { ...previous, shielded: !immersive });
  }, [immersive]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Radiography Studio · MedicalPhysics';
    return () => { document.title = previousTitle; workerRef.current?.terminate(); if (timeoutRef.current) clearTimeout(timeoutRef.current); if (breathTimerRef.current) clearTimeout(breathTimerRef.current); };
  }, []);

  const resetBreathing = () => {
    if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
    breathTimerRef.current = null;
    breathExpiryRef.current = 0;
    setBreathHoldUntil(0);
    setState(previous => previous.breathHeld ? { ...previous, breathHeld: false } : previous);
  };

  const issueBreathInstruction = () => {
    if (!immersive || gameStage !== 'exposure' || !state.shielded || !barrierClosed || phase !== 'prepared') return;
    if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
    // Fixed windows make the exercise reproducible; this is an educational
    // approximation of communication and cooperation, not patient physiology.
    const seconds = state.protocol === 'abdomen-ap' ? 9 : 12;
    const expiry = Date.now() + seconds * 1000;
    breathExpiryRef.current = expiry;
    setBreathHoldUntil(expiry);
    setState(previous => ({ ...previous, breathHeld: true }));
    setStatus(state.protocol === 'abdomen-ap' ? 'Patient responds: I have breathed out, holding still.' : 'Patient responds: I have taken a deep breath, holding still.');
    breathTimerRef.current = window.setTimeout(() => {
      breathExpiryRef.current = 0;
      setBreathHoldUntil(0);
      setState(previous => ({ ...previous, breathHeld: false }));
      setStatus('The patient has resumed normal breathing. Repeat the breathing instruction before exposure.');
    }, seconds * 1000);
  };

  const update = useCallback(<K extends keyof SimulatorState>(key: K, value: SimulatorState[K]) => {
    setState((previous) => ({ ...previous, [key]: value }));
    if (['protocol', 'patientRotation', 'patientOffsetX', 'patientOffsetY', 'tubeAngle', 'arms'].includes(key)) setPositionConfirmed(false);
    setPhase('idle');
    setError('');
    if (!immersive || !gamePanel) setStatus('Settings updated. Prepare exposure to continue.');
  }, [immersive, gamePanel]);

  const selectProtocol = (id: ProtocolId) => {
    if (busy) return;
    setState((previous) => applyProtocol(previous, id));
    setPositionConfirmed(false);
    setPhase('idle');
    setError('');
    setStatus(`${getProtocol(id).name} selected. Check positioning before exposure.`);
    if (!immersive) setCameraReset((value) => value + 1);
  };

  const selectClinicalCase = (id: CaseId) => {
    if (busy) return;
    const next = CLINICAL_CASES.find(item => item.id === id);
    if (!next) return;
    setActiveCaseId(id);
    logTrainingEvent('Encounter assigned', `${next.accession} · ${getProtocol(next.requested).name} · ${next.indication}`, 'workflow', id);
    setRegistered(false);
    setPatientInRoom(false);
    setPatientAtChanging(false);
    setPatientAtCorridor(false);
    setPatientAtImaging(false);
    setPositionAdjusted(false);
    setPositionConfirmed(false);
    setCaseCaptured(null);
    resetBreathing();
    setRegistrationDialogue(null);
    setPreparationDialogue(null);
    setPreparation({ ...EMPTY_PREPARATION });
    setCaseInfoOpen(false);
    setPatientPrepared(false);
    setGownHanded(false);
    setHygieneDone(false);
    setChangingDoorClosed(false);
    setBarrierClosed(false);
    setState(applyProtocol({ ...DEFAULT_STATE, shielded: !immersive, detectorReady: !immersive, breathHeld: false }, next.requested));
    setCameraReset(previous => previous + 1);
    setPhase('idle');
    setStatus(`${next.accession} assigned. Verify the request and prepare the patient.`);
    playClinicalCue('confirm', roomAudio);
  };

  const registerPatient = (outcome: ClinicalDialogueOutcome) => {
    if (outcome.phase !== 'registration' || outcome.caseId !== activeCaseId || !outcome.preparation.identity || !outcome.preparation.request) return;
    setRegistered(true);
    // Each training patient arrives slightly off-center, making deliberate
    // centering and rotation essential instead of rewarding a token click.
    setState(previous => ({ ...previous, detectorReady: false, breathHeld: false, patientOffsetX: 3.5, patientOffsetY: -2.5, patientRotation: 7 }));
    setPreparation(outcome.preparation);
    setGamePanel(null);
    setCaseInfoOpen(false);
    setStatus(`${clinicalCase.name} registered. Take the patient to the private changing room.`);
    logTrainingEvent('Identity and order verified', `${clinicalCase.accession} · synthetic patient registration completed.`);
    playClinicalCue('confirm', roomAudio);
  };

  const dialogueChanged = (phase: 'registration' | 'preparation', next: ClinicalDialogueSession) => {
    if (phase === 'registration') setRegistrationDialogue(next);
    else setPreparationDialogue(next);
    if (!roomAudio || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const latest = next.turns[next.turns.length - 1];
    if (!latest || (latest.speaker !== 'patient' && latest.speaker !== 'clinician')) return;
    try {
      const voice = new SpeechSynthesisUtterance(latest.message);
      voice.lang = 'en-US';
      voice.rate = latest.speaker === 'patient' ? 0.94 : 0.98;
      voice.pitch = latest.speaker === 'patient' ? 1.03 : 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(voice);
    } catch { /* Transcript remains available when local speech synthesis is missing. */ }
  };
  const closePatientDialogue = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setGamePanel(null);
  };

  const gownPatient = (outcome: ClinicalDialogueOutcome) => {
    if (outcome.phase !== 'preparation' || outcome.caseId !== activeCaseId || !outcome.preparation.screening || !outcome.preparation.metals || !outcome.preparation.communication) return;
    if (!registered || !patientAtChanging || changingDoorClosed || currentZone !== 'Patient changing room') return;
    setGownHanded(true);
    setPreparation(previous => ({ ...previous, screening: outcome.preparation.screening, communication: outcome.preparation.communication, metals: outcome.preparation.metals }));
    setGamePanel(null);
    setStatus('Gown handed over. Leave the room, close the privacy door and wait for the patient to finish changing.');
    logTrainingEvent('Patient preparation explained', 'Safety screening, communication and metallic object removal addressed before gown handover.');
    playClinicalCue('confirm', roomAudio);
  };

  const failCapture = (message: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    captureRef.current = null;
    workerRef.current?.terminate();
    workerRef.current = null;
    setPhase('idle');
    setError(message);
    setStatus('Acquisition stopped. Review the error before retrying.');
  };

  const acquire = () => {
    if (immersive && phase === 'prepared' && (breathExpiryRef.current <= Date.now() || !state.breathHeld)) {
      setStatus('The patient is breathing normally. Give the requested breathing instruction via the intercom.');
      return;
    }
    if (immersive && state.protocol !== clinicalCase.requested) {
      setStatus('The selected projection differs from the requested clinical examination. Correct it before exposure.');
      playClinicalCue('warning', roomAudio);
      return;
    }
    if (busy || blocked) {
      if (immersive && !positionConfirmed) { setStatus('Position the patient and confirm before acquiring.'); }
      else if (immersive && !patientPrepared) setStatus('First prepare the patient in the private changing room.');
      return;
    }
    if (phase === 'idle') {
      setPhase('prepared');
      setStatus('Exposure prepared. The next press acquires the synthetic image.');
      playClinicalCue('confirm', roomAudio);
      return;
    }
    const snapshot = { ...state };
    const id = `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
    captureRef.current = id;
    setPhase('exposing');
    setError('');
    setStatus('Acquiring the projected image…');
    playClinicalCue('exposure', roomAudio);
    try {
      workerRef.current?.terminate();
      const worker = new Worker(new URL('../simulator/radiograph.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      timeoutRef.current = setTimeout(() => failCapture('The acquisition timed out. Try again or use a device with more available memory.'), 30000);
      worker.onerror = () => { if (captureRef.current === id) failCapture('The image engine could not complete this acquisition. Please retry.'); };
      worker.onmessage = (event: MessageEvent<{ id: string; pixels?: Uint16Array; width?: number; height?: number; error?: string }>) => {
        if (event.data.id !== captureRef.current) return;
        if (event.data.error || !event.data.pixels || !event.data.width || !event.data.height) { failCapture(event.data.error ?? 'The engine returned an incomplete image.'); return; }
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        try {
          const { pixels, width, height } = event.data;
          const preview = document.createElement('canvas');
          renderPixelsToCanvas(pixels, width, height, preview);
          const image: CapturedImage = { id, createdAt: Date.now(), state: snapshot, metrics: calculateMetrics(snapshot), pixels, width, height, previewUrl: preview.toDataURL('image/png'), warnings: getReadinessChecks(snapshot).filter((check) => !check.passed).map((check) => check.detail) };
          if (immersive) {
            const assessment = assessClinicalAttempt(clinicalCase, snapshot, preparation, patientPrepared, barrierClosed, hygieneDone);
            setAssessments(previous => ({ ...previous, [id]: assessment }));
            logTrainingEvent('Radiograph acquired', `${getProtocol(snapshot.protocol).name} · ${snapshot.kvp} kVp · ${calculateMetrics(snapshot).mas.toFixed(2)} mAs · technical assessment ${assessment.score}/${assessment.total}.`, 'image');
          }
          setImages((previous) => [image, ...previous].slice(0, 8));
          if (immersive) {
            setCaseCaptured(image);
            setGamePanel('review');
            resetBreathing();
          }
          setPhase('idle');
          setStatus(`${getProtocol(snapshot.protocol).name} acquired. Open the image below to review.`);
          captureRef.current = null;
          worker.terminate();
          workerRef.current = null;
        } catch { failCapture('The image was calculated but could not be displayed. Please retry.'); }
      };
      worker.postMessage({ id, state: snapshot, seed: crypto.getRandomValues(new Uint32Array(1))[0], width: 512 });
    } catch { failCapture('This browser could not start the image worker. Use a current browser with Web Worker support.'); }
  };

  const cancelCapture = () => {
    captureRef.current = null;
    workerRef.current?.terminate();
    workerRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPhase('idle');
    setStatus('Acquisition canceled.');
  };

  const reset = () => {
    if (busy) return;
    resetBreathing();
    setState(applyProtocol({ ...DEFAULT_STATE, shielded: !immersive, detectorReady: !immersive, breathHeld: false }, state.protocol));
    setBarrierClosed(false);
    setChangingDoorClosed(false);
    setPatientPrepared(false);
    setGownHanded(false);
    setRegistered(false);
    setPatientInRoom(false);
    setPatientAtChanging(false);
    setPatientAtCorridor(false);
    setPatientAtImaging(false);
    setPositionAdjusted(false);
    setPositionConfirmed(false);
    setCaseCaptured(null);
    setRegistrationDialogue(null);
    setPreparationDialogue(null);
    setGamePanel(null);
    setCaseInfoOpen(false);
    setHygieneDone(false);
    setPreparation({ ...EMPTY_PREPARATION });
    setPhase('idle'); setError(''); setCameraReset((value) => value + 1);
    setStatus('Examination settings and room view reset.');
  };

  const exportSession = () => {
    const data = { model: 'MedicalPhysics analytical phantom v1', purpose: 'Synthetic training simulation', exportedAt: new Date().toISOString(), clinicalCase: { accession: clinicalCase.accession, id: clinicalCase.id }, workflow: { verifiedItems: preparation, hygieneDone, patientPrepared, controlRoomDoorClosed: barrierClosed, changingDoorClosed }, trainingEvents, settings: state, captures: images.map(({ id, createdAt, state: settings, metrics: captureMetrics, pixels, width, height, warnings: observations }) => ({ id, createdAt: new Date(createdAt).toISOString(), settings, metrics: captureMetrics, width, height, observations, educationalImageQuality: analyzeRadiographQuality(settings, pixels, width, height), exerciseAssessment: assessments[id] })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `medicalphysics-session-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Session settings and acquisition metadata exported.');
  };

  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await viewportRef.current?.closest('.sim-app')?.requestFullscreen(); }
    catch { setError('Fullscreen is unavailable in this browser. The room is still interactive.'); }
  };

  const selectObject = useCallback((part: 'patient' | 'tube' | 'detector' | 'table') => {
    if (immersive) { window.dispatchEvent(new CustomEvent('xray-select-object', { detail: part })); return; }
    setTab(part === 'patient' ? 'patient' : part === 'tube' ? 'exposure' : 'position');
    setStatus(`${part.charAt(0).toUpperCase() + part.slice(1)} selected in the operator console.`);
  }, [immersive]);

  const protectionChanged = useCallback((protectedPosition: boolean) => {
    setState((previous) => previous.shielded === protectedPosition ? previous : { ...previous, shielded: protectedPosition });
    if (!protectedPosition) setPhase((previous) => previous === 'prepared' ? 'idle' : previous);
  }, []);

  const manipulate = useCallback((next: SimulatorState) => {
    setState(next); setPositionAdjusted(true); setPositionConfirmed(false); setPhase('idle'); setError('');
    setStatus('Positioning changed in the room. Check the light field and receptor coverage.');
  }, []);

  const worldAction = (id: WorldTargetId, action: WorldAction) => {
    if (busy) return;
    if (immersive && id === 'patient' && (gameStage !== 'position' || !patientAtImaging || !hygieneDone)) {
      setStatus(!hygieneDone ? 'Perform hand hygiene before interacting with the patient.' : 'Complete the preceding clinical stage before repositioning the patient.');
      return;
    }
    if (immersive && action === 'use') {
      if (id === 'registration') {
        if (gameStage === 'registration') setGamePanel('registration');
        else setStatus('This patient is already checked in. Continue your current objective.');
        return;
      }
      if (id === 'changing-booth') {
        if (!registered) { setStatus('Register the patient at reception first.'); return; }
        if (gameStage !== 'changing') { setStatus('The patient has already changed.'); return; }
        if (gownHanded) { setStatus('Give the patient privacy: go outside and close the changing-room door.'); return; }
        if (!patientAtChanging) { setStatus('Wait for the patient to arrive at the changing room.'); return; }
        setGamePanel('changing'); return;
      }
      if (id === 'patient-arrival') {
        if (gameStage === 'escort' && changingDoorClosed) { setStatus('Open the changing-room door first. The patient cannot walk through a closed door.'); return; }
        if (gameStage === 'escort' && !patientAtCorridor) { setStatus('Wait for the patient to reach the clinical corridor.'); return; }
        if (gameStage === 'escort') { setPatientInRoom(true); logTrainingEvent('Patient escorted', 'Patient invited from the clinical corridor into Imaging 01.'); setStatus('Patient called to Imaging 01. Wait until they reach the equipment, then position them.'); playClinicalCue('confirm', roomAudio); }
        else setStatus(gameStage === 'registration' || gameStage === 'changing' ? 'Complete registration and gown preparation first.' : 'The patient has already entered Imaging 01.');
        return;
      }
      if (id === 'patient' && gameStage === 'position') {
        if (!patientAtImaging) { setStatus('Wait for the patient to arrive at the X-ray equipment.'); return; }
        if (!hygieneDone) { setStatus('Use the hand-hygiene dispenser before contacting the patient.'); return; }
        setGamePanel('position'); return;
      }
      if (id === 'console') {
        if (gameStage !== 'exposure') { setStatus(gameStage === 'review' ? 'Examination complete. Review the image.' : 'Bring the patient in and confirm their positioning first.'); return; }
        if (!state.shielded || !barrierClosed) { setStatus('Enter the shielded room and close the lead door behind you.'); return; }
        setGamePanel('exposure'); return;
      }
    }
    const arms = () => update('arms', state.arms === 'down' ? 'hips' : state.arms === 'hips' ? 'raised' : 'down');
    if (action === 'review') { if (images[0]) setReviewImage(images[0]); return; }
    if (action === 'light') { update('lightField', !state.lightField); return; }
    if (action === 'grid' && (id === 'tube' || id === 'detector' || id === 'console')) { update('grid', !state.grid); return; }
    if (action === 'focal' && (id === 'tube' || id === 'console')) { update('focalSpot', state.focalSpot === 0.6 ? 1.2 : 0.6); return; }
    if (action === 'breath' && id === 'patient') { update('breathHeld', !state.breathHeld); return; }
    if (action === 'pose' && id === 'patient') { arms(); return; }
    if ((action === 'girth-up' || action === 'girth-down') && id === 'patient') { update('patientSize', Math.max(0.75, Math.min(1.4, Number((state.patientSize + (action === 'girth-up' ? 0.05 : -0.05)).toFixed(2))))); return; }
    if (action === 'parameter' && (id === 'tube' || id === 'console')) { setRoomDial((previous) => (previous + 1) % ROOM_DIALS.length); return; }
    if ((action === 'wheel-up' || action === 'wheel-down') && (id === 'tube' || id === 'console')) { update(dial.key, Math.max(dial.min, Math.min(dial.max, state[dial.key] + (action === 'wheel-up' ? dial.step : -dial.step)))); return; }
    if (action === 'protocol') {
      const choices: ProtocolId[] = id === 'table' ? ['chest-ap', 'abdomen-ap', 'pelvis-ap'] : id === 'detector' || id === 'stand' ? ['chest-pa', 'chest-lateral'] : id === 'console' ? PROTOCOLS.map((item) => item.id) : [];
      if (choices.length) selectProtocol(choices[(choices.indexOf(state.protocol) + 1) % choices.length]);
      return;
    }
    if (action !== 'use') return;
    if (id === 'physics-distance' || id === 'physics-sharpness' || id === 'physics-field') {
      setWorkshopTopic(id.replace('physics-', '') as PhysicsTopic);
      setStatus('Physics workshop opened. Adjust values and then compare a new synthetic acquisition.');
      return;
    }
    if (id === 'hygiene') { setHygieneDone(true); if (!hygieneDone) logTrainingEvent('Hand hygiene performed', 'Dispenser used before direct patient positioning.'); playClinicalCue('confirm', roomAudio); setStatus('Hand hygiene completed. Continue with patient positioning.'); }
    else if (id === 'changing-door') { playClinicalCue('door', roomAudio); setChangingDoorClosed((previous) => !previous); setStatus(changingDoorClosed ? 'Patient changing room opened. Return to Imaging 01.' : 'Changing room privacy door closed. Prepare the patient at the gown station.'); }
    else if (id === 'changing-booth') {
      setStatus('Register the patient first, then prepare them in the private changing room.');
    }
    else if (id === 'control-door' || id === 'barrier') {
      playClinicalCue('door', roomAudio);
      setBarrierClosed((previous) => !previous);
      if (barrierClosed) setState((previous) => ({ ...previous, shielded: false }));
      setPhase('idle');
      setStatus(barrierClosed ? 'Control-room door opened. Enter the shielded room.' : 'Control-room door closed. Approach the workstation to prepare an exposure.');
    }
    else if (id === 'patient') arms();
    else if (id === 'tube') update('lightField', !state.lightField);
    else if (id === 'detector') update('detectorReady', !state.detectorReady);
    else if (id === 'table') { if (protocol.position === 'erect') selectProtocol('chest-ap'); else setStatus('Patient on the table. Drag to position; N changes the supine examination.'); }
    else if (id === 'stand') selectProtocol('chest-pa');
    else if (id === 'console') {
      if (!patientPrepared) { playClinicalCue('warning', roomAudio); setStatus('Prepare the patient before exposure.'); return; }
      if (!state.shielded || !barrierClosed) { playClinicalCue('warning', roomAudio); setStatus('Enter the shielded control room and close its lead door before preparing exposure.'); return; }
      if (!state.detectorReady) { setStatus('Arm the digital detector in the room before preparing exposure.'); return; }
      acquire();
    }
  };

  const interactionLabel = !target ? null
    : target.id === 'registration' && gameStage === 'registration' ? 'Register patient'
    : target.id === 'changing-door' && (gameStage === 'changing' || gameStage === 'escort') ? changingDoorClosed ? 'Open changing-room door' : 'Close changing-room door'
    : target.id === 'changing-booth' && gameStage === 'changing' && !gownHanded ? 'Prepare the patient'
    : target.id === 'patient-arrival' && gameStage === 'escort' ? 'Call patient into X-ray'
    : target.id === 'patient' && gameStage === 'position' ? 'Position patient'
    : target.id === 'control-door' && gameStage === 'exposure' ? barrierClosed ? 'Open lead door' : 'Close lead door'
    : target.id === 'console' && gameStage === 'exposure' ? 'Use X-ray console'
    : target.id === 'detector' && gameStage === 'exposure' ? 'Prepare detector'
    : null;

  return <div className={`sim-app sim-font ${immersive ? 'is-immersive is-game' : ''}`} dir="ltr" lang="en" data-exposure-state={phase} data-game-stage={gameStage} data-learning-mode={guided ? 'guided' : 'independent'}>
    <header className="sim-topbar">
      <Link to="/" className="sim-brand" aria-label="Back to MedicalPhysics"><span className="sim-brand-symbol"><svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M6 6h6v6H6zM16 6h6v6h-6zM6 16h6v6H6z" fill="currentColor" /><path d="m16 19 3-3 3 3-3 3-3-3Z" stroke="currentColor" strokeWidth="2" /></svg></span><span>medical<span>physics</span></span></Link>
      <div className="sim-top-divider" /><span className="sim-workspace-title">Radiography campus</span>
      <span className="sim-training-badge"><span />Student environment</span>
      {immersive && <nav className="sim-shift-navigation" aria-label="Clinical shift tools">
        <span className="sim-shift-location"><span className="sim-shift-live-light" /> IMAGING / {GAME_OBJECTIVES[gameStage].destination}</span>
        <button type="button" className="sim-shift-nav-primary" aria-label="Open radiography coach" onClick={() => setCoachOpen(true)}><TargetIcon /><span>OSCE coach</span></button>
        <button type="button" aria-label="Open clinical instructor" onClick={() => setTeachingOpen(true)}><FileTextIcon /><span>Course</span></button>
        <button type="button" aria-label="View shift record" onClick={() => setShiftLogOpen(true)}><LayersIcon /><span>Training record</span></button>
        <button type="button" aria-label="Open inspection studio" onClick={() => setView('room')}><CubeIcon /><span>Imaging lab</span></button>
      </nav>}
      <div className="sim-top-actions"><button className="sim-text-button" aria-label="Model & validation" onClick={() => setInfo('model')}><InfoCircledIcon /><span>Model & validation</span></button><button className="sim-icon-button" aria-label="Simulator help" onClick={() => setInfo('help')}><QuestionMarkCircledIcon /></button><span className="sim-avatar" aria-label="MedicalPhysics workspace">MP</span></div>
    </header>

    <div className="sim-titlebar"><div><div className="sim-breadcrumb"><Link to="/tools">Tools</Link><ChevronRightIcon /><span>X-ray simulator</span></div><h1>Radiography studio<span className="sim-version">01</span></h1></div><div className="sim-mode-switch" aria-label="Learning mode"><button aria-label="Guided practice" aria-pressed={guided} className={guided ? 'is-active' : ''} onClick={() => setGuided(true)}><FileTextIcon /><span>Guided practice</span></button><button aria-label="Independent practice" aria-pressed={!guided} className={!guided ? 'is-active' : ''} onClick={() => { setGuided(false); setView('first-person'); }}><EyeOpenIcon /><span>Practice solo</span></button></div><div className="sim-title-actions"><button className="sim-outline-button sim-instructor-trigger" aria-label="Open radiography coach" onClick={() => setCoachOpen(true)}><TargetIcon /><span>Radiography coach</span></button><button className="sim-outline-button" aria-label="Open clinical instructor" onClick={() => setTeachingOpen(true)}><QuestionMarkCircledIcon /><span>Course</span></button><button className="sim-outline-button" aria-label="View shift record" onClick={() => setShiftLogOpen(true)}><FileTextIcon /><span>Shift log</span></button><button className="sim-outline-button" aria-label="Reset room" onClick={reset} disabled={busy}><ResetIcon /><span>Reset room</span></button><button className="sim-outline-button" aria-label="Export session" onClick={exportSession}><DownloadIcon /><span>Export session</span></button></div></div>

    <div className="sim-workspace">
      <aside className="sim-exam-panel" aria-label="Examination selection">
        <div className="sim-panel-heading"><span className="sim-section-label">EXAMINATION</span><span className="sim-small-count">05</span></div>
        <div className="sim-exam-list">{PROTOCOLS.map((item) => <button key={item.id} disabled={busy} className={`sim-exam ${state.protocol === item.id ? 'is-active' : ''}`} onClick={() => selectProtocol(item.id)} aria-pressed={state.protocol === item.id}><AnatomyGlyph region={item.region} className="sim-exam-glyph" /><span><strong>{item.name}</strong><small>{item.position === 'erect' ? 'Standing' : 'Supine'} · {item.projection === 'LAT' ? 'Lateral' : item.projection}</small></span>{state.protocol === item.id ? <span className="sim-exam-selected"><CheckIcon /></span> : <ChevronRightIcon className="sim-exam-chevron" />}</button>)}</div>
        <button className="sim-positioning-link" onClick={() => setInfo('positioning')}><FileTextIcon />Positioning guide<ChevronRightIcon /></button>
        {guided && <section className="sim-mentor-brief" aria-label="Clinical learning objective">
          <div className="sim-mentor-brief-top"><span>CLINICAL INSTRUCTOR</span><strong>{GAME_STAGE_ORDER.indexOf(gameStage) + 1} / {GAME_STAGE_ORDER.length}</strong></div>
          <div className="sim-mentor-progress" aria-hidden="true">{GAME_STAGE_ORDER.map((step, index) => <span key={step} className={index <= GAME_STAGE_ORDER.indexOf(gameStage) ? 'is-reached' : ''} />)}</div>
          <strong>{immersive ? GAME_OBJECTIVES[gameStage].title : 'Explore acquisition physics'}</strong>
          <p>{immersive ? GAME_OBJECTIVES[gameStage].detail : 'Compare the same projection at different technique and geometry settings.'}</p>
          <button onClick={() => setTeachingOpen(true)}>Open teaching guide <ChevronRightIcon /></button>
        </section>}
        <div className="sim-equipment"><span className="sim-section-label">ROOM EQUIPMENT</span><button onClick={() => { setView('tube'); setTab('exposure'); }}><TargetIcon /><span>Ceiling-mounted tube<small>Adjustable collimator</small></span><ChevronRightIcon /></button><button onClick={() => { setView('detector'); setTab('position'); }}><LayersIcon /><span>Digital detector<small>35 × 43 cm active area</small></span><ChevronRightIcon /></button><button onClick={() => { setView('room'); setTab('position'); }}><CubeIcon /><span>Radiolucent table<small>Floating carbon tabletop</small></span><ChevronRightIcon /></button></div>
        <div className="sim-panel-footer"><span className="sim-ready-dot" /><span>Procedural room assets<br /><small>Built locally with Three.js</small></span></div>
      </aside>

      <main className="sim-main">
        <div className="sim-mobile-protocol"><label htmlFor="mobile-exam">Examination</label><select id="mobile-exam" value={state.protocol} disabled={busy} onChange={(event) => selectProtocol(event.target.value as ProtocolId)}>{PROTOCOLS.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.position}</option>)}</select></div>
        <div className="sim-viewport" ref={viewportRef}>
          <Suspense fallback={<div className="sim-scene-loading"><div className="sim-scene-skeleton" /><span>Preparing the clinical department</span><small>Loading equipment and patient</small></div>}><XrayScene state={state} view={view} cameraReset={cameraReset} exposing={busy} onSelect={selectObject} onWalkChange={setWalking} latestImage={images[0]} registered={registered} gownHanded={gownHanded} patientInRoom={patientInRoom} patientAtImaging={patientAtImaging} patientPrepared={patientPrepared} changingDoorClosed={changingDoorClosed} hygieneDone={hygieneDone} world={{ barrierClosed, patientPrepared: patientAtImaging, canManipulatePatient: gameStage === 'position' && hygieneDone && patientAtImaging, registered, patientInRoom: patientAtImaging, onHover: setHoveredTarget, onSelect: setSelectedTarget, onAction: worldAction, onManipulate: manipulate, onProtectionChange: protectionChanged, onGrip: setHolding, paused: !!info || !!reviewImage || workshopTopic !== null || gamePanel !== null || caseInfoOpen || shiftLogOpen || teachingOpen || coachOpen || busy }} /></Suspense>
          <div className="sim-scene-head"><div><span className="sim-scene-overline">DIGITAL RADIOGRAPHY</span><span className="sim-room-label">Room 01 <span>/</span> {protocol.position === 'erect' ? 'Wall stand' : 'Table bucky'}</span></div><span className={`sim-scene-status ${busy ? 'is-exposing' : ''}`}><span />{busy ? 'Acquiring image' : 'System online'}</span></div>
          <div className="sim-scene-side"><button className="sim-scene-icon" onClick={fullscreen} aria-label="Toggle room fullscreen" title="Fullscreen"><EnterFullScreenIcon /></button><button className="sim-scene-icon" onClick={() => setCameraReset((value) => value + 1)} aria-label="Reset camera view" title="Reset view"><ResetIcon /></button><button className="sim-scene-icon" onClick={() => update('showLabels', !state.showLabels)} aria-label="Toggle equipment labels" aria-pressed={state.showLabels} title="Equipment labels"><InfoCircledIcon /></button>{immersive && <button className="sim-scene-icon" aria-label={roomAudio ? 'Mute room sounds' : 'Enable room sounds'} title={roomAudio ? 'Mute room sounds' : 'Enable room sounds'} aria-pressed={roomAudio} onClick={() => { const enabled = !roomAudio; setRoomAudio(enabled); playClinicalCue('confirm', enabled); }}>{roomAudio ? <SpeakerLoudIcon /> : <SpeakerOffIcon />}</button>}</div>
          <div className="sim-scene-bottom"><div className="sim-camera-views" aria-label="Camera view">{CAMERA_VIEWS.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} aria-label={label} aria-pressed={view === id} className={view === id ? 'is-active' : ''}><Icon /><span>{label}</span></button>)}<span className="sim-camera-divider" /><button className={view === 'first-person' ? 'is-active' : ''} onClick={() => setView(view === 'first-person' ? 'room' : 'first-person')} aria-pressed={view === 'first-person'}><EyeOpenIcon /><span>Walk</span></button></div><button className={`sim-light-button ${state.lightField ? 'is-active' : ''}`} onClick={() => update('lightField', !state.lightField)} disabled={busy} aria-pressed={state.lightField}><SunIcon /><span>Light field</span></button></div>
          <div className="sim-navigation-hint">{immersive ? walking ? 'WASD to walk · Shift faster · C crouch · Esc to release' : 'Double-click the room for mouse look · WASD to walk · drag to look' : 'Drag to orbit · scroll to zoom · click equipment to inspect'}</div>
          {immersive && <>
            <GameHUD stage={gameStage} caseName={registered ? clinicalCase.name : 'Patient waiting at reception'} interaction={interactionLabel} status={status} shielded={state.shielded} hygieneDone={hygieneDone} detectorReady={state.detectorReady} detectorPoint={{ x: getWorldTargets(state).find(item => item.id === 'detector')!.position[0], z: getWorldTargets(state).find(item => item.id === 'detector')!.position[2] }} changingHint={gownHanded ? changingDoorClosed ? 'Wait outside for the patient to finish changing.' : 'Step into the corridor and close the privacy door.' : undefined} onInteract={() => { if (target && interactionLabel) worldAction(target.id, 'use'); }} onMenu={() => setCaseInfoOpen(true)} sound={roomAudio} onSound={() => { if (roomAudio && 'speechSynthesis' in window) window.speechSynthesis.cancel(); setRoomAudio(!roomAudio); playClinicalCue('confirm', !roomAudio); }} />
            {caseInfoOpen && <CaseInformation clinicalCase={clinicalCase} stage={gameStage} registered={registered} reviewed={!!caseCaptured} onReview={() => { setCaseInfoOpen(false); setGamePanel('review'); }} onClose={() => setCaseInfoOpen(false)} />}
            {gamePanel === 'registration' && <ClinicalConversation clinicalCase={clinicalCase} phase="registration" session={registrationDialogue ?? undefined} onSessionChange={next => dialogueChanged('registration', next)} onSelectCase={selectClinicalCase} onComplete={registerPatient} onClose={closePatientDialogue} />}
            {gamePanel === 'changing' && <ClinicalConversation clinicalCase={clinicalCase} phase="preparation" session={preparationDialogue ?? undefined} onSessionChange={next => dialogueChanged('preparation', next)} patientArrived={patientAtChanging} doorClosed={changingDoorClosed} onComplete={gownPatient} onClose={closePatientDialogue} />}
            {gamePanel === 'position' && <PositionUI state={state} adjusted={positionAdjusted} onChange={(key, value) => { update(key, value); if (key === 'patientOffsetX' || key === 'patientOffsetY' || key === 'patientRotation') setPositionAdjusted(true); setPositionConfirmed(false); }} onConfirm={() => { if (!positionAdjusted || !checks.find(item => item.id === 'centering')?.passed || !checks.find(item => item.id === 'rotation')?.passed || !checks.find(item => item.id === 'arms')?.passed) return; setPositionConfirmed(true); logTrainingEvent('Positioning verified', `Centering ${state.patientOffsetX.toFixed(1)} / ${state.patientOffsetY.toFixed(1)} cm; rotation ${state.patientRotation.toFixed(0)}°.`, 'workflow'); setGamePanel(null); setStatus('Patient aligned. Arm the detector, enter the shielded room and close the lead door.'); }} onClose={() => setGamePanel(null)} />}
            {gamePanel === 'exposure' && <GameExposure state={state} blocked={blocked} phase={phase} busy={busy} breathHoldUntil={breathHoldUntil} onBreathInstruction={issueBreathInstruction} onChange={update} onExpose={acquire} onClose={() => setGamePanel(null)} />}
            {gamePanel === 'review' && caseCaptured && <ImageCritiqueStation key={caseCaptured.id} image={caseCaptured} clinicalCase={clinicalCase} assessment={assessments[caseCaptured.id] ?? null} onInspect={() => setReviewImage(caseCaptured)} onRepeat={(report, reason) => { logTrainingEvent('Technical critique and corrective plan', `${report.correct}/${report.total} criteria identified. Reason for considering repeat: ${reason}`, 'safety'); resetBreathing(); setCaseCaptured(null); setPositionAdjusted(false); setPositionConfirmed(false); setState(previous => ({ ...previous, detectorReady: false, breathHeld: false })); setGamePanel(null); setStatus('Repeat decision documented for training. Return to the patient, correct the identified issue, and reassess justification before exposing.'); }} onAccept={report => { logTrainingEvent('Image critique completed', `${report.correct}/${report.total} simulated technical findings identified; student accepted training acquisition. ${report.needsReview.length ? `Flags: ${report.needsReview.join(', ')}.` : 'No modeled technical flags.'}`, 'image'); logTrainingEvent('Encounter completed', 'Image review finished; next simulated patient requested.'); selectClinicalCase(CLINICAL_CASES[(CLINICAL_CASES.findIndex(item => item.id === activeCaseId) + 1) % CLINICAL_CASES.length].id); setGamePanel(null); }} onClose={() => setGamePanel(null)} />}
            <div className={`sim-crosshair ${hoveredTarget ? 'is-targeted' : ''} ${holding ? 'is-holding' : ''}`} aria-hidden="true"><span /><span /></div>
            <PhysicsWorkshop topic={workshopTopic} state={state} onChange={update} onClose={() => setWorkshopTopic(null)} />
          </>}
          {view === 'first-person' && <WalkPad />}
          <div className="sim-anatomy-selector" aria-label="Anatomy display">{(['surface', 'skeleton', 'organs'] as AnatomyView[]).map((layer) => <button key={layer} disabled={busy} onClick={() => update('anatomy', layer)} className={state.anatomy === layer ? 'is-active' : ''} aria-pressed={state.anatomy === layer}>{layer === 'surface' ? <PersonIcon /> : layer === 'skeleton' ? <LayersIcon /> : <MixerHorizontalIcon />}<span>{layer}</span></button>)}</div>
          {phase === 'prepared' && <div className="sim-prepared-strip"><LightningBoltIcon />{immersive ? 'Protected control room · aim at console and press E to acquire' : 'Exposure prepared · press Expose to acquire'}</div>}
        </div>

        <section className="sim-acquisitions" aria-label="Acquired images"><div className="sim-acquisition-heading"><span><CameraIcon />Acquired images<span className="sim-small-count">{String(images.length).padStart(2, '0')}</span></span><small>{images.length ? 'Select an image to review · latest 8 kept this session' : 'Your acquisitions will appear here'}</small></div><div className={`sim-filmstrip ${images.length ? '' : 'is-empty'}`}>{images.length ? images.map((image, index) => <button key={image.id} onClick={() => setReviewImage(image)} className="sim-film-thumbnail" aria-label={`Review ${getProtocol(image.state.protocol).name} acquisition ${images.length - index}`}><img src={image.previewUrl} alt={`Synthetic ${getProtocol(image.state.protocol).name}`} /><span><strong>{getProtocol(image.state.protocol).name}</strong><small>{image.state.kvp} kVp · {image.metrics.mas.toFixed(1)} mAs</small></span><span className="sim-film-number">{String(images.length - index).padStart(2, '0')}</span></button>) : <div className="sim-empty-acquisitions"><span className="sim-empty-film"><CameraIcon /></span><span>No images acquired<small>Set your technique and make your first exposure.</small></span><span className="sim-empty-dash" /></div>}</div></section>
      </main>

      <aside className="sim-console" aria-label="Operator console">
        <header className="sim-console-heading"><div><span className="sim-section-label">OPERATOR CONSOLE</span><h2>{protocol.name}</h2></div><span className="sim-projection-tag">{protocol.projection}</span></header>
        <div className="sim-console-tabs" role="tablist" aria-label="Console controls">{CONSOLE_TABS.map((item, index) => <button key={item} id={`sim-tab-${item}`} role="tab" aria-controls="sim-console-content" aria-selected={tab === item} tabIndex={tab === item ? 0 : -1} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)} onKeyDown={(event) => {
          const next = event.key === 'ArrowRight' ? (index + 1) % CONSOLE_TABS.length : event.key === 'ArrowLeft' ? (index + CONSOLE_TABS.length - 1) % CONSOLE_TABS.length : event.key === 'Home' ? 0 : event.key === 'End' ? CONSOLE_TABS.length - 1 : -1;
          if (next < 0) return;
          event.preventDefault();
          setTab(CONSOLE_TABS[next]);
          (event.currentTarget.parentElement?.children[next] as HTMLButtonElement | undefined)?.focus();
        }}>{item === 'position' ? 'Positioning' : item.charAt(0).toUpperCase() + item.slice(1)}</button>)}</div>
        <div className="sim-console-scroll" id="sim-console-content" role="tabpanel" tabIndex={0} aria-labelledby={`sim-tab-${tab}`}><fieldset disabled={busy} className="sim-control-fieldset">
          {tab === 'exposure' ? <>
            <div className="sim-technique-summary"><span>MANUAL TECHNIQUE<small>Illustrative protocol preset</small></span><strong>{metrics.mas.toFixed(2)}<small>mAs</small></strong></div>
            <Parameter label="Tube voltage" value={state.kvp} unit="kVp" min={40} max={150} step={1} onChange={(value) => update('kvp', value)} />
            <Parameter label="Tube current" value={state.ma} unit="mA" min={25} max={500} step={25} onChange={(value) => update('ma', value)} />
            <Parameter label="Exposure time" value={state.exposureMs} unit="ms" min={1} max={500} step={1} onChange={(value) => update('exposureMs', value)} />
            <div className="sim-console-divider"><span className="sim-section-label">BEAM GEOMETRY</span></div>
            <Parameter label="Source–image distance" value={state.sid} unit="cm" min={80} max={200} step={1} onChange={(value) => update('sid', value)} />
            <Parameter label="Tube angulation" value={state.tubeAngle} unit="°" min={-30} max={30} step={1} onChange={(value) => update('tubeAngle', value)} />
            <Toggle label="Anti-scatter grid" checked={state.grid} onChange={(value) => update('grid', value)} />
            <div className="sim-select-row"><label htmlFor="focal-spot">Focal spot</label><select id="focal-spot" value={state.focalSpot} onChange={(event) => update('focalSpot', Number(event.target.value))}><option value="0.6">0.6 mm · small</option><option value="1.2">1.2 mm · large</option></select></div>
          </> : tab === 'position' ? <>
            <div className="sim-tab-intro"><TargetIcon /><span>Align the beam and patient<small>All distances are measured at the detector.</small></span></div>
            <Parameter label="Field width" value={state.collimationWidth} unit="cm" min={8} max={35} step={1} onChange={(value) => update('collimationWidth', value)} />
            <Parameter label="Field height" value={state.collimationHeight} unit="cm" min={8} max={43} step={1} onChange={(value) => update('collimationHeight', value)} />
            <div className="sim-console-divider"><span className="sim-section-label">PATIENT ALIGNMENT</span></div>
            <Parameter label="Patient rotation" value={state.patientRotation} unit="°" min={-45} max={45} step={1} onChange={(value) => update('patientRotation', value)} />
            <Parameter label="Lateral offset" value={state.patientOffsetX} unit="cm" min={-15} max={15} step={1} onChange={(value) => update('patientOffsetX', value)} />
            <Parameter label="Longitudinal offset" value={state.patientOffsetY} unit="cm" min={-15} max={15} step={1} onChange={(value) => update('patientOffsetY', value)} />
            <div className="sim-geometry-readout"><div><span>Magnification</span><strong>{metrics.magnification.toFixed(3)}×</strong></div><div><span>Geometric blur</span><strong>{metrics.unsharpness.toFixed(3)}<small> mm</small></strong></div></div>
            <button className="sim-outline-button" onClick={() => setInfo('positioning')}><FileTextIcon />Open positioning guide</button>
          </> : <>
            <div className="sim-patient-identity"><AnatomyGlyph region={protocol.region} className="sim-patient-glyph" /><div><strong>Synthetic adult</strong><span>Procedural training phantom</span><small>{protocol.position === 'erect' ? 'Standing at wall detector' : 'Supine on radiographic table'}</small></div></div>
            <Parameter label="Body thickness factor" value={state.patientSize} unit="×" min={0.75} max={1.4} step={0.05} onChange={(value) => update('patientSize', value)} note="Scales lateral and anteroposterior dimensions." />
            <div className="sim-select-row"><label htmlFor="arm-position">Arm position</label><select id="arm-position" value={state.arms} onChange={(event) => update('arms', event.target.value as SimulatorState['arms'])}><option value="down">Alongside the body</option><option value="hips">Hands at hips</option><option value="raised">Raised above the chest</option></select></div>
            <Toggle label="Respiration suspended" detail={protocol.region === 'chest' ? 'At full inspiration for this chest model' : 'Motion suppressed for this acquisition'} checked={state.breathHeld} onChange={(value) => update('breathHeld', value)} />
            <div className="sim-console-divider"><span className="sim-section-label">ACQUISITION INTERLOCKS</span></div>
            <Toggle label="Detector ready" detail="Digital receptor available" checked={state.detectorReady} onChange={(value) => update('detectorReady', value)} />
            {immersive ? <p className="sim-field-note">Simulated operator protection requires entering the radiographer control room and closing the lead access door.</p> : <Toggle label="Lead screen closed" detail="Operator at the shielded console" checked={state.shielded} onChange={(value) => update('shielded', value)} />}
            <div className="sim-patient-note"><InfoCircledIcon /><p>Patient controls change the mathematical phantom. Surface anatomy is illustrative; internal structures drive the image.</p></div>
          </>}
        </fieldset></div>
        <div className="sim-exposure-controls"><div className="sim-checklist-header"><span className="sim-section-label">ACQUISITION CHECK</span><span className={blocked || warnings.length ? 'sim-check-warning' : 'sim-check-good'}>{blocked ? 'Interlock open' : warnings.length ? `${warnings.length} observation${warnings.length > 1 ? 's' : ''}` : 'Ready'}</span></div><div className="sim-checklist">{immersive && <div className={patientPrepared ? 'is-passed' : 'is-failed'}><span>{patientPrepared ? <CheckIcon /> : <InfoCircledIcon />}</span><small>Patient changed into gown</small></div>}{checks.filter((check) => check.id !== 'parameters').map((check) => <div key={check.id} title={check.detail} className={check.passed ? 'is-passed' : 'is-failed'}><span>{check.passed ? <CheckIcon /> : <InfoCircledIcon />}</span><small>{check.label}</small></div>)}</div>{blocked && <p className="sim-blocked-message">{immersive && !patientPrepared ? 'Prepare the synthetic patient in the private changing room.' : checks.find((check) => check.blocking && !check.passed)?.detail}</p>}{error && <p className="sim-error" role="alert">{error}</p>}<button className={`sim-expose-button ${phase === 'prepared' ? 'is-prepared' : ''}`} onClick={acquire} disabled={blocked || busy}>{busy ? <><span className="sim-acquisition-progress" />Acquiring image…</> : phase === 'prepared' ? <><LightningBoltIcon />Expose<span>{state.exposureMs} ms</span></> : <><PlayIcon />Prepare exposure<ChevronRightIcon /></>}</button>{phase !== 'idle' ? <button className="sim-cancel-exposure" onClick={cancelCapture}>Cancel {busy ? 'acquisition' : 'preparation'}</button> : <p className="sim-expose-note">Synthetic image · no radiation emitted</p>}</div>
      </aside>
    </div>
    <footer className="sim-statusbar"><span className="sim-live-status" role="status" aria-live="polite"><span className={busy ? 'is-busy' : ''} />{status}</span><button onClick={() => setInfo('model')}>Analytical training model<InfoCircledIcon /></button></footer>
    <ShiftLogDialog open={shiftLogOpen} onClose={() => setShiftLogOpen(false)} onExport={exportSession} events={currentEvents} clinicalCase={clinicalCase} assessment={latestAssessment} captures={images.length} />
    <ClinicalCoach open={coachOpen} onClose={() => setCoachOpen(false)} clinicalCase={clinicalCase} stage={gameStage} state={state} preparation={preparation} guided={guided} image={caseCaptured} assessment={latestAssessment} patientPrepared={patientPrepared} hygieneDone={hygieneDone} doorSecured={barrierClosed} onAdjust={!immersive && !busy ? (patch) => { setState(previous => patch.protocol ? { ...applyProtocol(previous, patch.protocol), ...patch } : { ...previous, ...patch }); setPositionConfirmed(false); setPhase('idle'); setError(''); setStatus('Technique lab change applied. Review alignment and prepare a new acquisition.'); } : undefined} onSessionGrade={summary => logTrainingEvent('OSCE coaching debrief filed', `Teaching score ${summary.score}/${summary.total}. ${summary.feedback.join(' ')}`, 'image')} />
    <ClinicalTeachingPanel open={teachingOpen} onClose={() => setTeachingOpen(false)} clinicalCase={clinicalCase} stage={gameStage} state={state} preparation={preparation} assessment={latestAssessment} guided={guided} image={caseCaptured} patientPrepared={patientPrepared} hygieneDone={hygieneDone} onGrade={(stage, grade) => logTrainingEvent(`${GAME_OBJECTIVES[stage].title} · knowledge check`, `${grade.correct}/${grade.answered} answered correctly · ${grade.earned}/${grade.total} teaching points.`, 'workflow')} />
    <InfoDialog panel={info} onClose={() => setInfo(null)} state={state} game={immersive} onRestart={reset} />
    {reviewImage && <Suspense fallback={null}><RadiographViewer image={reviewImage} onClose={() => setReviewImage(null)} /></Suspense>}
  </div>;
}
