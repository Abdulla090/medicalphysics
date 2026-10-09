import { memo, useEffect, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, Crosshair2Icon, FileTextIcon } from '@radix-ui/react-icons';
import { calculateMetrics, getReadinessChecks } from './physics';
import { getProtocol, PROTOCOLS } from './protocols';
import type { ProtocolId, SimulatorState } from './types';
import { PREPARATION_ITEMS, type ClinicalCase, type PreparationRecord } from './clinicalCases';

interface LearningHUDProps {
  state: SimulatorState;
  acquired: boolean;
  busy: boolean;
  guided: boolean;
  patientPrepared: boolean;
  operatorInControlRoom: boolean;
  clinicalCase: ClinicalCase;
  preparation: PreparationRecord;
  onOpenChart: () => void;
  onProtocol: (id: ProtocolId) => void;
  onGuide: () => void;
  onReview: () => void;
}

/** The guide reports live setup checks; it never awards a clinical competency score. */
export function LearningHUD({ state, acquired, busy, guided, patientPrepared, operatorInControlRoom, clinicalCase, preparation, onOpenChart, onProtocol, onGuide, onReview }: LearningHUDProps) {
  const [expanded, setExpanded] = useState(false);
  const [focus, setFocus] = useState<'sharpness' | 'noise' | 'coverage'>('sharpness');
  const protocol = getProtocol(state.protocol);
  const checks = getReadinessChecks(state);
  const metrics = calculateMetrics(state);
  const passed = (ids: string[]) => checks.filter(check => ids.includes(check.id)).every(check => check.passed);
  const steps = [
    { title: 'Verify identity and prepare patient', detail: 'Open the case file, verify the clinical request and safety questions, then gown the patient in the private changing room.', done: patientPrepared && PREPARATION_ITEMS.every(item => preparation[item.key]) },
    { title: 'Position the patient', detail: 'Check centering, projection and arm position.', done: passed(['centering', 'rotation', 'arms']) },
    { title: 'Shape the beam and arm detector', detail: 'Inspect the light field, coverage, technique and receptor. Instruct the patient to suspend respiration.', done: passed(['coverage', 'parameters', 'detector', 'breath']) },
    { title: 'Enter the protected control room', detail: 'From the corridor, enter the separate radiographer room. Close its lead door behind you.', done: operatorInControlRoom },
    { title: 'Acquire and critically inspect', detail: 'Aim at the workstation. Press E to prepare and E again to acquire. Review anatomy, positioning and noise.', done: acquired },
  ];
  const current = steps.findIndex(step => !step.done);
  const lessons = {
    sharpness: { title: 'Geometric sharpness', value: Number.isFinite(metrics.unsharpness) ? `${metrics.unsharpness.toFixed(3)} mm` : '—', detail: 'The model estimates detector-plane penumbra. Reduce object-to-detector gap and use a smaller focal spot to reduce geometric blur.' },
    noise: { title: 'Relative exposure', value: Number.isFinite(metrics.relativeExposure) ? `${metrics.relativeExposure.toFixed(2)}×` : '—', detail: 'This is a relative model ratio, never a patient dose. Lower detector fluence increases visible quantum noise. Compare synthetic images at different mAs.' },
    coverage: { title: 'Field collimation', value: `${state.collimationWidth} × ${state.collimationHeight} cm`, detail: 'Shape the field to the required anatomy. A smaller field generally reduces scatter production; check that anatomy is not cut off.' },
  };
  const selectedLesson = lessons[focus];
  return <section className={`sim-learning ${expanded ? 'is-expanded' : ''} ${guided ? '' : 'is-free'}`} aria-label="Practice guide">
    <div className="sim-learning-heading"><span>{guided ? 'GUIDED PRACTICE' : 'FREE EXPLORATION'}</span><button aria-label={expanded ? 'Collapse practice guide' : 'Expand practice guide'} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}><ChevronDownIcon /></button></div>
    <label className="sim-sr-only" htmlFor="training-exam">Training examination</label>
    <select id="training-exam" value={state.protocol} disabled={busy} onChange={event => onProtocol(event.target.value as ProtocolId)}>{PROTOCOLS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    <span className="sim-learning-subtitle">{protocol.position === 'erect' ? 'Standing' : 'Supine'} projection <span>·</span> Synthetic adult</span>
    <button className="sim-learning-case-link" onClick={onOpenChart}><span>{clinicalCase.indication}</span><small>{clinicalCase.accession} · Open case and safety checks ↗</small></button>
    {expanded && guided && <div className="sim-learning-body">
      <div className="sim-learning-progress"><span>CLINICAL WORKFLOW</span><span>{steps.filter(step => step.done).length} / 5</span></div>
      <ol>{steps.map((step, index) => <li key={step.title} className={`${step.done ? 'is-complete' : ''} ${index === current ? 'is-current' : ''}`}><span>{step.done ? <CheckIcon /> : `0${index + 1}`}</span><div><strong>{step.title}</strong>{index === current && <p>{step.detail}</p>}</div></li>)}</ol>
      <div className="sim-learning-physics"><span className="sim-section-label">PHYSICS LAB / LIVE MEASUREMENTS</span><div className="sim-learning-focus" role="group" aria-label="Physics learning focus">{(['sharpness', 'noise', 'coverage'] as const).map(item => <button key={item} aria-pressed={focus === item} onClick={() => setFocus(item)}>{item}</button>)}</div><div className="sim-learning-metric"><span>{selectedLesson.title}</span><strong>{selectedLesson.value}</strong></div><p>{selectedLesson.detail}</p></div>
      {acquired && <button className="sim-learning-review" onClick={onReview}>Review latest image<ChevronRightIcon /></button>}
      <button className="sim-learning-guide" onClick={onGuide}><FileTextIcon />Positioning guide<ChevronRightIcon /></button>
    </div>}
    {expanded && !guided && <p className="sim-explore-copy">Explore the patient changing room, the protected radiographer station, clinical gallery and courtyard. Return to Imaging 01 for hands-on practice.</p>}
  </section>;
}

/** Navigation telemetry updates only this small HUD, never the Three.js scene tree. */
export const CampusMap = memo(function CampusMap() {
  const marker = useRef<SVGGElement>(null);
  const zoneLabel = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(() => !window.matchMedia('(max-width: 860px)').matches);
  useEffect(() => {
    const update = (event: Event) => {
      const { x, z, zone, yaw = 0 } = (event as CustomEvent<{ x: number; z: number; zone: string; yaw?: number }>).detail;
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      marker.current?.setAttribute('transform', `translate(${17 + (x + 6.6) * 9},${14 + (z + 3.25) * 9}) rotate(${-yaw * 180 / Math.PI})`);
      if (zoneLabel.current) zoneLabel.current.textContent = zone;
    };
    window.addEventListener('xray-location', update);
    return () => window.removeEventListener('xray-location', update);
  }, []);
  return <section className={`sim-campus-map ${expanded ? 'is-expanded' : ''}`} aria-label="Campus map">
    <button className="sim-map-heading" aria-label="Toggle campus map" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}><Crosshair2Icon /><span ref={zoneLabel}>Imaging room</span><ChevronDownIcon /></button>
    <div className="sim-map-drawing">
      <svg viewBox="0 0 184 178" role="img" aria-label="Department floor plan including imaging, radiographer control, patient changing, corridor, gallery, and courtyard. A bright marker shows your location.">
        <path d="M46 14H107V72.5H46Z" fill="#223536" stroke="#78918a" strokeWidth="1.5" />
        <path d="M107 14H137.6V72.5H107Z" fill="#364d47" stroke="#78918a" strokeWidth="1.5" />
        <path d="M17 72.5H46V99.5H17Z" fill="#3d554b" stroke="#78918a" strokeWidth="1.5" />
        <path d="M46 72.5H153V99.5H46Z" fill="#283e3c" stroke="#78918a" strokeWidth="1.5" />
        <path d="M46 99.5H85V137.75H46Z" fill="#304d44" stroke="#78918a" strokeWidth="1.5" />
        <path d="M85 99.5H153V153.5H85Z" fill="#426658" stroke="#78918a" strokeWidth="1.5" />
        <path d="M73 72.5H87M117 72.5H128M46 82V93" stroke="#c4d9cc" strokeWidth="2.5" />
        <rect x="64" y="37" width="10" height="25" rx="2" fill="#879b98" /><rect x="78" y="24" width="6" height="8" rx="1" fill="#879b98" />
        <circle cx="112" cy="125" r="10" fill="#7e997b" /><circle cx="136" cy="141" r="6" fill="#7e997b" />
        <text x="51" y="26">01 / IMAGING</text><text x="110" y="29">CONTROL</text><text x="21" y="84">GOWN</text><text x="51" y="88">CLINICAL CORRIDOR</text><text x="49" y="119">GALLERY</text><text x="98" y="163">COURTYARD</text>
        <g ref={marker} transform="translate(95.57,63.95) rotate(21.7)"><path d="M0 0L-9 -19Q0 -25 9 -19Z" fill="#b4efd329" /><circle r="4" fill="#c1f5db" stroke="#142928" strokeWidth="1.5" /><path d="M0 -8L-2 -4H2Z" fill="#c1f5db" /></g>
      </svg>
      <span className="sim-map-caption"><i />YOU <span>LEVEL 01</span></span>
    </div>
  </section>;
});
