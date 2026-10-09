import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowRightIcon, CheckIcon, Cross2Icon, FileTextIcon, LightningBoltIcon, PersonIcon, TargetIcon } from '@radix-ui/react-icons';
import { CLINICAL_CASES, type CaseId, type ClinicalCase } from './clinicalCases';
import { GAME_OBJECTIVES, GAME_STAGE_ORDER, getWaypointGuide, type GameStage } from './GameJourney';
import type { SimulatedAssessment } from './clinicalCases';
import type { CapturedImage, SimulatorState } from './types';
import { getProtocol } from './protocols';
import { calculateMetrics, getReadinessChecks } from './physics';

/** Focus stays inside the active workstation and returns to its physical
 * interaction button when the player finishes or dismisses it.
 */
function useStationFocus() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return ref;
}

function stationKeys(event: KeyboardEvent<HTMLElement>, close: () => void) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
  if (event.key !== 'Tab') return;
  const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],summary,[tabindex]:not([tabindex="-1"])')).filter(element => element.getClientRects().length > 0);
  if (elements.length === 0) return;
  const first = elements[0], last = elements[elements.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

export function GameHUD({ stage, caseName, interaction, status, shielded, hygieneDone, detectorReady, detectorPoint, changingHint, onInteract, onMenu, onSound, sound }: {
  stage: GameStage; caseName: string; interaction: string | null; status: string; shielded: boolean; hygieneDone: boolean; detectorReady: boolean; detectorPoint?: { x: number; z: number }; changingHint?: string;
  onInteract: () => void; onMenu: () => void; onSound: () => void; sound: boolean;
}) {
  // Position updates are HUD-only. Updating the parent 3D scene every 200 ms
  // forced React to reconcile the entire department while the player walked.
  const [player, setPlayer] = useState({ x: 5.60, z: 5.90, yaw: 0 });
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ x?: number; z?: number; yaw?: number }>).detail;
      if (Number.isFinite(detail?.x) && Number.isFinite(detail?.z)) {
        setPlayer({ x: detail.x!, z: detail.z!, yaw: detail.yaw ?? 0 });
      }
    };
    window.addEventListener('xray-location', update);
    return () => window.removeEventListener('xray-location', update);
  }, []);
  const objective = GAME_OBJECTIVES[stage];
  const stageIndex = GAME_STAGE_ORDER.indexOf(stage);
  const needHygiene = stage === 'position' && !hygieneDone;
  const needDetector = stage === 'exposure' && !detectorReady;
  const waypoint = getWaypointGuide(stage, player, shielded, needHygiene ? { x: -1.08, z: -3.13 } : needDetector ? detectorPoint : undefined);
  const destination = needHygiene ? 'HAND HYGIENE' : needDetector ? 'DIGITAL DETECTOR' : objective.destination;
  const detail = needHygiene ? 'Use the hand-hygiene station in Imaging 01 before touching or positioning the patient.' : needDetector ? 'Prepare the detector in the X-ray room before entering the shielded workstation.' : stage === 'changing' && changingHint ? changingHint : objective.detail;
  return <>
    <div className="game-top"><div className="game-progress-name">RADIOGRAPHY <span>/</span> CLINICAL SHIFT</div><div className="game-progress-steps" role="progressbar" aria-label="Clinical shift progress" aria-valuemin={1} aria-valuemax={GAME_STAGE_ORDER.length} aria-valuenow={stageIndex + 1} aria-valuetext={`${objective.title}, step ${stageIndex + 1} of ${GAME_STAGE_ORDER.length}`}>{GAME_STAGE_ORDER.map((step, index) => <i key={step} aria-hidden="true" className={index <= stageIndex ? 'is-active' : ''} />)}</div><div className="game-progress-case">{caseName}</div></div>
    <section className="game-objective" aria-label="Current mission" data-game-stage={stage}>
      <span className="game-kicker">OBJECTIVE <b>{String(stageIndex + 1).padStart(2, '0')} / {String(GAME_STAGE_ORDER.length).padStart(2, '0')}</b></span>
      <h2>{objective.title}</h2>
      <p>{detail}</p>
      <div className="game-destination"><span className="game-destination-dot" />GO TO <strong>{destination}</strong>{waypoint && <span className="game-waypoint"><span style={{ transform: `rotate(${waypoint.angle}rad)` }}>↑</span>{waypoint.distance.toFixed(1)} m</span>}</div>
    </section>
    <div className="game-utilities"><button onClick={onMenu} aria-label="Open case information"><FileTextIcon /> <span>CASE</span></button><button onClick={onSound} aria-label={sound ? 'Mute room sounds' : 'Enable room sounds'}>{sound ? 'SOUND ON' : 'SOUND OFF'}</button></div>
    {interaction && <button className="game-interact" onClick={onInteract} aria-label={`Interact: ${interaction}`}><kbd>E</kbd><strong>{interaction}</strong><ArrowRightIcon /></button>}
    {status && <div className="game-toast" role="status">{status}</div>}
    <div className="game-controls-caption"><span className="game-desktop-help">WASD MOVE · DRAG LOOK · E INTERACT</span><span className="game-mobile-help">DRAG TO LOOK · USE ARROWS TO WALK · TAP TO INTERACT</span></div>
  </>;
}

export function RegistrationUI({ caseId, onSelect, onRegister, onClose }: {
  caseId: CaseId; onSelect: (id: CaseId) => void; onRegister: () => void; onClose: () => void;
}) {
  const [identityChecked, setIdentityChecked] = useState(false);
  const [orderChecked, setOrderChecked] = useState(false);
  const panelRef = useStationFocus();
  const selected = CLINICAL_CASES.find(item => item.id === caseId)!;
  return <section ref={panelRef} onKeyDown={event => stationKeys(event, onClose)} className="game-dialog" role="dialog" aria-modal="true" aria-label="Patient registration">
    <header><span>01 / PATIENT REGISTRATION</span><button onClick={onClose} aria-label="Close registration"><Cross2Icon /></button></header>
    <div className="game-dialog-content">
      <span className="game-dialog-kicker">RECEPTION · TRAINING PATIENT</span>
      <h2>Check in your patient.</h2><p>Confirm the patient's appointment and requested X-ray. Every encounter is fictional.</p>
      <div className="game-case-choice">{CLINICAL_CASES.map(item => <button key={item.id} aria-pressed={caseId === item.id} onClick={() => { onSelect(item.id); setIdentityChecked(false); setOrderChecked(false); }}><span><strong>{item.name}</strong><small>{item.indication}</small></span><b>{getProtocol(item.requested).name}</b></button>)}</div>
      <div className="game-patient-slip"><PersonIcon /><div><span>PATIENT RECORD / FICTIONAL</span><strong>{selected.name} · {selected.identifier}</strong><small>Order {selected.accession} · {getProtocol(selected.requested).name}</small></div></div>
      <div className="game-registration-checks">
        <label><input type="checkbox" checked={identityChecked} onChange={event => setIdentityChecked(event.target.checked)} /> Patient name and identifier checked</label>
        <label><input type="checkbox" checked={orderChecked} onChange={event => setOrderChecked(event.target.checked)} /> Requested examination confirmed</label>
      </div>
      <button className="game-primary" disabled={!identityChecked || !orderChecked} onClick={onRegister}>Complete registration <ArrowRightIcon /></button>
    </div>
  </section>;
}

export function CaseInformation({ clinicalCase, stage, registered, reviewed, onReview, onClose }: {
  clinicalCase: ClinicalCase; stage: GameStage; registered: boolean; reviewed: boolean; onReview: () => void; onClose: () => void;
}) {
  const panelRef = useStationFocus();
  return <section ref={panelRef} onKeyDown={event => stationKeys(event, onClose)} className="game-dialog game-dialog-small" role="dialog" aria-modal="true" aria-label="Clinical encounter details">
    <header><span>ACTIVE ENCOUNTER / EDUCATIONAL</span><button onClick={onClose} aria-label="Close clinical encounter"><Cross2Icon /></button></header>
    <div className="game-dialog-content">
      <span className="game-dialog-kicker">DIGITAL RADIOGRAPHY · REFERRAL</span>
      <h2>{registered ? clinicalCase.name : 'Patient awaiting check-in'}</h2>
      <div className="game-case-meta"><span>TRAINING ID <strong>{clinicalCase.identifier}</strong></span><span>ACCESSION <strong>{clinicalCase.accession}</strong></span></div>
      <div className="game-case-detail"><span>EXAM REQUEST</span><strong>{getProtocol(clinicalCase.requested).name}</strong><p>{clinicalCase.indication}</p></div>
      <div className="game-case-detail"><span>PATIENT BRIEF</span><p>{clinicalCase.clinicalContext}</p></div>
      <div className="game-case-detail"><span>LEARNING OBJECTIVE</span><p>{clinicalCase.teachingFocus}</p></div>
      <div className="game-case-detail"><span>CURRENT STEP</span><p>{GAME_OBJECTIVES[stage].title}</p></div>
      {reviewed && <button className="game-primary" onClick={onReview}>Review last examination <ArrowRightIcon /></button>}
      <p className="game-privacy-note">All names, identifiers and clinical scenarios shown here are fictional training records.</p>
    </div>
  </section>;
}

export function ChangingUI({ clinicalCase, doorClosed, patientArrived, onChange, onClose }: {
  clinicalCase: ClinicalCase; doorClosed: boolean; patientArrived: boolean; onChange: () => void; onClose: () => void;
}) {
  const [screened, setScreened] = useState(false);
  const [informed, setInformed] = useState(false);
  const panelRef = useStationFocus();
  return <section ref={panelRef} onKeyDown={event => stationKeys(event, onClose)} className="game-dialog game-dialog-small" role="dialog" aria-modal="true" aria-label="Patient changing instructions">
    <header><span>02 / PATIENT PREPARATION</span><button onClick={onClose} aria-label="Close changing instructions"><Cross2Icon /></button></header>
    <div className="game-dialog-content"><span className="game-dialog-kicker">PRIVATE CHANGING ROOM</span><h2>Prepare with care.</h2><p>Speak with {clinicalCase.name} before handing over the gown. Respect privacy during the clothing change.</p>
      <div className="game-preparation-tasks">
        <label><input type="checkbox" checked={screened} onChange={event => setScreened(event.target.checked)} /><span><strong>Complete safety screening</strong><small>{clinicalCase.id === 'abdominal-survey' ? 'Review pregnancy considerations and examination justification according to local policy.' : 'Discuss relevant contraindications, comfort and ability to cooperate.'}</small></span></label>
        <label><input type="checkbox" checked={informed} onChange={event => setInformed(event.target.checked)} /><span><strong>Explain the requested projection</strong><small>{clinicalCase.preparationNote}</small></span></label>
      </div>
      <div className="game-instruction">“Please remove any jewelry or metal near the examination area and put on this gown. I'll wait outside while you change.”</div>
      <p className="game-privacy-note">{!patientArrived ? 'Wait for the patient to arrive.' : doorClosed ? 'Open the door while you hand over the gown. Step out and close it afterwards.' : 'Once prepared, step into the corridor and close the door for privacy.'}</p>
      <button className="game-primary" disabled={doorClosed || !patientArrived || !screened || !informed} onClick={onChange}>Hand over gown and leave the room <ArrowRightIcon /></button>
    </div>
  </section>;
}

function PositionPreview({ state }: { state: SimulatorState }) {
  const offsetX = state.patientOffsetX * 4, offsetY = -state.patientOffsetY * 4;
  const centered = Math.abs(state.patientOffsetX) <= 1.5 && Math.abs(state.patientOffsetY) <= 1.5;
  return <div className="game-position-preview">
    <svg viewBox="0 0 248 234" role="img" aria-label="Diagram of patient center and rotation relative to the digital receptor">
      <defs><pattern id="sim-guide-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#7d9993" strokeOpacity=".13" /></pattern></defs>
      <rect width="248" height="234" rx="5" fill="#13292c" />
      <rect width="248" height="234" fill="url(#sim-guide-grid)" />
      <rect x="55" y="20" width="138" height="193" rx="5" fill="#254147" stroke="#719a92" strokeWidth="1.5" />
      <rect x="67" y="30" width="114" height="173" rx="2" fill="none" stroke="#d3e7a6" strokeDasharray="5 5" strokeOpacity=".55" />
      <path d="M124 10V223M41 117H207" stroke="#b6dcc7" strokeOpacity=".35" strokeWidth=".8" />
      <g transform={`translate(${124 + offsetX} ${116 + offsetY}) rotate(${state.patientRotation})`}>
        <ellipse cx="0" cy="-56" rx="17" ry="20" fill="#75948f" stroke="#bdcdc1" strokeWidth="1.4" />
        <path d="M-26-34 Q0-47 26-34 L35 33 Q17 43 11 78 L-12 78 Q-17 43-35 33Z" fill="#739890" stroke="#c4ded4" strokeWidth="1.6" />
        <path d={state.arms === 'raised' ? 'M-29-29L-39-85M29-29L39-85' : 'M-29-29L-49 36M29-29L49 36'} stroke="#99b8ae" strokeWidth="12" strokeLinecap="round" />
        <path d="M-12 78L-15 98M12 78L15 98" stroke="#99b8ae" strokeWidth="12" strokeLinecap="round" />
        <path d="M-30-18L30-18M0-28V70" stroke="#e5f4ec" strokeOpacity=".5" strokeWidth="1" />
      </g>
      <circle cx="124" cy="117" r="6" fill="none" stroke={centered ? '#d3f5ba' : '#ffc788'} strokeWidth="2" />
      <circle cx="124" cy="117" r="1.8" fill="#fff" />
      <text x="12" y="15" fill="#b9d5cd" fontSize="8" fontFamily="monospace">DETECTOR / ALIGNMENT</text>
      <text x="236" y="223" fill={centered ? '#d3f5ba' : '#ffc788'} textAnchor="end" fontSize="8" fontFamily="monospace">{centered ? 'CENTERED' : 'OFFSET DETECTED'}</text>
    </svg>
    <div className="game-position-preview-help">Topographic positioning guide <span>· Synthetic geometry</span></div>
  </div>;
}

export function PositionUI({ state, onChange, onConfirm, onClose, adjusted }: {
  state: SimulatorState; onChange: <K extends keyof SimulatorState>(key: K, value: SimulatorState[K]) => void;
  onConfirm: () => void; onClose: () => void; adjusted: boolean;
}) {
  const checks = getReadinessChecks(state);
  const panelRef = useStationFocus();
  const centering = checks.find(item => item.id === 'centering')?.passed;
  const rotation = checks.find(item => item.id === 'rotation')?.passed;
  const arms = checks.find(item => item.id === 'arms')?.passed;
  const alignmentIssues = checks.filter(item => ['centering', 'rotation', 'arms'].includes(item.id) && !item.passed);
  const change = (key: 'patientOffsetX' | 'patientOffsetY' | 'patientRotation', difference: number) => {
    const bound = key === 'patientRotation' ? 45 : 15;
    onChange(key, Math.max(-bound, Math.min(bound, state[key] + difference)));
  };
  return <section ref={panelRef} onKeyDown={event => stationKeys(event, onClose)} className="game-dialog game-dialog-position" role="dialog" aria-modal="true" aria-label="Manually position patient">
    <header><span>04 / PATIENT POSITIONING</span><button onClick={onClose} aria-label="Close positioning"><Cross2Icon /></button></header>
    <div className="game-dialog-content"><span className="game-dialog-kicker">HANDS-ON RADIOGRAPHY</span><h2>Position the patient.</h2><p>Center the requested anatomy and align the patient with the receptor. Adjust the body directly in the room or use these fine controls.</p>
      <PositionPreview state={state} />
      <div className="game-position-grid">
        <div><span>LEFT / RIGHT</span><div className="game-pos-buttons"><button aria-label="Move patient left" onClick={() => change('patientOffsetX', -0.5)}>←</button><b>{state.patientOffsetX.toFixed(1)} cm</b><button aria-label="Move patient right" onClick={() => change('patientOffsetX', 0.5)}>→</button></div></div>
        <div><span>HEAD / FEET</span><div className="game-pos-buttons"><button aria-label="Move patient towards feet" onClick={() => change('patientOffsetY', -0.5)}>↓</button><b>{state.patientOffsetY.toFixed(1)} cm</b><button aria-label="Move patient towards head" onClick={() => change('patientOffsetY', 0.5)}>↑</button></div></div>
        <div><span>BODY ROTATION</span><div className="game-pos-buttons"><button aria-label="Rotate patient left" onClick={() => change('patientRotation', -1)}>↶</button><b>{state.patientRotation.toFixed(0)}°</b><button aria-label="Rotate patient right" onClick={() => change('patientRotation', 1)}>↷</button></div></div>
        <div><span>ARMS</span><button className="game-position-toggle" aria-pressed={state.arms === 'raised'} onClick={() => onChange('arms', state.arms === 'raised' ? 'down' : 'raised')}>{state.arms === 'raised' ? 'Arms raised ✓' : 'Raise arms if required'}</button></div>
      </div>
      <div className="game-position-quality" role="status"><TargetIcon aria-hidden="true" /><div><strong>{centering && rotation && arms ? 'Positioning checks passed' : `${alignmentIssues.length} positioning ${alignmentIssues.length === 1 ? 'check needs' : 'checks need'} attention`}</strong><span>{centering && rotation && arms ? 'The simulated centering, projection and limb positions meet this exercise’s checks.' : alignmentIssues.map(item => item.label).join(' · ')}</span>{!rotation && Math.abs(state.tubeAngle) > 3 && <small>Tube angulation also affects alignment. Adjust the X-ray tube in the room to within ±3°.</small>}</div></div>
      <p className="game-position-footnote">Breathing is coordinated later using the control-room intercom, immediately before exposure.</p>
      <button className="game-primary" disabled={!adjusted || !centering || !rotation || !arms} onClick={onConfirm}>{!adjusted ? 'Adjust patient position first' : !centering || !rotation || !arms ? 'Correct patient alignment' : 'Confirm positioning'}<ArrowRightIcon /></button>
    </div>
  </section>;
}

export function GameExposure({ state, blocked, phase, busy, breathHoldUntil = 0, onBreathInstruction, onChange, onExpose, onClose }: {
  state: SimulatorState; blocked: boolean; phase: 'idle' | 'prepared' | 'exposing'; busy: boolean;
  breathHoldUntil?: number; onBreathInstruction?: () => void;
  onChange: <K extends keyof SimulatorState>(key: K, value: SimulatorState[K]) => void; onExpose: () => void; onClose: () => void;
}) {
  const metrics = calculateMetrics(state);
  const [advanced, setAdvanced] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const panelRef = useStationFocus();
  const checks = getReadinessChecks(state);
  const interlocks = checks.filter(item => item.blocking);
  const techniqueFlags = checks.filter(item => !item.blocking && item.id !== 'breath' && !item.passed);
  useEffect(() => {
    if (!breathHoldUntil || busy) return;
    const started = Date.now();
    setNow(started);
    if (started >= breathHoldUntil) return;
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= breathHoldUntil) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [breathHoldUntil, busy]);
  const secondsLeft = Math.max(0, (breathHoldUntil - now) / 1000);
  const listening = secondsLeft > 0 && state.breathHeld;
  const technique = getProtocol(state.protocol);
  return <section ref={panelRef} onKeyDown={event => stationKeys(event, onClose)} className="game-dialog game-dialog-expose" role="dialog" aria-modal="true" aria-label="Radiographer acquisition workstation">
    <header><span>05 / RADIOGRAPHER CONTROL</span><button onClick={onClose} aria-label="Close exposure controls"><Cross2Icon /></button></header>
    <div className="game-dialog-content"><span className="game-dialog-kicker">DR ACQUISITION SYSTEM</span><h2>{getProtocol(state.protocol).name}</h2>
      <p>Check your technique, then prepare and make the exposure from the protected control room.</p>
      <div className="game-tech-values">{([{ key: 'kvp', label: 'Tube voltage', unit: 'kVp', min: 40, max: 150, step: 1 }, { key: 'ma', label: 'Tube current', unit: 'mA', min: 25, max: 500, step: 25 }, { key: 'exposureMs', label: 'Exposure time', unit: 'ms', min: 1, max: 500, step: 1 }] as const).map(item => <label key={item.key}><span>{item.label}</span><span><input type="number" aria-label={item.label} disabled={busy} value={state[item.key]} min={item.min} max={item.max} step={item.step} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value)) onChange(item.key, Math.max(item.min, Math.min(item.max, value))); }} /><small>{item.unit}</small></span></label>)}</div>
      <div className="game-tech-total">TOTAL EXPOSURE <b>{Number.isFinite(metrics.mas) ? metrics.mas.toFixed(2) : '—'} mAs</b></div>
      <button className="game-advanced-trigger" type="button" aria-controls="game-geometry-settings" aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}>{advanced ? 'Hide geometry settings' : 'Adjust geometry and collimation'}<span aria-hidden="true">{advanced ? '−' : '+'}</span></button>
      {advanced && <div id="game-geometry-settings" className="game-advanced-panel">
        {([{ key: 'sid', label: 'Source-to-image distance', min: 80, max: 200, step: 5, unit: 'cm' }, { key: 'collimationWidth', label: 'Field width', min: 8, max: 35, step: 1, unit: 'cm' }, { key: 'collimationHeight', label: 'Field height', min: 8, max: 43, step: 1, unit: 'cm' }] as const).map(item => <label key={item.key}><span>{item.label}</span><input type="range" aria-label={`${item.label} in ${item.unit}`} min={item.min} max={item.max} step={item.step} value={state[item.key]} disabled={busy} onChange={event => onChange(item.key, Number(event.target.value))} /><strong>{state[item.key]} {item.unit}</strong></label>)}
      </div>}
      <div className="game-interlocks"><span>ACQUISITION READINESS</span>{interlocks.map(item => <div key={item.id} className={item.passed ? 'is-ready' : 'is-blocked'}><span>{item.passed ? <CheckIcon /> : '!'}</span><strong>{item.label}</strong><small>{item.passed ? 'Ready' : 'Action required'}</small></div>)}</div>
      <div className={techniqueFlags.length ? 'game-technique-review has-flags' : 'game-technique-review'}><strong>TECHNIQUE PREVIEW · SYNTHETIC</strong>{techniqueFlags.length ? <><p>{techniqueFlags.length} geometry or coverage {techniqueFlags.length === 1 ? 'check is' : 'checks are'} outside the exercise targets. These checks do not automatically block acquisition.</p><ul>{techniqueFlags.map(item => <li key={item.id}><b>{item.label}</b><span>{item.detail}</span></li>)}</ul></> : <p>Geometry, collimation and limb-position checks are within the exercise targets. Review the acquired image before accepting it.</p>}</div>
      {phase !== 'idle' && <div className="game-breath-workstation">
        <div className="game-breath-head"><span>PATIENT INTERCOM</span><strong role="timer" aria-live="off">{listening ? `SIMULATED HOLD · ${secondsLeft.toFixed(1)}s` : 'BREATH HOLD NOT ACTIVE'}</strong></div>
        <p>Tell the patient to {technique.region === 'abdomen' ? 'breathe out and suspend respiration' : 'take a deep breath in and hold'} when the equipment is ready. A patient cannot hold their breath indefinitely.</p>
        <button type="button" onClick={onBreathInstruction} disabled={!onBreathInstruction || busy || blocked}>{listening ? 'Repeat breathing instruction' : technique.region === 'abdomen' ? 'Intercom · breathe out and hold' : 'Intercom · breathe in and hold'}</button>
        <div className="game-breath-progress"><span style={{ width: `${Math.max(0, Math.min(100, secondsLeft / (technique.region === 'abdomen' ? 9 : 12) * 100))}%` }} /></div>
      </div>}
      <div role="status" className={blocked || (phase === 'prepared' && !!onBreathInstruction && !listening) ? 'game-exposure-warning' : 'game-exposure-ready'}>{blocked ? interlocks.find(item => !item.passed)?.detail ?? 'Complete the patient workflow before exposing.' : phase === 'prepared' && !!onBreathInstruction && !listening ? 'The simulated breath hold is inactive or expired. Give a fresh intercom instruction before exposure.' : 'Required equipment interlocks passed. Verify the requested projection, image coverage and technique before acquisition.'}</div>
      <button className="game-primary game-expose-cta" disabled={blocked || busy || (phase === 'prepared' && !!onBreathInstruction && !listening)} onClick={onExpose}>{phase === 'idle' ? <><LightningBoltIcon /> Prepare exposure</> : phase === 'prepared' ? <><LightningBoltIcon /> EXPOSE · {state.exposureMs} ms</> : 'Acquiring…'}<ArrowRightIcon /></button>
      <small className="game-simulation-note">Synthetic training simulation · no radiation emitted</small>
    </div>
  </section>;
}

export function GameReview({ image, assessment, onImage, onNext, onRepeat, onClose }: {
  image: CapturedImage; assessment: SimulatedAssessment | null; onImage: () => void; onNext: () => void; onRepeat?: () => void; onClose: () => void;
}) {
  const panelRef = useStationFocus();
  const [disposition, setDisposition] = useState<'accept' | 'repeat' | null>(null);
  const hasTechnicalDefect = !!assessment && (assessment.criticalFailures.length > 0 || assessment.items.some(item => ['position', 'coverage', 'respiration', 'protocol'].includes(item.id) && item.earned < item.points));
  const keyIssue = assessment?.criticalFailures[0] ?? assessment?.items.find(item => ['position', 'coverage', 'respiration', 'protocol'].includes(item.id) && item.earned < item.points)?.feedback;
  const assessmentPercent = assessment?.total ? Math.round(assessment.score / assessment.total * 100) : null;
  return <section ref={panelRef} onKeyDown={event => stationKeys(event, onClose)} className="game-dialog game-dialog-small" role="dialog" aria-modal="true" aria-label="Acquired image review">
    <header><span>06 / IMAGE REVIEW</span><button aria-label="Close review" onClick={onClose}><Cross2Icon /></button></header>
    <div className="game-dialog-content"><span className="game-dialog-kicker">SYNTHETIC IMAGE AVAILABLE FOR REVIEW</span><h2>Assess the acquisition.</h2><div className="game-review-image"><img src={image.previewUrl} alt="Synthetic radiograph awaiting technical image assessment" /></div>
      {assessment && <div className="game-review-assessment"><span>TRAINING ASSESSMENT</span><strong>{assessment.score}<small> / {assessment.total}</small></strong><p>{assessment.notes[0] ?? 'All scored training checks satisfied for this synthetic examination.'}</p></div>}
      {assessment && <>
        <div className="game-review-verdict"><div><strong>{hasTechnicalDefect ? 'Technical concerns flagged for review' : assessmentPercent !== null && assessmentPercent >= 90 ? 'Strong exercise technique' : assessmentPercent !== null && assessmentPercent >= 70 ? 'Good progress, refine your technique' : 'Practice required'}</strong><small>Educational rubric · not a clinical quality clearance</small></div><span>{assessmentPercent === null ? '—' : `${assessmentPercent}%`}</span></div>
        <details className="game-review-details"><summary>View assessment breakdown <span>↗</span></summary>
          {assessment.items.map(item => <div key={item.id}><span>{item.label}</span><b>{item.earned}/{item.points}</b>{item.earned < item.points && <small>{item.feedback}</small>}</div>)}
          {assessment.criticalFailures.length > 0 && <p>{assessment.criticalFailures.join(' · ')}</p>}
        </details>
      </>}
      <div className="game-disposition"><span>IMAGE QUALITY DECISION</span><p>Would you accept this image for the simulated examination, or return to correct its technique? Repeats should only be considered when clinically justified.</p>
        <div>
          <button type="button" aria-pressed={disposition === 'accept'} onClick={() => setDisposition('accept')}>Accept image</button>
          <button type="button" aria-pressed={disposition === 'repeat'} onClick={() => setDisposition('repeat')}>Consider repeat</button>
        </div>
        {disposition && <p role="status" className={disposition === 'accept' && hasTechnicalDefect ? 'is-warning' : ''}>{!assessment ? 'No scored technical assessment is available. Inspect the synthetic image before deciding.' : disposition === 'repeat' ? hasTechnicalDefect ? `Consider correcting: ${keyIssue}. Discuss whether a repeat is justified before another exposure.` : 'This image meets the scored checks. Avoid unnecessary repeat exposure; review the image before deciding.' : hasTechnicalDefect ? `Review flagged a concern: ${keyIssue}. Check suitability before accepting.` : 'The scored image and safety checks support accepting this simulated acquisition.'}</p>}
      </div>
      <button className="game-primary" onClick={onImage}>Inspect radiograph <ArrowRightIcon /></button>
      {disposition === 'repeat' && !onRepeat && <p className="game-review-unavailable" role="status">A repeat is unavailable in this exercise. Inspect the image and choose how to document this capture.</p>}
      <button className="game-secondary" disabled={!disposition || (disposition === 'repeat' && !onRepeat)} onClick={() => { if (disposition === 'repeat') onRepeat?.(); else if (disposition === 'accept') onNext(); }}>{disposition === 'repeat' ? 'Return to patient positioning' : 'Finish case · register next patient'}</button>
    </div>
  </section>;
}
