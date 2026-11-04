import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckIcon, DownloadIcon, FileTextIcon, PauseIcon, PlayIcon, PlusIcon, ResetIcon, TrashIcon, ReaderIcon } from '@radix-ui/react-icons';
import { useLanguage } from '@/contexts/LanguageContext';
import LabShell from '@/labs/LabShell';
import PendulumBench, { type RunStatus } from '@/labs/PendulumBench';
const ApparatusBench = lazy(() => import('@/labs/ApparatusBench'));
import Analysis from '@/labs/Analysis';
import LabManual from '@/labs/LabManual';
import { experiments } from '@/labs/catalog';
import { labText } from '@/labs/i18n';
import { pendulumPeriod, readingsCSV, STANDARD_GRAVITY, validReading, type ExperimentId, type Reading, type ReadingSource } from '@/labs/physics';

interface Notebook { version: 1; experiment: ExperimentId; readings: Reading[]; notes: string; student: string; source: ReadingSource }
function loadNotebook(experiment: ExperimentId): { data: Notebook; error: boolean } {
  const empty: Notebook = { version: 1, experiment, readings: [], notes: '', student: '', source: 'simulation' };
  try {
    const raw = localStorage.getItem(`physics-lab:v1:${experiment}`);
    if (!raw) return { data: empty, error: false };
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || parsed.experiment !== experiment || !Array.isArray(parsed.readings) || !parsed.readings.every(validReading)) return { data: empty, error: true };
    return { data: { ...empty, readings: parsed.readings.slice(0, 500), notes: typeof parsed.notes === 'string' ? parsed.notes.slice(0, 10000) : '', student: typeof parsed.student === 'string' ? parsed.student.slice(0, 200) : '', source: parsed.source === 'bench' ? 'bench' : 'simulation' }, error: false };
  } catch { return { data: empty, error: true }; }
}

function RangeField({ label, help, value, min, max, step, unit, disabled, onChange, digits = 0 }: { label: string; help?: string; value: number; min: number; max: number; step: number; unit: string; disabled?: boolean; onChange: (n: number) => void; digits?: number }) {
  const id = `lab-range-${label.replace(/\s/g, '-')}`;
  return <div className="lab-range-field"><div className="lab-field-top"><label htmlFor={id}>{label}</label><output htmlFor={id} dir="ltr">{value.toFixed(digits)} <span>{unit}</span></output></div><input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e => onChange(Number(e.target.value))} aria-describedby={help ? `${id}-help` : undefined}/>{help && <p id={`${id}-help`} className="sr-only">{help}</p>}</div>;
}

function Workspace({ experiment }: { experiment: ExperimentId }) {
  const { language } = useLanguage();
  const t = labText[language];
  const definition = experiments.find(e => e.id === experiment)!;
  const pendulum = experiment === 'simple-pendulum';
  const hooke = experiment === 'hookes-law';
  const [initial] = useState(() => loadNotebook(experiment));
  const [readings, setReadings] = useState(initial.data.readings);
  const [notes, setNotes] = useState(initial.data.notes);
  const [student, setStudent] = useState(initial.data.student);
  const [source, setSource] = useState<ReadingSource>(initial.data.source);
  const [storageError, setStorageError] = useState(initial.error);
  const [tab, setTab] = useState<'experiment' | 'analysis' | 'manual'>('experiment');
  const [length, setLength] = useState(0.8);
  const [angle, setAngle] = useState(8);
  const [mass, setMass] = useState(100);
  const [cycles, setCycles] = useState(10);
  const [speed, setSpeed] = useState(1);
  const [status, setStatus] = useState<RunStatus>('idle');
  const [runId, setRunId] = useState(0);
  const [teaching, setTeaching] = useState(false);
  const [input, setInput] = useState(hooke ? 100 : 3);
  const [constant, setConstant] = useState(hooke ? 20 : 100);
  const [powered, setPowered] = useState(true);
  const [apparatusReady, setApparatusReady] = useState(true);
  const togglePower = useCallback(() => setPowered(v => !v), []);
  const stepVoltage = useCallback(() => setInput(v => v >= 12 ? 0.5 : v + 0.5), []);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualX, setManualX] = useState('');
  const [manualY, setManualY] = useState('');
  const [manualCycles, setManualCycles] = useState('10');
  const [formError, setFormError] = useState(false);
  const storageMounted = useRef(false);
  const printWasPaused = useRef(false);
  const busy = status === 'running' || status === 'paused';
  const atLimit = readings.length >= 500;
  const selected = readings.filter(r => r.source === source);

  useEffect(() => {
    if (!storageMounted.current) { storageMounted.current = true; return; }
    try {
      localStorage.setItem(`physics-lab:v1:${experiment}`, JSON.stringify({ version: 1, experiment, readings, notes, student, source } satisfies Notebook));
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [experiment, readings, notes, student, source]);

  useEffect(() => {
    const previous = document.title;
    document.title = `${language === 'ku' ? definition.titleKu : definition.title} · ${t.labs}`;
    return () => { document.title = previous; };
  }, [definition.title, definition.titleKu, language, t.labs]);

  useEffect(() => {
    const before = () => { if (status === 'running') { printWasPaused.current = true; setStatus('paused'); } };
    const after = () => { if (printWasPaused.current) { printWasPaused.current = false; setStatus('running'); } };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after); };
  }, [status]);

  const onComplete = useCallback((elapsed: number) => {
    setReadings(previous => [...previous, { id: crypto.randomUUID(), x: length, elapsed, cycles, y: (elapsed / cycles) ** 2, source: 'simulation' as const, angle, mass: mass / 1000, createdAt: new Date().toISOString() }].slice(0, 500));
    setSource('simulation');
    setStatus('completed');
  }, [length, cycles, angle, mass]);

  const recordStatic = () => {
    if (atLimit || !apparatusReady || (!hooke && !powered)) return;
    const force = input / 1000 * STANDARD_GRAVITY;
    setReadings(previous => [...previous, { id: crypto.randomUUID(), x: hooke ? force / constant : input / constant, y: hooke ? force : input, elapsed: 1, cycles: 1, source: 'simulation', createdAt: new Date().toISOString() }]);
    setSource('simulation');
  };
  const start = () => {
    if (atLimit) return;
    if (status !== 'paused') setRunId(n => n + 1);
    setStatus('running');
  };
  const reset = () => { setStatus('idle'); setRunId(n => n + 1); };
  const download = () => {
    const url = URL.createObjectURL(new Blob([readingsCSV(experiment, selected)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url; link.download = `${experiment}-${source}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    const x = Number(manualX); const y = Number(manualY); const n = pendulum ? Number(manualCycles) : 1;
    const reading: Reading = { id: crypto.randomUUID(), x, elapsed: pendulum ? y : 1, cycles: n, y: pendulum ? (y / n) ** 2 : y, source: 'bench', createdAt: new Date().toISOString() };
    if (!manualX.trim() || !manualY.trim() || y <= 0 || !validReading(reading) || atLimit) { setFormError(true); return; }
    setReadings(previous => [...previous, reading]); setSource('bench'); setFormError(false); setManualY('');
  };
  const objective = pendulum ? t.pendulumObjective : hooke ? t.hookeObjective : t.ohmObjective;
  const tabs = ['experiment', 'analysis', 'manual'] as const;

  return <LabShell><section className="lab-experiment-intro"><div><div className="lab-crumb"><Link to="/labs">{t.labs}</Link><span>/</span><span>{t.stage}</span></div><h1>{language === 'ku' ? definition.titleKu : definition.title}</h1><p className="lab-print-objective">{objective}</p></div><div className="lab-intro-actions"><button className="lab-button lab-secondary" onClick={() => window.print()}><FileTextIcon/>{t.print}</button><span className="lab-intro-equation" dir="ltr">{definition.equation}</span></div></section>
    <div className="lab-workspace-bar"><div className="lab-tabs" role="tablist" aria-label={t.workspace}>{tabs.map(id => <button key={id} id={`lab-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls={`lab-panel-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} onKeyDown={e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const direction = (e.key === 'ArrowRight' ? 1 : -1) * (language === 'ku' ? -1 : 1);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (tabs.indexOf(id) + direction + 3) % 3;
      setTab(tabs[next]); document.getElementById(`lab-tab-${tabs[next]}`)?.focus();
    }}>{t[id]}{id === 'analysis' && selected.length > 0 && <span>{selected.length}</span>}</button>)}</div>{pendulum && <label className="lab-teaching-toggle"><input type="checkbox" checked={teaching} onChange={e => setTeaching(e.target.checked)}/><span>{t.instructor}</span></label>}</div>
    <div role="tabpanel" id="lab-panel-experiment" aria-labelledby="lab-tab-experiment" className="lab-experiment-panel" hidden={tab !== 'experiment'}>
      <div className="lab-workbench"><div className="lab-stage-area">{pendulum ? <PendulumBench length={length} angle={angle} mass={mass / 1000} cycles={cycles} speed={speed} runId={runId} status={status} onComplete={onComplete} t={t}/> : <Suspense fallback={<div className="lab-scene-loading" aria-busy="true">{t.apparatus}</div>}><ApparatusBench hooke={hooke} input={hooke ? input / 1000 : input} constant={constant} powered={powered} onTogglePower={togglePower} onVoltageStep={stepVoltage} onReady={setApparatusReady} t={t}/></Suspense>}</div>
        <aside className="lab-controls"><div className="lab-controls-title"><h2>{t.controls}</h2></div>
          {pendulum ? <><RangeField label={t.length} help={t.lengthHelp} min={0.3} max={1.5} step={0.01} value={length} unit="m" digits={2} onChange={n => { setLength(n); reset(); }} disabled={busy}/><RangeField label={t.angle} help={t.angleHelp} min={2} max={45} step={1} value={angle} unit="°" onChange={n => { setAngle(n); reset(); }} disabled={busy}/><RangeField label={t.mass} help={t.massHelp} min={50} max={500} step={10} value={mass} unit="g" onChange={n => { setMass(n); reset(); }} disabled={busy}/><div className="lab-select-field"><label htmlFor="lab-cycles">{t.oscillations}</label><select id="lab-cycles" value={cycles} onChange={e => { setCycles(Number(e.target.value)); reset(); }} disabled={busy}>{[5, 10, 20].map(n => <option key={n} value={n}>{n}</option>)}</select></div><div className="lab-speed"><span id="lab-speed-label">{t.speed}</span><div role="group" aria-labelledby="lab-speed-label">{[1, 2, 4].map(n => <button key={n} aria-pressed={speed === n} onClick={() => setSpeed(n)}>{n}×</button>)}</div></div>{angle > 10 && <p className="lab-warning">{t.smallAngle}</p>}
            {teaching && <div className="lab-prediction"><span>{t.predicted}</span><strong dir="ltr">{pendulumPeriod(length, STANDARD_GRAVITY, angle).toFixed(4)} s</strong><span>{t.gravity}</span><strong dir="ltr">{STANDARD_GRAVITY} m/s²</strong></div>}
            <div className="lab-run-actions"><button className="lab-button lab-primary" onClick={status === 'running' ? () => setStatus('paused') : start} disabled={atLimit && status !== 'running'}>{status === 'running' ? <PauseIcon/> : <PlayIcon/>}{status === 'running' ? t.pause : status === 'paused' ? t.resume : t.start}</button><button className="lab-icon-button" onClick={reset} aria-label={t.reset} title={`${t.reset}. ${t.resetNote}`}><ResetIcon/></button></div></> : <>{!hooke && <div className="lab-power-control"><span>{t.supply}</span><button type="button" role="switch" aria-checked={powered} aria-label={t.supply} onClick={togglePower}><span/></button></div>}<RangeField label={hooke ? t.load : t.voltage} min={hooke ? 50 : 0.5} max={hooke ? 500 : 12} step={hooke ? 10 : 0.5} value={input} unit={hooke ? 'g' : 'V'} digits={hooke ? 0 : 1} onChange={setInput}/><RangeField label={hooke ? t.spring : t.resistance} min={hooke ? 10 : 50} max={hooke ? 50 : 500} step={hooke ? 5 : 10} value={constant} unit={hooke ? 'N/m' : 'Ω'} onChange={setConstant} disabled={readings.some(r => r.source === 'simulation')}/><button className="lab-button lab-primary" onClick={recordStatic} disabled={atLimit || !apparatusReady || (!hooke && !powered)}><PlusIcon/>{t.record}</button></>}
          {atLimit && <p className="lab-warning" role="status">{t.storedLimit}</p>}

        </aside></div>
    </div>
    <div role="tabpanel" id="lab-panel-analysis" aria-labelledby="lab-tab-analysis" className="lab-analysis-panel" hidden={tab !== 'analysis'}><div className="lab-analysis-source"><span>{t.source}</span><div className="lab-segmented" role="group" aria-label={t.source}>{(['simulation', 'bench'] as const).map(s => <button key={s} aria-pressed={source === s} onClick={() => setSource(s)}>{t[s]}</button>)}</div></div><Analysis readings={selected} experiment={experiment} t={t}/></div>
    <div role="tabpanel" id="lab-panel-manual" aria-labelledby="lab-tab-manual" className="lab-manual-panel" hidden={tab !== 'manual'}><LabManual experiment={experiment} t={t} language={language}/></div>
    <section className="lab-notebook" hidden={tab === 'manual'} aria-label={t.notebook}><div className="lab-section-heading"><div><h2>{t.notebook}<span className="lab-count">{selected.length.toString().padStart(2, '0')}</span></h2></div><div className="lab-notebook-actions"><button className="lab-button lab-secondary" onClick={() => { setManualOpen(!manualOpen); setFormError(false); }} aria-expanded={manualOpen} aria-controls="lab-manual-entry" disabled={atLimit}><PlusIcon/>{t.addBench}</button><button className="lab-button lab-quiet" onClick={download} disabled={!selected.length}><DownloadIcon/>{t.export}</button></div></div>
      <div className="lab-notebook-meta"><label>{t.student}<input value={student} onChange={e => setStudent(e.target.value)} placeholder={t.studentPlaceholder} maxLength={200}/></label><div className="lab-segmented" role="group" aria-label={t.source}>{(['simulation', 'bench'] as const).map(s => <button key={s} aria-pressed={source === s} onClick={() => setSource(s)}>{t[s]}<span>{readings.filter(r => r.source === s).length}</span></button>)}</div></div>
      {manualOpen && <form id="lab-manual-entry" className="lab-manual-entry" onSubmit={addManual}><label>{pendulum ? t.readingX : hooke ? 'x / m' : 'I / A'}<input type="number" step="any" min="0.000001" max="10000" value={manualX} onChange={e => setManualX(e.target.value)} required autoFocus/></label><label>{pendulum ? t.readingY : hooke ? 'F / N' : 'V / V'}<input type="number" step="any" min="0.000001" max={pendulum ? '86400' : '1000000000'} value={manualY} onChange={e => setManualY(e.target.value)} required/></label>{pendulum && <label>{t.cyclesLabel}<input type="number" min="1" max="1000" step="1" value={manualCycles} onChange={e => setManualCycles(e.target.value)} required/></label>}<button className="lab-button lab-primary" type="submit">{t.add}</button><button className="lab-button lab-quiet" type="button" onClick={() => setManualOpen(false)}>{t.cancel}</button>{formError && <p className="lab-form-error" role="alert">{t.invalid}</p>}</form>}
      {!selected.length ? <div className="lab-notebook-empty"><h3>{t.emptyTitle}</h3></div> : <div className="lab-table-scroll"><table className="lab-observations"><caption className="sr-only">{t.notebook} · {t[source]}</caption><thead><tr><th>{t.trial}</th><th>{pendulum ? 'L / m' : hooke ? 'x / m' : 'I / A'}</th>{pendulum ? <><th>N</th><th>t / s</th><th>T / s</th><th>T² / s²</th><th>θ₀ / °</th></> : <th>{hooke ? 'F / N' : 'V / V'}</th>}<th>{t.source}</th><th className="lab-delete-col"><span className="sr-only">{t.delete}</span></th></tr></thead><tbody>{selected.map((r, i) => <tr key={r.id}><td className="lab-trial-number">{String(i + 1).padStart(2, '0')}</td><td>{r.x.toFixed(4)}</td>{pendulum ? <><td>{r.cycles}</td><td>{r.elapsed.toFixed(3)}</td><td>{(r.elapsed / r.cycles).toFixed(4)}</td><td>{((r.elapsed / r.cycles) ** 2).toFixed(4)}</td><td>{r.angle ?? '—'}</td></> : <td>{r.y.toFixed(4)}</td>}<td className="lab-source-cell">{r.source === 'simulation' ? t.model : t.physical}</td><td className="lab-delete-col"><button className="lab-delete-button" aria-label={`${t.delete} ${i + 1}`} onClick={() => setReadings(prev => prev.filter(item => item.id !== r.id))}><TrashIcon/></button></td></tr>)}</tbody></table></div>}
      <label className="lab-notes-label">{t.notes}<textarea aria-label={t.notes} value={notes} onChange={e => setNotes(e.target.value)} maxLength={10000} placeholder={t.notesPlaceholder} rows={3}/></label><p className="lab-print-notes">{t.source}: {t[source]}<br/>{t.notes}: {notes || '—'}</p><div className="lab-storage-status" role="status">{storageError ? <><span className="lab-warning">{t.saveError}</span></> : <><CheckIcon/>{t.saved}</>}</div>
    </section>

  </LabShell>;
}

export default function PhysicsExperiment() {
  const { experimentId } = useParams();
  const experiment = experiments.find(e => e.id === experimentId);
  if (!experiment) return <LabShell><div className="lab-not-found"><h1>Experiment not found</h1><Link className="lab-button lab-primary" to="/labs">Physics labs</Link></div></LabShell>;
  return <Workspace key={experiment.id} experiment={experiment.id}/>;
}
