import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircledIcon, Cross2Icon, ExclamationTriangleIcon, FileTextIcon, InfoCircledIcon, LightningBoltIcon, LockClosedIcon, MixerHorizontalIcon, ResetIcon, TargetIcon } from '@radix-ui/react-icons';
import type { ClinicalCase, PreparationRecord, SimulatedAssessment } from './clinicalCases';
import type { GameStage } from './GameJourney';
import type { CapturedImage, SimulatorState } from './types';
import { analyzeCoach, COACH_VARIABLES, createCoachPrediction, debriefCoach, experimentCoach, gradeCoachSession, type CoachExperiment, type CoachIssueId, type CoachPrediction, type CoachSessionSummary, type CoachVariable } from './clinicalCoach.ts';
import './clinicalCoach.css';

export interface ClinicalCoachProps {
  open: boolean;
  onClose: () => void;
  clinicalCase: ClinicalCase;
  stage: GameStage;
  state: SimulatorState;
  preparation: PreparationRecord;
  guided: boolean;
  image?: CapturedImage | null;
  assessment?: SimulatedAssessment | null;
  patientPrepared?: boolean;
  hygieneDone?: boolean;
  doorSecured?: boolean;
  /** Optional: apply a selected what-if/correction to the real simulator. Validate workflow and apply protocol defaults at the parent. */
  onAdjust?: (patch: Partial<SimulatorState>) => void;
  /** Fires from the student's explicit 'File assessment' action. Represents an exercise journal score only. */
  onSessionGrade?: (summary: CoachSessionSummary) => void;
}

type CoachTab = 'briefing' | 'experiment' | 'debrief';
const tabNames: Record<CoachTab, string> = { briefing: 'Predict', experiment: 'Physics lab', debrief: 'Debrief' };
const stages: Record<GameStage, string> = { registration: '01 · Reception', changing: '02 · Preparation', escort: '03 · Transfer', position: '04 · Positioning', exposure: '05 · Acquisition', review: '06 · Image critique' };
const critiqueItems = [
  { id: 'coverage', title: 'Anatomical inclusion', detail: 'Identify the relevant superior/inferior and lateral boundaries. The analytic coverage check is only a guide.' },
  { id: 'alignment', title: 'Projection / rotation', detail: 'Look for symmetrical landmarks on frontal views or expected superimposition on the lateral.' },
  { id: 'motion', title: 'Motion / breathing', detail: 'Inspect edge definition and lung inflation for chest, or expiration cooperation for abdomen.' },
  { id: 'artifacts', title: 'Artifacts / superimposition', detail: 'Inspect for clothing objects, arms and foreign structures over the requested anatomy.' },
  { id: 'signal', title: 'Noise / contrast', detail: 'Judge modeled grain, density and useful subject contrast without implying a measured exposure index.' },
];

const format = (value: number, decimals = 2) => Number.isFinite(value) ? value.toFixed(decimals) : '—';

function trap(event: KeyboardEvent<HTMLElement>, close: () => void) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
  if (event.key !== 'Tab') return;
  const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')).filter(item => item.getClientRects().length > 0);
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && (document.activeElement === first || !event.currentTarget.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && (document.activeElement === last || !event.currentTarget.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
}

/** Instructor station that trains observation -> prediction -> intervention -> debrief. */
export function ClinicalCoach({ open, onClose, clinicalCase, stage, state, preparation, guided, image = null, assessment = null, patientPrepared, hygieneDone, doorSecured, onAdjust, onSessionGrade }: ClinicalCoachProps) {
  const [tab, setTab] = useState<CoachTab>('briefing');
  const [mode, setMode] = useState<'guided' | 'independent'>(guided ? 'guided' : 'independent');
  const [hypothesis, setHypothesis] = useState<CoachIssueId | 'none' | ''>('');
  const [intervention, setIntervention] = useState<CoachIssueId | 'observe' | ''>('');
  const [reasoning, setReasoning] = useState('');
  const [expectedSign, setExpectedSign] = useState('');
  const [prediction, setPrediction] = useState<CoachPrediction | null>(null);
  const [labVariable, setLabVariable] = useState<CoachVariable>('sid');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [inspect, setInspect] = useState<string[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [filedCaptureId, setFiledCaptureId] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();

  // Parent renders us continuously with open=false; journal data survives dismissal.
  useEffect(() => { setMode(guided ? 'guided' : 'independent'); }, [guided]);
  useEffect(() => {
    setTab('briefing'); setPrediction(null); setHypothesis(''); setIntervention('');
    setReasoning(''); setExpectedSign(''); setInspect([]); setReviewText('');
    setShowDiagnostics(false); setFiledCaptureId(null);
  }, [clinicalCase.id]);
  useEffect(() => { if (image?.id) setTab('debrief'); }, [image?.id]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [open]);

  const coachInput = { clinicalCase, stage, state, preparation, patientPrepared, hygieneDone, doorSecured };
  const analysis = analyzeCoach(coachInput);
  const experiment = experimentCoach(state, labVariable);
  const matchingImage = image && assessment?.caseId === clinicalCase.id ? image : null;
  const debrief = prediction ? debriefCoach(prediction, clinicalCase, matchingImage, assessment) : null;
  const session = gradeCoachSession(prediction, debrief, assessment?.caseId === clinicalCase.id ? assessment.score : null, reviewText, inspect);
  const choices = useMemo(() => {
    const all: { id: CoachIssueId | 'none'; title: string; detail: string }[] = [
      { id: 'none', title: 'No flagged concern', detail: 'Settings and preparation appear adequate for this synthetic task; image review is still necessary.' },
      { id: 'coverage', title: 'Anatomy could be excluded', detail: 'Alignment, projected field or geometry may omit required landmarks.' },
      { id: 'rotation', title: 'Projection or overlap concern', detail: 'Rotation and tube angle can change anatomical relationships.' },
      { id: 'mas', title: 'Noise / photon statistics', detail: 'mAs changes modeled photon fluence, not anatomical alignment.' },
      { id: 'sid', title: 'Magnification and distance', detail: 'SID affects magnification, blur and fluence.' },
      { id: 'respiration', title: 'Breathing or motion', detail: 'Breath coordination can influence synthetic motion and inflation.' },
      { id: 'protocol', title: 'Wrong examination / projection', detail: 'The selected view may not match the request.' },
      { id: 'identity', title: 'Patient identification', detail: 'A technical image cannot correct a mismatched patient encounter.' },
      { id: 'screening', title: 'Unresolved safety questions', detail: 'Complete relevant safety screening and justification before proceeding.' },
      { id: 'protection', title: 'Operator protection', detail: 'Confirm the protected operator position before an exposure.' },
      { id: 'centering', title: 'Beam / anatomy centering', detail: 'Lateral or longitudinal offset can move anatomy toward the detector edge.' },
      { id: 'detector', title: 'Digital receptor readiness', detail: 'The simulated detector cannot acquire unless it is armed.' },
      { id: 'kvp', title: 'Tube voltage / penetration', detail: 'Beam energy changes the spectrum and attenuation appearance.' },
      { id: 'hygiene', title: 'Patient contact precautions', detail: 'Hand hygiene must precede contact and manipulation.' },
    ];
    if (analysis.chiefIssue && !all.some(item => item.id === analysis.chiefIssue?.id)) all.push({ id: analysis.chiefIssue.id, title: analysis.chiefIssue.title, detail: 'Check this step of the observed workflow.' });
    return all;
  // Derived list deliberately doesn't reveal the selected chief issue in the independent mode.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.chiefIssue?.id]);

  const activeIssues = analysis.issues.slice(0, 5);
  const capturePrediction = () => {
    if (!hypothesis || !intervention || reasoning.trim().length < 20 || expectedSign.trim().length < 12) return;
    setPrediction(createCoachPrediction(coachInput, hypothesis, intervention, reasoning, expectedSign, Date.now(), !!image));
  };
  const restartPrediction = () => {
    setPrediction(null); setHypothesis(''); setIntervention(''); setReasoning(''); setExpectedSign(''); setFiledCaptureId(null); setInspect([]); setReviewText('');
  };
  const recordSummary = () => { if (!image || filedCaptureId === image.id || !session.imageDebriefCompleted) return; onSessionGrade?.(session); setFiledCaptureId(image.id); };
  const onOverlay = (event: MouseEvent<HTMLDivElement>) => { if (event.currentTarget === event.target) onClose(); };
  if (!open) return null;

  return <div className="cc-overlay" onMouseDown={onOverlay}>
    <section className="cc-console" role="dialog" aria-modal="true" aria-labelledby={labelId} onKeyDown={event => trap(event, onClose)}>
      <header className="cc-header"><div className="cc-brand"><div className="cc-emblem"><TargetIcon /></div><div><small>MEDICALPHYSICS / SIMULATED IMAGING DEPARTMENT</small><strong>Radiography Coach <span>OSCE LAB / 01</span></strong></div></div><div className="cc-header-actions"><span className="cc-online"><i /> LOCAL EDUCATOR CONSOLE</span><button type="button" ref={closeRef} onClick={onClose} aria-label="Close radiography coach"><Cross2Icon /></button></div></header>
      <div className="cc-scroller">
        <div className="cc-hero"><div><span className="cc-kicker">CASE CONFERENCE / {clinicalCase.accession}</span><h2 id={labelId}>Before the beam. After the image.</h2><p>Predict a specific failure from your real simulator setup. Explain why it would happen. Test one physical variable, then compare the capture with your prediction.</p></div><div className="cc-hero-aside"><span className="cc-kicker">ACTIVE SCENARIO</span><strong>{clinicalCase.name}</strong><span>{clinicalCase.indication}</span><small>{stages[stage]} · {clinicalCase.requested.toUpperCase()}</small></div></div>

        <div className="cc-modebar"><div className="cc-mode-choices" role="group" aria-label="Coaching mode"><button type="button" aria-pressed={mode === 'guided'} onClick={() => setMode('guided')}>Guided coaching</button><button type="button" aria-pressed={mode === 'independent'} onClick={() => { setMode('independent'); setShowDiagnostics(false); }}>Independent OSCE</button></div><p>{mode === 'guided' ? 'Instructor reasoning and priority findings are visible to support practice.' : 'Diagnosis is held back until you commit a prediction. You can request an explicit hint.'}</p></div>

        <section className="cc-readout" aria-label="Live simulated radiographic measurements"><div><span>PROJECTION</span><strong>{analysis.protocolName}</strong></div><div><span>EXPOSURE SETTING</span><strong>{format(analysis.mas)} <small>mAs</small></strong></div><div><span>SOURCE–IMAGE</span><strong>{state.sid} <small>cm SID</small></strong></div><div><span>BEAM</span><strong>{state.kvp} <small>kVp</small></strong></div><div><span>RELATIVE FLUENCE</span><strong>{format(analysis.relativeExposure)}<small> × model</small></strong></div><div><span>INTERLOCKS</span><strong>{analysis.checksPassed}/{analysis.checksTotal}</strong></div></section>

        <nav className="cc-tabs" aria-label="Coach workflow">{(['briefing', 'experiment', 'debrief'] as const).map((name, index) => <button type="button" key={name} aria-current={tab === name ? 'step' : undefined} aria-pressed={tab === name} onClick={() => setTab(name)}><span>0{index + 1}</span> {tabNames[name]} {name === 'briefing' && prediction && <CheckCircledIcon />}{name === 'debrief' && matchingImage && <i />}</button>)}</nav>

        <div className="cc-body">
          <main className="cc-main">
            {tab === 'briefing' && <>
              <div className="cc-section-heading"><div><span className="cc-kicker">STEP 01 / INTENTIONAL PRACTICE</span><h3>Make your prediction.</h3><p>{clinicalCase.question}</p></div><span className="cc-phase-marker">PRE-EXPOSURE</span></div>
              <section className="cc-card cc-chart"><div className="cc-card-head"><FileTextIcon /><strong>Referral and patient brief</strong><span>FICTIONAL</span></div><p>{clinicalCase.clinicalContext}</p><dl><div><dt>Requested study</dt><dd>{clinicalCase.requested}</dd></div><div><dt>Clinical objective</dt><dd>{clinicalCase.teachingFocus}</dd></div><div><dt>Preparation note</dt><dd>{clinicalCase.preparationNote}</dd></div></dl></section>
              {!prediction ? <section className="cc-card cc-thinking"><div className="cc-card-head"><TargetIcon /><strong>Student hypothesis</strong><span>YOUR DECISION</span></div>{image && <p className="cc-retrospective-note">A radiograph has already been captured. This entry will be marked retrospective and cannot earn pre-exposure prediction points. Complete the next new case to score the full OSCE.</p>}
                <fieldset><legend>01 · Which concern deserves attention first at this moment?</legend><div className="cc-options">{choices.map(choice => <label key={choice.id} className={`cc-option ${hypothesis === choice.id ? 'is-active' : ''}`}><input type="radio" name="coach-hypothesis" checked={hypothesis === choice.id} onChange={() => setHypothesis(choice.id)} /><span><strong>{choice.title}</strong><small>{choice.detail}</small></span></label>)}</div></fieldset>
                <fieldset><legend>02 · What is the best immediate decision?</legend><div className="cc-options cc-option-grid"><label className={`cc-option ${intervention === 'observe' ? 'is-active' : ''}`}><input type="radio" name="coach-intervention" checked={intervention === 'observe'} onChange={() => setIntervention('observe')} /><span><strong>Proceed to inspect / monitor</strong><small>Only suitable when preparation and image-quality checks do not reveal a correctable issue.</small></span></label>{(mode === 'guided' ? analysis.issues.map(item => ({ id:item.id,title:item.title, detail:item.correctiveAction })) : choices.filter(item => item.id !== 'none').map(item => ({id:item.id,title:item.title,detail:`Plan a correction for ${item.title.toLowerCase()}.`}))).map(item => <label key={item.id} className={`cc-option ${intervention === item.id ? 'is-active' : ''}`}><input type="radio" name="coach-intervention" checked={intervention === item.id} onChange={() => setIntervention(item.id as CoachIssueId)} /><span><strong>{item.title}</strong><small>{item.detail}</small></span></label>)}</div></fieldset>
                <label className="cc-write-label">03 · Explain your causal reasoning <span>{reasoning.trim().length} characters · 20 minimum</span><textarea value={reasoning} onChange={event => setReasoning(event.target.value)} maxLength={600} rows={3} placeholder="State the specific setting or workflow observation, the physical or safety mechanism, and why this concern has priority." /></label>
                <label className="cc-write-label">04 · What exactly would you inspect in the captured image? <span>{expectedSign.trim().length} characters · 12 minimum</span><textarea value={expectedSign} onChange={event => setExpectedSign(event.target.value)} maxLength={400} rows={2} placeholder="e.g. The left base may be cut off at the collimation edge; I would verify both costophrenic angles." /></label>
                <div className="cc-action-row"><span>Prediction is locked with the current equipment snapshot. It does not initiate an exposure.</span><button type="button" className="cc-primary" onClick={capturePrediction} disabled={!hypothesis || !intervention || reasoning.trim().length < 20 || expectedSign.trim().length < 12}>Record prediction <ArrowRightIcon /></button></div>
              </section> : <section className="cc-card cc-locked"><div className="cc-card-head"><LockClosedIcon /><strong>Prediction recorded · snapshot frozen</strong><span>{prediction.retrospective ? 'RETROSPECTIVE ENTRY' : 'PROSPECTIVE JOURNAL'}</span></div><div className="cc-locked-facts"><div><span>Concern identified</span><strong>{choices.find(choice => choice.id === prediction.issueId)?.title ?? prediction.issueId}</strong></div><div><span>Decision selected</span><strong>{prediction.selectedCorrection === 'observe' ? 'Inspect / monitor' : prediction.selectedCorrection}</strong></div></div><blockquote>{prediction.rationale}</blockquote><p><strong>Expected observation</strong> {prediction.expectedImageFinding}</p><div className="cc-action-row"><button type="button" className="cc-muted-button" onClick={restartPrediction}><ResetIcon /> New preflight attempt</button><button type="button" className="cc-primary" onClick={() => setTab(matchingImage ? 'debrief' : 'experiment')}>{matchingImage ? 'Compare with capture' : 'Test a variable'} <ArrowRightIcon /></button></div></section>}
            </>}

            {tab === 'experiment' && <><div className="cc-section-heading"><div><span className="cc-kicker">STEP 02 / COUNTERFACTUAL PHYSICS</span><h3>Change one cause. Predict one effect.</h3><p>Try an alternate setting against the current equipment state. Changes are virtual until you explicitly apply them in the simulator.</p></div><span className="cc-phase-marker">WHAT-IF LAB</span></div>
              <section className="cc-card"><div className="cc-card-head"><MixerHorizontalIcon /><strong>Parameter intervention</strong><span>CONTROLLED COMPARISON</span></div><div className="cc-variables" role="group" aria-label="Parameter to vary">{COACH_VARIABLES.map(variable => <button type="button" key={variable} aria-pressed={labVariable === variable} onClick={() => setLabVariable(variable)}>{variable === 'mas' ? 'mAs' : variable === 'kvp' ? 'kVp' : variable === 'sid' ? 'SID' : variable === 'rotation' ? 'Rotation' : variable === 'centering' ? 'Center' : 'Field width'}</button>)}</div><ExperimentView experiment={experiment} />
                <div className="cc-action-row"><span>A simulated model prediction is not a technique recommendation for an actual patient.</span>{onAdjust ? <button type="button" className="cc-primary" onClick={() => onAdjust(experiment.change)}>Apply selected setting <ArrowRightIcon /></button> : <span className="cc-action-guidance">Set the same value at the physical station to test it.</span>}</div>
              </section><section className="cc-card cc-explainer"><div className="cc-card-head"><InfoCircledIcon /><strong>Instructor prompt</strong></div><p>If you change mAs while geometry stays fixed, would anatomy cut off at the edge suddenly become visible? No. Photon statistics and anatomical coverage are different failure mechanisms. Choose a correction that targets the observed cause, then acquire only if the workflow permits it.</p></section>
            </>}

            {tab === 'debrief' && <><div className="cc-section-heading"><div><span className="cc-kicker">STEP 03 / EXAMINER DEBRIEF</span><h3>What actually changed?</h3><p>Compare the recorded prediction with the captured settings and teaching rubric. The radiograph itself still requires your visual critique.</p></div><span className="cc-phase-marker">POST-CAPTURE</span></div>
              {!prediction && <div className="cc-empty"><LockClosedIcon /><h4>Record a prediction first.</h4><p>Your earlier reasoning is needed to compare hypotheses with outcomes. You can record one now; label it as retrospective if the image was already captured.</p><button type="button" className="cc-primary" onClick={() => setTab('briefing')}>Open prediction station <ArrowRightIcon /></button></div>}
              {prediction && !matchingImage && <div className="cc-empty"><LightningBoltIcon /><h4>No matching synthetic capture yet.</h4><p>The prediction is saved. Complete the requested examination in the simulated room, then return here to compare what the camera recorded.</p><button type="button" className="cc-muted-button" onClick={onClose}>Return to simulator <ArrowRightIcon /></button></div>}
              {prediction && matchingImage && debrief && <><section className="cc-card cc-result"><div className="cc-card-head"><CheckCircledIcon /><strong>Evidence comparison</strong><span>EXERCISE RUBRIC</span></div><div className="cc-result-state"><span>{debrief.supported === 'confirmed' ? 'PREDICTED CONCERN FLAGGED' : debrief.supported === 'resolved' ? 'INITIAL ISSUE NOW PASSES' : debrief.supported === 'not-observed' ? 'PREDICTION NOT SUPPORTED' : 'NOT DIRECTLY ASSESSED'}</span><strong>{debrief.assessmentScore ?? '—'}</strong></div><h4>{debrief.finding}</h4><p>{debrief.explanation}</p>{debrief.stateChanges.length > 0 && <details><summary>Equipment changes since your prediction ({debrief.stateChanges.length})</summary><ul>{debrief.stateChanges.map(change => <li key={change}>{change}</li>)}</ul></details>}{debrief.criticalFailures.length > 0 && <div className="cc-alert"><strong>Critical workflow flags</strong>{debrief.criticalFailures.map(item => <p key={item}>{item}</p>)}</div>}</section>
                <div className="cc-image-review"><div className="cc-film"><div><span>CAPTURED / SYNTHETIC RADIOGRAPH</span><span>{new Date(matchingImage.createdAt).toLocaleTimeString()}</span></div><img src={matchingImage.previewUrl} alt="Synthetic radiograph from the captured simulator state for student critique" /><p>Modeled analytical phantom. This image cannot be used for diagnosis.</p></div><section className="cc-card cc-critique"><div className="cc-card-head"><TargetIcon /><strong>Structured image critique</strong><span>STUDENT EVIDENCE</span></div><p>Mark the aspects you actually inspected. A numerical rubric does not tell you whether all requested anatomy is diagnostically demonstrated.</p>{critiqueItems.map(item => <label className="cc-critique-item" key={item.id}><input type="checkbox" checked={inspect.includes(item.id)} onChange={event => setInspect(previous => event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))} /><span><strong>{item.title}</strong><small>{item.detail}</small></span></label>)}</section></div>
                <section className="cc-card"><div className="cc-card-head"><FileTextIcon /><strong>Corrective action and disposition</strong><span>EXPLAIN</span></div><p className="cc-card-context">{debrief.corrections.length ? 'The exercise rubric flags the following issues. Select a correction according to the actual image and local protocol; repeating an exposure is never automatic.' : 'The exercise has no scored faults. Independently verify anatomical inclusion, rotation, motion and artifacts before accepting a study.'}</p>{debrief.corrections.map((correction, index) => <div className="cc-correction" key={`${index}-${correction}`}><span>{String(index + 1).padStart(2,'0')}</span><p>{correction}</p></div>)}<label className="cc-write-label">What do you see, which cause explains it, and would another exposure be justified? <span>{reviewText.trim().length} characters · inspect 2 dimensions and write 25+</span><textarea rows={4} maxLength={1000} value={reviewText} onChange={event => { setReviewText(event.target.value); }} placeholder="Record anatomical boundaries and a visible sign. Identify a justified corrective step if needed; say why a repeat would or would not be warranted." /></label></section>
              </>}
            </>}
          </main>

          <aside className="cc-sidebar"><section className="cc-side-section"><div className="cc-side-title"><span className="cc-kicker">INSTRUCTOR STATUS</span><span className={analysis.acquisitionBlocked ? 'cc-hold' : 'cc-notice'}>{analysis.acquisitionBlocked ? 'HOLD FOR REVIEW' : 'INTERLOCKS CHECKED'}</span></div><h4>{analysis.readout}</h4><p>Flags come from the educational geometry, equipment interlocks and recorded preparation tasks. They cannot certify clinical readiness.</p></section>
            <section className="cc-side-section cc-finding"><div className="cc-side-title"><span className="cc-kicker">OBSERVATION BOARD</span><span>{analysis.issues.length} FLAGS</span></div>
              {(mode === 'guided' || showDiagnostics || !!prediction) ? <div className="cc-finding-list">{!activeIssues.length && <div className="cc-signal-ok"><CheckCircledIcon /> No flagged teaching checks. Independently verify actual image content.</div>}{activeIssues.map((item, index) => <details key={item.id} className={`cc-finding-item is-${item.severity}`} open={mode === 'guided' && index === 0 || undefined}><summary><span>{item.severity === 'stop' ? <ExclamationTriangleIcon /> : <InfoCircledIcon />}</span><strong>{item.title}</strong></summary><p className="cc-observed">{item.observed}</p><dl><dt>Mechanism</dt><dd>{item.mechanism}</dd><dt>Expected observation</dt><dd>{item.predictedImage}</dd><dt>Correction</dt><dd>{item.correctiveAction}</dd><dt>Verification</dt><dd>{item.verify}</dd></dl>{item.patch && onAdjust && <button type="button" className="cc-small-action" onClick={() => onAdjust(item.patch!)}>Apply model correction <ArrowRightIcon /></button>}</details>)}</div> : <div className="cc-sealed"><LockClosedIcon /><strong>Independent station</strong><p>Observe the referral and live controls. Select a concern and document the evidence before revealing the instructor findings.</p><button type="button" onClick={() => setShowDiagnostics(true)}>Reveal a hint</button></div>}
            </section>
            <section className="cc-side-section cc-principles"><span className="cc-kicker">PHYSICS / MODEL LIMITS</span><dl><div><dt>Magnification</dt><dd>{format(analysis.magnification,3)}×</dd></div><div><dt>Geometric blur</dt><dd>{format(analysis.geometricBlur,3)} mm</dd></div><div><dt>Detector fluence</dt><dd>{format(analysis.relativeExposure)}× ref.</dd></div></dl><p>Approximate synthetic phantom and detector model; fluence is relative, never a measured patient dose, exposure index or diagnostic acceptance criterion.</p></section>
            <section className="cc-side-section cc-score"><span className="cc-kicker">YOUR PRACTICE JOURNAL</span><div><strong>{session.score}<small>/100</small></strong><span>Reasoning exercise</span></div><ul>{session.feedback.map(item => <li key={item}>{item}</li>)}</ul>{matchingImage && debrief?.matchedCase && <button className="cc-primary" type="button" disabled={!session.imageDebriefCompleted || filedCaptureId === matchingImage.id} onClick={recordSummary}>{filedCaptureId === matchingImage.id ? 'Assessment filed for this capture' : 'File assessment'} <ArrowRightIcon /></button>}</section>
          </aside>
        </div>
        <footer className="cc-footer"><span><InfoCircledIcon /> EDUCATIONAL SIMULATOR · NO REAL PATIENT RECORDS · NOT A DIAGNOSTIC OR CREDENTIALING SYSTEM</span><div><button type="button" onClick={() => setTab(tab === 'debrief' ? 'experiment' : 'briefing')} disabled={tab === 'briefing'}><ArrowLeftIcon /> Back</button><button type="button" onClick={() => setTab(tab === 'briefing' ? 'experiment' : 'debrief')} disabled={tab === 'debrief'}>Continue <ArrowRightIcon /></button></div></footer>
      </div>
    </section>
  </div>;
}

function ExperimentView({ experiment }: { experiment: CoachExperiment }) {
  return <div className="cc-experiment"><span className="cc-experiment-title">{experiment.label}</span><div className="cc-experiment-readings"><div><small>ONE-FACTOR INTERVENTION</small><strong>{experiment.proposed}</strong></div><div><small>RELATIVE FLUENCE CHANGE</small><strong>{experiment.relativeExposureRatio === null ? '—' : `${format(experiment.relativeExposureRatio)}×`}</strong></div><div><small>GEOMETRIC BLUR CHANGE</small><strong>{experiment.geometricBlurRatio === null ? '—' : `${format(experiment.geometricBlurRatio)}×`}</strong></div></div><div className="cc-delta"><span>MODEL WARNINGS BEFORE</span><p>{experiment.baselineFlags.length ? experiment.baselineFlags.join(' · ') : 'No nonblocking geometry flags'}</p><ArrowRightIcon /><span>AFTER</span><p>{experiment.adjustedFlags.length ? experiment.adjustedFlags.join(' · ') : 'No nonblocking geometry flags'}</p></div><ul>{experiment.observations.map(note => <li key={note}>{note}</li>)}</ul></div>;
}

export default ClinicalCoach;
