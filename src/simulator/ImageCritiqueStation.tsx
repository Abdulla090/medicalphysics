import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowRightIcon, CheckIcon, Cross2Icon, ExclamationTriangleIcon, FileTextIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import type { ClinicalCase, SimulatedAssessment } from './clinicalCases';
import { CRITIQUE_FIELDS, evaluateImageCritique, summarizeImageCritique, type CritiqueAnswers, type CritiqueDecision } from './imageCritique';
import type { CapturedImage } from './types';
import { getProtocol } from './protocols';
import './imageCritique.css';

export type CritiqueReport = { answers: CritiqueAnswers; correct: number; total: number; needsReview: string[] };

function trapFocus(event: KeyboardEvent<HTMLElement>, onClose: () => void) {
  if (event.key === 'Escape') { event.stopPropagation(); onClose(); return; }
  if (event.key !== 'Tab') return;
  const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)'))
    .filter(item => item.getClientRects().length > 0);
  if (!controls.length) return;
  if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1].focus(); }
  if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0].focus(); }
}

/** The student must observe and interpret the captured projection before a disposition. */
export function ImageCritiqueStation({ image, clinicalCase, assessment, onInspect, onAccept, onRepeat, onClose }: {
  image: CapturedImage; clinicalCase: ClinicalCase; assessment: SimulatedAssessment | null;
  onInspect: () => void; onAccept: (report: CritiqueReport) => void;
  onRepeat: (report: CritiqueReport, reason: string) => void; onClose: () => void;
}) {
  const [answers, setAnswers] = useState<CritiqueAnswers>({});
  const [submitted, setSubmitted] = useState(false);
  const [decision, setDecision] = useState<'accept' | 'repeat' | null>(null);
  const [reason, setReason] = useState('');
  const dialog = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  const results = evaluateImageCritique(image, clinicalCase, answers);
  const summary = summarizeImageCritique(results);
  const complete = CRITIQUE_FIELDS.every(field => !!answers[field.id]);
  const report: CritiqueReport = { answers, correct: summary.correct, total: summary.total, needsReview: results.filter(result => result.expected === 'defect').map(result => result.title) };
  const choose = (id: typeof CRITIQUE_FIELDS[number]['id'], answer: CritiqueDecision) => {
    if (submitted) return;
    setAnswers(previous => ({ ...previous, [id]: answer }));
  };
  const submitDisposition = () => {
    if (!submitted || !decision) return;
    if (decision === 'repeat') { if (reason.trim().length >= 12) onRepeat(report, reason.trim()); }
    else onAccept(report);
  };
  return <div className="ic-backdrop">
    <section ref={dialog} className="ic-panel" role="dialog" aria-modal="true" aria-labelledby="ic-heading" aria-describedby="ic-description" onKeyDown={event => trapFocus(event, onClose)}>
      <header className="ic-header"><div className="ic-wordmark"><span className="ic-icon"><MagnifyingGlassIcon /></span><span><small>MEDICALPHYSICS / ACQUISITION REVIEW</small><strong>Digital image quality station</strong></span></div><div className="ic-header-actions"><span className="ic-chip">SYNTHETIC · TRAINING ONLY</span><button ref={closeButton} aria-label="Close image critique" onClick={onClose}><Cross2Icon /></button></div></header>
      <div className="ic-content"><div className="ic-film-column">
        <div className="ic-film-head"><span>EXAMINATION / {getProtocol(image.state.protocol).name.toUpperCase()}</span><span>{clinicalCase.accession}</span></div>
        <div className="ic-film"><img src={image.previewUrl} alt={`Synthetic ${getProtocol(image.state.protocol).name} for student image critique`} /><div className="ic-film-mark">TRAINING PHANTOM • NOT DIAGNOSTIC</div></div>
        <div className="ic-image-readout"><span>{image.state.kvp} <small>kVp</small></span><span>{image.metrics.mas.toFixed(2)} <small>mAs</small></span><span>{image.state.sid} <small>cm SID</small></span><span>{image.width} × {image.height} <small>px</small></span></div>
        <button className="ic-inspect" onClick={onInspect}><MagnifyingGlassIcon /> Inspect full-size image, window and zoom <ArrowRightIcon /></button>
        <div className="ic-guidance"><FileTextIcon /><div><strong>Examine before deciding.</strong><p>Look at anatomical inclusion, symmetry, projection and motion. Complete your own technical critique before the simulator reveals its setup checks.</p></div></div>
      </div><div className="ic-review-column">
        <div className="ic-review-overline">06 / RADIOGRAPHER QUALITY ASSURANCE</div>
        <h2 id="ic-heading">Defend your image.</h2>
        <p id="ic-description">A digital image appearing on screen does not mean it answers the clinical request. Record your judgement in each area, then compare it with the exercise evidence.</p>
        <div className="ic-progress"><span>{CRITIQUE_FIELDS.filter(field => !!answers[field.id]).length} / 4 criteria documented</span><div aria-hidden="true">{CRITIQUE_FIELDS.map(field => <i className={answers[field.id] ? 'is-filled' : ''} key={field.id} />)}</div></div>
        {CRITIQUE_FIELDS.map((field, index) => {
          const result = results[index];
          return <fieldset className="ic-criterion" key={field.id}><legend><span>{String(index + 1).padStart(2, '0')}</span>{field.title}</legend>
            <p>{field.question}</p><small>{field.tip}</small>
            <div className="ic-choices">{([{ id: 'acceptable', label: 'Adequate' }, { id: 'defect', label: 'Needs correction' }, { id: 'uncertain', label: 'Uncertain' }] as const).map(option => <label key={option.id} className={answers[field.id] === option.id ? 'is-selected' : ''}><input type="radio" name={`critique-${field.id}`} disabled={submitted} checked={answers[field.id] === option.id} onChange={() => choose(field.id, option.id)} /><span>{option.label}</span></label>)}</div>
            {submitted && <div className={`ic-evidence ${result.correct ? 'is-correct' : 'is-wrong'}`}><div>{result.correct ? <CheckIcon /> : <ExclamationTriangleIcon />}<strong>{result.correct ? 'Your assessment matches the exercise checks' : `Exercise flags: ${result.expected === 'defect' ? 'needs correction' : 'satisfactory'}`}</strong></div><p>{result.evidence}</p>{result.expected === 'defect' && <small>{result.correction}</small>}</div>}
          </fieldset>;
        })}
        {!submitted ? <button className="ic-primary" disabled={!complete} onClick={() => setSubmitted(true)}>Compare with training evidence <ArrowRightIcon /></button> : <div className="ic-verdict"><div className="ic-score"><span>YOUR TECHNICAL CRITIQUE</span><strong>{summary.correct}<small> / {summary.total} criteria</small></strong></div><p>{summary.missed.length ? `${summary.missed.length} judgement${summary.missed.length === 1 ? '' : 's'} differ from the simulated setup. Revisit the image and feedback before deciding.` : 'Your observations match the four simplified setup checks. Review the actual image critically before signing off.'}</p>
          {assessment?.criticalFailures.length ? <div className="ic-critical"><ExclamationTriangleIcon /><span>{assessment.criticalFailures[0]}</span></div> : null}
          <div className="ic-disposition"><strong>Document a disposition</strong><p>Choose how to proceed with this fictional examination. A repeat needs a specific technical reason.</p><div className="ic-disposition-options"><button aria-pressed={decision === 'accept'} onClick={() => setDecision('accept')}>Accept for this exercise</button><button aria-pressed={decision === 'repeat'} onClick={() => setDecision('repeat')}>Consider corrective repeat</button></div></div>
          {decision === 'repeat' && <label className="ic-repeat-note">Document the intended correction<textarea aria-label="Document the intended correction" value={reason} onChange={event => setReason(event.target.value)} maxLength={500} placeholder="Describe the missing anatomy, projection, alignment or motion issue and the correction you plan…" /><small>At least 12 characters · additional exposure is never automatically justified by an exercise score.</small></label>}
          {decision === 'accept' && report.needsReview.length > 0 && <p className="ic-accept-warning">The model flags {report.needsReview.join(', ').toLowerCase()}. This acceptance is recorded as your learning decision; it is not clinical clearance.</p>}
          <button className="ic-primary" disabled={!decision || (decision === 'repeat' && reason.trim().length < 12)} onClick={submitDisposition}>{decision === 'repeat' ? 'Return to the imaging room' : 'Complete review & next case'}<ArrowRightIcon /></button>
        </div>}
      </div></div>
    </section>
  </div>;
}
