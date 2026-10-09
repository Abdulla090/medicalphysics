import { useEffect, useRef, useState } from 'react';
import { ArrowRightIcon, CheckIcon, Cross2Icon, ExclamationTriangleIcon, MixerHorizontalIcon, ResetIcon } from '@radix-ui/react-icons';
import { observePhysicsExperiment, type LabDirection, type PhysicsTopic } from './physicsLab';
import type { SimulatorState } from './types';

export type { PhysicsTopic } from './physicsLab';
type Adjustable = 'sid' | 'focalSpot' | 'collimationWidth' | 'collimationHeight';
interface Props {
  topic: PhysicsTopic | null;
  state: SimulatorState;
  onChange: <K extends Adjustable>(key: K, value: SimulatorState[K]) => void;
  onClose: () => void;
}

const topics: Record<PhysicsTopic, { number: string; title: string; prompt: string; principle: string; trial: string; observe: string }> = {
  distance: {
    number: '01', title: 'Inverse-square experiment',
    prompt: 'When you move the X-ray source without changing exposure factors, how will the fluence reaching the detector change?',
    principle: 'Detector fluence depends on source-to-image distance. Compare the same mAs, kVp and receptor with only SID changed.',
    trial: 'Move the tube source away from the receptor. Keep the other parameters unchanged.',
    observe: 'The inverse-square effect changes the number of modeled detector photons. Follow the next radiograph for noise and projection changes.',
  },
  sharpness: {
    number: '02', title: 'Geometric sharpness lab',
    prompt: 'How will the modeled penumbra at the detector change when the focal spot or source geometry changes?',
    principle: 'Focal spot size, source distance and the object–receptor gap determine geometric unsharpness.',
    trial: 'Start with the focal spot. Compare the same projection at a different focal size.',
    observe: 'Read the modeled blur in millimeters, then acquire an image and compare edge sharpness. A detector response is also involved in real imaging.',
  },
  field: {
    number: '03', title: 'Collimation & anatomy',
    prompt: 'What happens to the active radiation field area when you adjust the collimator leaves?',
    principle: 'Collimation must include anatomy required by the referral while limiting unnecessary field size and scatter.',
    trial: 'Close the beam shutters deliberately and observe whether your target anatomy remains covered.',
    observe: 'A narrow field may reduce scatter but can remove anatomy needed for the clinical question. Confirm the actual image boundaries before any acceptance.',
  },
};

const inputSets: Record<PhysicsTopic, { key: Adjustable; label: string; unit: string; min: number; max: number; step: number }[]> = {
  distance: [{ key: 'sid', label: 'Source-to-image distance', unit: 'cm', min: 80, max: 200, step: 5 }],
  sharpness: [{ key: 'focalSpot', label: 'Focal spot dimension', unit: 'mm', min: .2, max: 1.8, step: .2 }, { key: 'sid', label: 'Source-to-image distance', unit: 'cm', min: 80, max: 200, step: 5 }],
  field: [{ key: 'collimationWidth', label: 'Beam width', unit: 'cm', min: 8, max: 35, step: 1 }, { key: 'collimationHeight', label: 'Beam height', unit: 'cm', min: 8, max: 43, step: 1 }],
};

function BeamDiagram({ initial, current }: { initial: SimulatorState; current: SimulatorState }) {
  const detectorX = 310;
  const initialSourceX = detectorX - initial.sid * 1.12;
  const sourceX = detectorX - current.sid * 1.12;
  const spread = 57 * current.collimationWidth / 35;
  const previousSpread = 57 * initial.collimationWidth / 35;
  return <svg className="sim-lab-beam" viewBox="0 0 360 176" role="img" aria-label={`Side view of beam source ${current.sid} centimeters from detector with a field ${current.collimationWidth} by ${current.collimationHeight} centimeters`}>
    <defs><linearGradient id="sim-lab-beam-wash" x1="0" x2="1"><stop offset="0" stopColor="#b4e7be" stopOpacity=".45" /><stop offset="1" stopColor="#b4e7be" stopOpacity=".08" /></linearGradient></defs>
    <rect x="0" y="0" width="360" height="176" rx="4" fill="#102723" />
    {Array.from({ length: 17 },(_,index) => <path key={index} d={`M${index * 22} 0V176`} stroke="#d9eeda" opacity=".045" />)}
    <path d={`M${initialSourceX} 88L${detectorX} ${88 - previousSpread}L${detectorX} ${88 + previousSpread}Z`} fill="none" stroke="#8ca6ac" strokeWidth="1.5" strokeDasharray="4 6" />
    <path d={`M${sourceX} 88L${detectorX} ${88 - spread}L${detectorX} ${88 + spread}Z`} fill="url(#sim-lab-beam-wash)" stroke="#b4ebbe" strokeWidth="1.7" />
    <rect x="283" y="32" width="16" height="112" rx="6" fill="#7b9c91" stroke="#a8d3bf" />
    <ellipse cx="291" cy="88" rx="9" ry="40" fill="#abcbb3" stroke="#d7ebd4" strokeWidth="1.5" />
    <rect x="309" y="24" width="6" height="128" rx="2" fill="#c5e1d7" />
    <rect x={sourceX - 12} y="76" width="21" height="24" rx="3" fill="#d9e9e2" stroke="#678976" />
    <circle cx={sourceX} cy="88" r={Math.max(2, current.focalSpot * 2.5)} fill="#f0d99d" />
    <text x="16" y="17" fill="#aed5bc" fontSize="9" fontFamily="monospace">BEAM GEOMETRY / SCHEMATIC</text>
    <text x="289" y="163" fill="#d2e8d5" textAnchor="middle" fontSize="8" fontFamily="monospace">PHANTOM</text>
    <text x="321" y="17" fill="#d2e8d5" textAnchor="middle" fontSize="8" fontFamily="monospace">DR</text>
    <text x={sourceX} y="117" fill="#e1edce" textAnchor="middle" fontSize="9" fontFamily="monospace">SOURCE</text>
    <path d={`M${sourceX} 134V139H${detectorX}V134`} stroke="#e1f0d5" strokeOpacity=".65" fill="none" />
    <text x={(sourceX + detectorX) / 2} y="152" textAnchor="middle" fill="#d6f5d4" fontSize="10" fontFamily="monospace">{current.sid} cm SID</text>
  </svg>;
}

function Experiment({ topic, state, onChange, onClose }: Props & { topic: PhysicsTopic }) {
  const [baseline] = useState(() => ({ ...state }));
  const [prediction, setPrediction] = useState<LabDirection | null>(null);
  const [revealed, setRevealed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const config = topics[topic];
  const observation = observePhysicsExperiment(topic, baseline, state);
  const modified = observation.direction !== 'unchanged';
  const predictionCorrect = prediction === observation.direction;
  const controls = inputSets[topic];
  useEffect(() => { closeRef.current?.focus(); }, []);
  const change = (key: Adjustable, value: number) => {
    onChange(key, value);
    setPrediction(null);
    setRevealed(false);
  };
  const resetTrial = () => {
    for (const control of controls) if (state[control.key] !== baseline[control.key]) onChange(control.key, baseline[control.key]);
    setPrediction(null);
    setRevealed(false);
  };
  return <section className="sim-workshop sim-lab-dialog" role="dialog" aria-modal="true" aria-label="Interactive physics laboratory" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
    <header><span><MixerHorizontalIcon /> RADIOGRAPHY TEACHING LAB <small>EXPERIMENT {config.number} / 03</small></span><button ref={closeRef} aria-label="Close physics laboratory" onClick={onClose}><Cross2Icon /></button></header>
    <div className="sim-workshop-body sim-lab-body"><div className="sim-workshop-eyebrow">PHYSICS PRACTICAL / INVESTIGATE → PREDICT → REVEAL</div>
      <h2>{config.title}</h2><p>{config.principle}</p>
      <div className="sim-lab-columns"><div className="sim-lab-primary">
        <div className="sim-lab-section"><span>01 / INVESTIGATE</span><strong>Change the X-ray setup.</strong><p>{config.trial}</p></div>
        <BeamDiagram initial={baseline} current={state} />
        <div className="sim-lab-controls">{controls.map(control => <label className="sim-lab-control" key={control.key}><span>{control.label}<b>{state[control.key].toFixed(control.key === 'focalSpot' ? 1 : 0)} {control.unit}</b></span><input type="range" min={control.min} max={control.max} step={control.step} value={state[control.key]} onChange={event => change(control.key, Number(event.target.value))} /><small>Starting point: {baseline[control.key]} {control.unit}</small></label>)}</div>
        <button className="sim-lab-reset" onClick={resetTrial}><ResetIcon /> Reset to starting setup</button>
      </div><div className="sim-lab-secondary">
        <div className="sim-lab-section"><span>02 / PREDICT</span><strong>Make a scientific prediction.</strong><p>{config.prompt}</p></div>
        <div className="sim-lab-hypothesis">Compared with your baseline, the <b>{observation.metric.toLowerCase()}</b> will…</div>
        <div className="sim-lab-choices">{([{ id: 'increase', label: 'Increase', hint: 'More or larger' }, { id: 'decrease', label: 'Decrease', hint: 'Less or smaller' }, { id: 'unchanged', label: 'Remain unchanged', hint: 'Same predicted value' }] as const).map(item => <label key={item.id} className={prediction === item.id ? 'is-selected' : ''}><input type="radio" name="sim-lab-prediction" value={item.id} checked={prediction === item.id} disabled={revealed} onChange={() => setPrediction(item.id)} /><span>{item.label}<small>{item.hint}</small></span></label>)}</div>
        <button className="sim-lab-reveal" disabled={!modified || !prediction || revealed} onClick={() => setRevealed(true)}>{!modified ? 'Change a control to run the experiment' : revealed ? 'Evidence revealed' : 'Reveal measured model outcome'} <ArrowRightIcon /></button>
        {revealed && <div className={`sim-lab-result ${predictionCorrect ? 'is-correct' : 'is-wrong'}`} role="status"><div>{predictionCorrect ? <CheckIcon /> : <ExclamationTriangleIcon />}<strong>{predictionCorrect ? 'Prediction supported' : 'Review your hypothesis'}</strong></div><span>{observation.metric.toUpperCase()}</span><div className="sim-lab-metric"><strong>{Number.isFinite(observation.baseline) ? observation.baseline.toFixed(topic === 'sharpness' ? 3 : 2) : '—'}</strong><span>→</span><strong>{Number.isFinite(observation.current) ? observation.current.toFixed(topic === 'sharpness' ? 3 : 2) : '—'}</strong><small>{observation.unit}</small></div><p>{observation.explanation}</p>{topic === 'field' && <p className={observation.coverageOkay ? 'sim-lab-coverage' : 'sim-lab-crop'}>{observation.coverageOkay ? 'Central reference anatomy remains in the estimated beam envelope.' : 'Anatomy crop flagged: the simplified reference envelope is no longer fully projected inside the collimated field.'}</p>}</div>}
      </div></div>
      <div className="sim-workshop-outcome"><strong>03 / APPLY IT TO THE NEXT EXPOSURE</strong><p>{config.observe} Your changed controls remain active in the simulator; acquire another synthetic radiograph to compare visual outcomes.</p></div>
      <button className="sim-workshop-return" onClick={onClose}>Return to clinical department <ArrowRightIcon /></button>
      <footer>Comparative physics model. Geometric metrics and detector fluence are illustrative; no patient-dose calibration, clinical technique prescription or competency claim.</footer>
    </div>
  </section>;
}

export function PhysicsWorkshop(props: Props) {
  if (!props.topic) return null;
  return <Experiment key={props.topic} {...props} topic={props.topic} />;
}
