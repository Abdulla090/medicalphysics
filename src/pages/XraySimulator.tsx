import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowUpIcon, ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, CameraIcon, CheckIcon, ChevronRightIcon, Cross2Icon, CubeIcon,
  DownloadIcon, EnterFullScreenIcon, EyeOpenIcon, FileTextIcon, InfoCircledIcon,
  LayersIcon, LightningBoltIcon, MixerHorizontalIcon, PersonIcon, PlayIcon,
  QuestionMarkCircledIcon, ResetIcon, SunIcon, TargetIcon,
} from '@radix-ui/react-icons';
import { AnatomyGlyph, Parameter, Toggle } from '@/simulator/Controls';
import { applyProtocol, DEFAULT_STATE, getProtocol, PROTOCOLS } from '@/simulator/protocols';
import { calculateMetrics, getReadinessChecks, renderPixelsToCanvas } from '@/simulator/physics';
import type { AnatomyView, CameraView, CapturedImage, ProtocolId, SimulatorState } from '@/simulator/types';
import { getWorldTargets, type WorldTargetId } from '@/simulator/worldInteraction';
import type { WorldAction } from '@/simulator/WorldInteractions';
import '@/simulator/simulator.css';

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

const CAMERA_VIEWS: { id: CameraView; label: string; icon: typeof CubeIcon }[] = [
  { id: 'room', label: 'Room', icon: CubeIcon },
  { id: 'patient', label: 'Patient', icon: PersonIcon },
  { id: 'tube', label: 'Tube', icon: TargetIcon },
  { id: 'detector', label: 'Detector', icon: LayersIcon },
];

function InfoDialog({ panel, onClose, state }: { panel: InfoPanel; onClose: () => void; state: SimulatorState }) {
  return <Dialog.Root open={!!panel} onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className="sim-dialog-overlay" /><Dialog.Content className="sim-info-dialog sim-font" dir="ltr">
      <div className="sim-dialog-heading"><span className="sim-eyebrow">MEDICALPHYSICS / RADIOGRAPHY STUDIO</span><Dialog.Close className="sim-icon-button" aria-label="Close information"><Cross2Icon /></Dialog.Close></div>
      <Dialog.Title>{panel === 'help' ? 'Your room. Your controls.' : panel === 'positioning' ? getProtocol(state.protocol).description : 'The model behind the image'}</Dialog.Title>
      <Dialog.Description>{panel === 'help' ? 'Move around the room, position the synthetic patient, and acquire a radiograph.' : panel === 'positioning' ? 'Positioning guidance for this training projection. Adapt real examinations to local protocols and the clinical indication.' : 'An inspectable analytical simulation with explicit limits.'}</Dialog.Description>
      {panel === 'help' ? <div className="sim-help-content">
        <ol><li><strong>Walk up to the equipment.</strong> Double-click the room for mouse look. A highlighted crosshair identifies equipment within reach.</li><li><strong>Position by hand.</strong> Hold and drag the patient or tube. Shift-drag rotates. At the patient, R changes the arms and B changes the breathing instruction.</li><li><strong>Set the technique.</strong> Aim at the tube or console. T selects a dial and the wheel adjusts it. E operates the detector, table, wall stand or barrier; N changes the examination at the relevant station.</li><li><strong>Acquire at the console.</strong> Walk around the barrier's left edge. With the barrier closed and detector armed, E prepares and a second E acquires. V opens your latest image.</li></ol>
        <div className="sim-key-guide"><div><kbd>W A S D</kbd><span>Walk / arrow keys also work</span></div><div><kbd>Shift / C</kbd><span>Move faster / crouch</span></div><div><kbd>Hold + drag</kbd><span>Move nearby patient or tube</span></div><div><kbd>Shift + drag</kbd><span>Rotate patient or tube</span></div><div><kbd>E / T / wheel</kbd><span>Use / select dial / adjust</span></div><div><kbd>Esc</kbd><span>Release mouse look / close review</span></div></div>
        <p>Drag empty room space to look without mouse lock. On touch screens, use the movement pad, drag equipment to position it, and tap nearby switches. Room, Patient, Tube and Detector provide inspection views. Technique reference shows numeric settings.</p>
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
  const [barrierClosed, setBarrierClosed] = useState(true);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [holding, setHolding] = useState(false);
  const [roomStarted, setRoomStarted] = useState(false);
  const [consoleVisible, setConsoleVisible] = useState(false);
  const [roomDial, setRoomDial] = useState(0);
  const [status, setStatus] = useState('Room ready. Set your technique, then prepare exposure.');
  const workerRef = useRef<Worker | null>(null);
  const captureRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const protocol = getProtocol(state.protocol);
  const metrics = calculateMetrics(state);
  const checks = getReadinessChecks(state);
  const blocked = checks.some((check) => check.blocking && !check.passed);
  const warnings = checks.filter((check) => !check.passed && !check.blocking);
  const busy = phase === 'exposing';
  const immersive = view === 'first-person';
  const target = getWorldTargets(state).find((item) => item.id === (hoveredTarget ?? (holding ? selectedTarget : null)));
  const dial = ROOM_DIALS[roomDial];

  useEffect(() => { if (walking || pointerLocked || holding) setRoomStarted(true); }, [walking, pointerLocked, holding]);

  useEffect(() => {
    const lock = () => setPointerLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', lock);
    return () => document.removeEventListener('pointerlockchange', lock);
  }, []);

  useEffect(() => {
    if (info || reviewImage || consoleVisible || !immersive) {
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }, [info, reviewImage, consoleVisible, immersive]);

  useEffect(() => {
    if (!immersive) setState((previous) => ({ ...previous, shielded: barrierClosed }));
  }, [immersive, barrierClosed]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Radiography Studio · MedicalPhysics';
    return () => { document.title = previousTitle; workerRef.current?.terminate(); if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const update = useCallback(<K extends keyof SimulatorState>(key: K, value: SimulatorState[K]) => {
    setState((previous) => ({ ...previous, [key]: value }));
    setPhase('idle');
    setError('');
    setStatus('Settings updated. Prepare exposure to continue.');
  }, []);

  const selectProtocol = (id: ProtocolId) => {
    if (busy) return;
    setState((previous) => applyProtocol(previous, id));
    setPhase('idle');
    setError('');
    setStatus(`${getProtocol(id).name} selected. Check positioning before exposure.`);
    if (!immersive) setCameraReset((value) => value + 1);
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
    if (busy || blocked) return;
    if (phase === 'idle') {
      setPhase('prepared');
      setStatus('Exposure prepared. The next press acquires the synthetic image.');
      return;
    }
    const snapshot = { ...state };
    const id = `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
    captureRef.current = id;
    setPhase('exposing');
    setError('');
    setStatus('Acquiring the projected image…');
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
          setImages((previous) => [image, ...previous].slice(0, 8));
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
    setState(applyProtocol({ ...DEFAULT_STATE, shielded: immersive ? false : barrierClosed }, state.protocol));
    setPhase('idle'); setError(''); setCameraReset((value) => value + 1);
    setStatus('Examination settings and room view reset.');
  };

  const exportSession = () => {
    const data = { model: 'MedicalPhysics analytical phantom v1', purpose: 'Synthetic training simulation', exportedAt: new Date().toISOString(), settings: state, captures: images.map(({ id, createdAt, state: settings, metrics: captureMetrics, width, height, warnings: observations }) => ({ id, createdAt: new Date(createdAt).toISOString(), settings, metrics: captureMetrics, width, height, observations })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `medicalphysics-session-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Session settings and acquisition metadata exported.');
  };

  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await viewportRef.current?.requestFullscreen(); }
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
    setState(next); setPhase('idle'); setError('');
    setStatus('Positioning changed in the room. Check the light field and receptor coverage.');
  }, []);

  const worldAction = (id: WorldTargetId, action: WorldAction) => {
    if (busy) return;
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
    if (id === 'patient') arms();
    else if (id === 'tube') update('lightField', !state.lightField);
    else if (id === 'detector') update('detectorReady', !state.detectorReady);
    else if (id === 'table') { if (protocol.position === 'erect') selectProtocol('chest-ap'); else setStatus('Patient on the table. Drag to position; N changes the supine examination.'); }
    else if (id === 'stand') selectProtocol('chest-pa');
    else if (id === 'barrier') { setBarrierClosed((previous) => !previous); setPhase('idle'); setStatus(barrierClosed ? 'Protective barrier opened.' : 'Protective barrier closed. Walk around its left side to the console.'); }
    else if (id === 'console') {
      if (!state.shielded) { setStatus('Move behind the closed barrier before preparing exposure.'); return; }
      if (!state.detectorReady) { setStatus('Arm the digital detector in the room before preparing exposure.'); return; }
      acquire();
    }
  };

  const targetHint = target?.id === 'patient' ? 'Hold and drag to position · Shift + drag to rotate · R arms · B breathing · [ ] body size'
    : target?.id === 'tube' ? 'Hold and drag the tube · Shift + drag to angle · T choose dial · wheel adjust · L light · G grid · X focal spot'
    : target?.id === 'table' ? 'E position patient supine · drag to move the patient · N change examination'
    : target?.id === 'stand' ? 'E position patient at the wall stand · N choose standing projection'
    : target?.id === 'detector' ? `E ${state.detectorReady ? 'disarm' : 'arm'} receptor · G grid · N change projection`
    : target?.id === 'barrier' ? `E ${barrierClosed ? 'open' : 'close'} barrier · enter the console area around the left edge`
    : target?.id === 'console' ? 'T choose dial · wheel adjust · E prepare / expose · V review image · N examination'
    : 'Walk up to the patient or equipment. Aim at it to interact.';

  return <div className={`sim-app sim-font ${immersive ? 'is-immersive' : ''} ${consoleVisible ? 'is-console-open' : ''}`} dir="ltr" lang="en" data-exposure-state={phase}>
    <header className="sim-topbar">
      <Link to="/" className="sim-brand" aria-label="Back to MedicalPhysics"><span className="sim-brand-symbol"><svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M6 6h6v6H6zM16 6h6v6h-6zM6 16h6v6H6z" fill="currentColor" /><path d="m16 19 3-3 3 3-3 3-3-3Z" stroke="currentColor" strokeWidth="2" /></svg></span><span>medical<span>physics</span></span></Link>
      <div className="sim-top-divider" /><span className="sim-workspace-title">Simulation workspace</span>
      <span className="sim-training-badge"><span />Training environment</span>
      <div className="sim-top-actions"><button className="sim-text-button" aria-label="Model & validation" onClick={() => setInfo('model')}><InfoCircledIcon /><span>Model & validation</span></button><button className="sim-icon-button" aria-label="Simulator help" onClick={() => setInfo('help')}><QuestionMarkCircledIcon /></button><span className="sim-avatar" aria-label="MedicalPhysics workspace">MP</span></div>
    </header>

    <div className="sim-titlebar"><div><div className="sim-breadcrumb"><Link to="/tools">Tools</Link><ChevronRightIcon /><span>X-ray simulator</span></div><h1>Radiography studio<span className="sim-version">01</span></h1></div><div className="sim-title-actions"><button className="sim-outline-button" aria-label="Reset room" onClick={reset} disabled={busy}><ResetIcon /><span>Reset room</span></button><button className="sim-outline-button" aria-label="Export session" onClick={exportSession}><DownloadIcon /><span>Export session</span></button></div></div>

    <div className="sim-workspace">
      <aside className="sim-exam-panel" aria-label="Examination selection">
        <div className="sim-panel-heading"><span className="sim-section-label">EXAMINATION</span><span className="sim-small-count">05</span></div>
        <div className="sim-exam-list">{PROTOCOLS.map((item) => <button key={item.id} disabled={busy} className={`sim-exam ${state.protocol === item.id ? 'is-active' : ''}`} onClick={() => selectProtocol(item.id)} aria-pressed={state.protocol === item.id}><AnatomyGlyph region={item.region} className="sim-exam-glyph" /><span><strong>{item.name}</strong><small>{item.position === 'erect' ? 'Standing' : 'Supine'} · {item.projection === 'LAT' ? 'Lateral' : item.projection}</small></span>{state.protocol === item.id ? <span className="sim-exam-selected"><CheckIcon /></span> : <ChevronRightIcon className="sim-exam-chevron" />}</button>)}</div>
        <button className="sim-positioning-link" onClick={() => setInfo('positioning')}><FileTextIcon />Positioning guide<ChevronRightIcon /></button>
        <div className="sim-equipment"><span className="sim-section-label">ROOM EQUIPMENT</span><button onClick={() => { setView('tube'); setTab('exposure'); }}><TargetIcon /><span>Ceiling-mounted tube<small>Adjustable collimator</small></span><ChevronRightIcon /></button><button onClick={() => { setView('detector'); setTab('position'); }}><LayersIcon /><span>Digital detector<small>35 × 43 cm active area</small></span><ChevronRightIcon /></button><button onClick={() => { setView('room'); setTab('position'); }}><CubeIcon /><span>Radiolucent table<small>Floating carbon tabletop</small></span><ChevronRightIcon /></button></div>
        <div className="sim-panel-footer"><span className="sim-ready-dot" /><span>Procedural room assets<br /><small>Built locally with Three.js</small></span></div>
      </aside>

      <main className="sim-main">
        <div className="sim-mobile-protocol"><label htmlFor="mobile-exam">Examination</label><select id="mobile-exam" value={state.protocol} disabled={busy} onChange={(event) => selectProtocol(event.target.value as ProtocolId)}>{PROTOCOLS.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.position}</option>)}</select></div>
        <div className="sim-viewport" ref={viewportRef}>
          <Suspense fallback={<div className="sim-scene-loading"><div className="sim-scene-skeleton" /><span>Preparing the radiography room</span><small>Building equipment and anatomy</small></div>}><XrayScene state={state} view={view} cameraReset={cameraReset} exposing={busy} onSelect={selectObject} onWalkChange={setWalking} latestImage={images[0]} world={{ barrierClosed, onHover: setHoveredTarget, onSelect: setSelectedTarget, onAction: worldAction, onManipulate: manipulate, onProtectionChange: protectionChanged, onGrip: setHolding, paused: !!info || !!reviewImage || consoleVisible || busy }} /></Suspense>
          <div className="sim-scene-head"><div><span className="sim-scene-overline">DIGITAL RADIOGRAPHY</span><span className="sim-room-label">Room 01 <span>/</span> {protocol.position === 'erect' ? 'Wall stand' : 'Table bucky'}</span></div><span className={`sim-scene-status ${busy ? 'is-exposing' : ''}`}><span />{busy ? 'Acquiring image' : 'System online'}</span></div>
          <div className="sim-scene-side"><button className="sim-scene-icon" onClick={fullscreen} aria-label="Toggle room fullscreen" title="Fullscreen"><EnterFullScreenIcon /></button><button className="sim-scene-icon" onClick={() => setCameraReset((value) => value + 1)} aria-label="Reset camera view" title="Reset view"><ResetIcon /></button><button className="sim-scene-icon" onClick={() => update('showLabels', !state.showLabels)} aria-label="Toggle equipment labels" aria-pressed={state.showLabels} title="Equipment labels"><InfoCircledIcon /></button></div>
          <div className="sim-scene-bottom"><div className="sim-camera-views" aria-label="Camera view">{CAMERA_VIEWS.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} aria-label={label} aria-pressed={view === id} className={view === id ? 'is-active' : ''}><Icon /><span>{label}</span></button>)}<span className="sim-camera-divider" /><button className={view === 'first-person' ? 'is-active' : ''} onClick={() => setView(view === 'first-person' ? 'room' : 'first-person')} aria-pressed={view === 'first-person'}><EyeOpenIcon /><span>Walk</span></button></div><button className={`sim-light-button ${state.lightField ? 'is-active' : ''}`} onClick={() => update('lightField', !state.lightField)} disabled={busy} aria-pressed={state.lightField}><SunIcon /><span>Light field</span></button></div>
          <div className="sim-navigation-hint">{immersive ? walking ? 'WASD to walk · Shift faster · C crouch · Esc to release' : 'Double-click the room for mouse look · WASD to walk · drag to look' : 'Drag to orbit · scroll to zoom · click equipment to inspect'}</div>
          {immersive && <>
            <div className={`sim-crosshair ${hoveredTarget ? 'is-targeted' : ''} ${holding ? 'is-holding' : ''}`} aria-hidden="true"><span /><span /></div>
            {!roomStarted && <div className="sim-world-brief"><span className="sim-eyebrow">FIRST PERSON / {protocol.name.toUpperCase()}</span><strong>Operate the room</strong><p>Position the patient, align the tube, then walk behind the barrier to acquire.</p><button className="sim-outline-button" onClick={() => window.dispatchEvent(new Event('xray-roam'))}><EyeOpenIcon />Enter mouse look</button></div>}
            <div className={`sim-world-target ${hoveredTarget ? 'is-within-reach' : ''}`} role="status" aria-live="polite" data-world-target={hoveredTarget ?? ''}><div><kbd>{holding ? 'GRIP' : hoveredTarget ? 'E' : 'WASD'}</kbd><strong>{holding ? `Positioning ${target?.label ?? 'equipment'}` : target?.label ?? 'Explore the room'}</strong></div><p>{targetHint}</p>{(target?.id === 'tube' || target?.id === 'console') && <span className="sim-world-dial">{dial.label}<b>{state[dial.key]} <small>{dial.unit}</small></b></span>}</div>
            <div className="sim-world-safety"><span className={state.shielded ? 'is-safe' : ''} />{state.shielded ? 'Behind closed protective barrier' : 'Outside protected console area'}<b>{state.kvp} kVp / {metrics.mas.toFixed(2)} mAs</b></div>
            <button className="sim-world-console-toggle sim-outline-button" onClick={() => setConsoleVisible((previous) => !previous)} aria-expanded={consoleVisible}><MixerHorizontalIcon />{consoleVisible ? 'Close technique' : 'Technique reference'}</button>
          </>}
          {view === 'first-person' && <WalkPad />}
          <div className="sim-anatomy-selector" aria-label="Anatomy display">{(['surface', 'skeleton', 'organs'] as AnatomyView[]).map((layer) => <button key={layer} disabled={busy} onClick={() => update('anatomy', layer)} className={state.anatomy === layer ? 'is-active' : ''} aria-pressed={state.anatomy === layer}>{layer === 'surface' ? <PersonIcon /> : layer === 'skeleton' ? <LayersIcon /> : <MixerHorizontalIcon />}<span>{layer}</span></button>)}</div>
          {phase === 'prepared' && <div className="sim-prepared-strip"><LightningBoltIcon />{immersive ? 'Exposure prepared · aim at console and press E to acquire' : 'Exposure prepared · press Expose to acquire'}</div>}
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
            {immersive ? <p className="sim-field-note">Operator protection follows your position and the physical barrier in the room.</p> : <Toggle label="Lead screen closed" detail="Operator at the shielded console" checked={state.shielded} onChange={(value) => update('shielded', value)} />}
            <div className="sim-patient-note"><InfoCircledIcon /><p>Patient controls change the mathematical phantom. Surface anatomy is illustrative; internal structures drive the image.</p></div>
          </>}
        </fieldset></div>
        <div className="sim-exposure-controls"><div className="sim-checklist-header"><span className="sim-section-label">ACQUISITION CHECK</span><span className={blocked || warnings.length ? 'sim-check-warning' : 'sim-check-good'}>{blocked ? 'Interlock open' : warnings.length ? `${warnings.length} observation${warnings.length > 1 ? 's' : ''}` : 'Ready'}</span></div><div className="sim-checklist">{checks.filter((check) => check.id !== 'parameters').map((check) => <div key={check.id} title={check.detail} className={check.passed ? 'is-passed' : 'is-failed'}><span>{check.passed ? <CheckIcon /> : <InfoCircledIcon />}</span><small>{check.label}</small></div>)}</div>{blocked && <p className="sim-blocked-message">{checks.find((check) => check.blocking && !check.passed)?.detail}</p>}{error && <p className="sim-error" role="alert">{error}</p>}<button className={`sim-expose-button ${phase === 'prepared' ? 'is-prepared' : ''}`} onClick={acquire} disabled={blocked || busy}>{busy ? <><span className="sim-acquisition-progress" />Acquiring image…</> : phase === 'prepared' ? <><LightningBoltIcon />Expose<span>{state.exposureMs} ms</span></> : <><PlayIcon />Prepare exposure<ChevronRightIcon /></>}</button>{phase !== 'idle' ? <button className="sim-cancel-exposure" onClick={cancelCapture}>Cancel {busy ? 'acquisition' : 'preparation'}</button> : <p className="sim-expose-note">Synthetic image · no radiation emitted</p>}</div>
      </aside>
    </div>
    <footer className="sim-statusbar"><span className="sim-live-status" role="status" aria-live="polite"><span className={busy ? 'is-busy' : ''} />{status}</span><button onClick={() => setInfo('model')}>Analytical training model<InfoCircledIcon /></button></footer>
    <InfoDialog panel={info} onClose={() => setInfo(null)} state={state} />
    {reviewImage && <Suspense fallback={null}><RadiographViewer image={reviewImage} onClose={() => setReviewImage(null)} /></Suspense>}
  </div>;
}
