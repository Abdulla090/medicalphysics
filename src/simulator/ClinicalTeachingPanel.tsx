import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, Cross2Icon, ExclamationTriangleIcon, InfoCircledIcon, ResetIcon } from '@radix-ui/react-icons';
import type { ClinicalCase, PreparationRecord, SimulatedAssessment } from './clinicalCases';
import { GAME_OBJECTIVES, GAME_STAGE_ORDER, type GameStage } from './GameJourney';
import type { CapturedImage, SimulatorState } from './types';
import { getTeachingLesson, getTeachingObservations, getTeachingQuestions, gradeTeachingAnswers, type TeachingGrade } from './clinicalTeaching';
import './clinicalTeaching.css';

export interface ClinicalTeachingPanelProps {
  open: boolean;
  onClose: () => void;
  clinicalCase: ClinicalCase;
  stage: GameStage;
  state: SimulatorState;
  preparation: PreparationRecord;
  assessment: SimulatedAssessment | null;
  guided: boolean;
  /** Optional session export integration. Only called after an explicit grade action. */
  onGrade?: (stage: GameStage, grade: TeachingGrade) => void;
  /** If supplied, review can evaluate the captured setup even after controls change. */
  image?: CapturedImage | null;
  patientPrepared?: boolean;
  hygieneDone?: boolean;
}

const stageLabels: Record<GameStage, string> = {
  registration: 'Referral', changing: 'Preparation', escort: 'Transfer', position: 'Position', exposure: 'Exposure', review: 'Critique',
};

function trapDialogKeys(event: KeyboardEvent<HTMLElement>, onClose: () => void) {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    onClose();
    return;
  }
  if (event.key !== 'Tab') return;
  const candidates = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href],select:not(:disabled)');
  const focusable = Array.from(candidates).filter(element => element.getClientRects().length > 0);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && (document.activeElement === first || !event.currentTarget.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !event.currentTarget.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
}

/** Read-only teaching feedback plus case-specific scored questions; no clinical credential is conferred. */
export function ClinicalTeachingPanel({
  open, onClose, clinicalCase, stage, state, preparation, assessment, guided, onGrade, image, patientPrepared, hygieneDone,
}: ClinicalTeachingPanelProps) {
  const [viewStage, setViewStage] = useState<GameStage>(stage);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Partial<Record<GameStage, boolean>>>({});
  const [showHints, setShowHints] = useState(false);
  const titleId = useId();
  const radioId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Every new encounter starts a fresh teaching attempt. Changing clinical stages
  // follows the workflow, while students may freely revisit earlier lessons.
  useEffect(() => {
    setViewStage(stage);
  }, [stage, open]);
  useEffect(() => {
    setAnswers({});
    setSubmitted({});
    setShowHints(false);
  }, [clinicalCase.id]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  if (!open) return null;

  const lesson = getTeachingLesson(clinicalCase.id, viewStage);
  const questions = getTeachingQuestions(clinicalCase.id, viewStage);
  const grade = gradeTeachingAnswers(questions, answers);
  const isSubmitted = submitted[viewStage] === true;
  const observations = getTeachingObservations(clinicalCase, viewStage, viewStage === 'review' && image ? image.state : state, preparation, assessment, { patientPrepared, hygieneDone });
  const activeIndex = GAME_STAGE_ORDER.indexOf(viewStage);
  const workflowIndex = GAME_STAGE_ORDER.indexOf(stage);
  const scoredStages = GAME_STAGE_ORDER.filter(step => submitted[step]).length;
  const answeredQuestions = questions.filter(question => question.choices.some(option => answers[question.id] === option.id)).length;

  const changeAnswer = (questionId: string, choiceId: string) => {
    if (isSubmitted) return;
    setAnswers(previous => ({ ...previous, [questionId]: choiceId }));
  };
  const resetStage = () => {
    const stageIds = new Set(questions.map(question => question.id));
    setAnswers(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !stageIds.has(id))));
    setSubmitted(previous => ({ ...previous, [viewStage]: false }));
    setShowHints(false);
  };
  const submitStage = () => {
    if (!grade.complete || isSubmitted) return;
    setSubmitted(previous => ({ ...previous, [viewStage]: true }));
    onGrade?.(viewStage, grade);
  };
  const changeStage = (newStage: GameStage) => {
    setViewStage(newStage);
    setShowHints(false);
  };
  const overlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return <div className="ct-backdrop" onMouseDown={overlayClick}>
    <section className="ct-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={`${titleId}-description`} onKeyDown={event => trapDialogKeys(event, onClose)} ref={dialogRef}>
      <header className="ct-topbar">
        <div className="ct-identity"><span className="ct-mark" aria-hidden="true">C<span>+</span></span><div><span className="ct-eyebrow">MEDICALPHYSICS / TEACHING STUDIO</span><strong>Clinical case conference</strong></div></div>
        <div className="ct-top-actions"><span className="ct-educational">EDUCATIONAL EXERCISE</span><button type="button" ref={closeRef} className="ct-close" onClick={onClose} aria-label="Close clinical teaching panel"><Cross2Icon /></button></div>
      </header>

      <div className="ct-scroll">
        <div className="ct-overview">
          <div><span className="ct-eyebrow">ACTIVE LEARNING / {clinicalCase.accession}</span><h2 id={titleId}>Think like a radiographer.</h2><p id={`${titleId}-description`}>Explore the reasoning behind each step, inspect the simulated setup and answer case-based questions. Every patient and acquisition is fictional.</p></div>
          <div className="ct-caseplate"><span>CASE ON FILE</span><strong>{clinicalCase.name}</strong><small>{clinicalCase.indication}</small><span className="ct-caseplate-foot">{guided ? 'GUIDED SHIFT' : 'SELF-DIRECTED STUDY'} <i /> {scoredStages} / 6 STAGES CHECKED</span></div>
        </div>

        <nav className="ct-stage-nav" aria-label="Teaching stages">
          {GAME_STAGE_ORDER.map((step, index) => <button type="button" key={step} className={`ct-stage ${viewStage === step ? 'is-selected' : ''} ${stage === step ? 'is-current' : ''}`} aria-current={stage === step ? 'step' : undefined} aria-pressed={viewStage === step} onClick={() => changeStage(step)}>
            <span className="ct-stage-number">{submitted[step] ? <CheckIcon /> : String(index + 1).padStart(2, '0')}</span><span>{stageLabels[step]}</span>{stage === step && <i className="ct-now-dot" aria-label="Current workflow stage" />}
          </button>)}
        </nav>

        <div className="ct-stage-summary"><div><span className="ct-eyebrow">MODULE {String(activeIndex + 1).padStart(2, '0')} / 06 · {GAME_OBJECTIVES[viewStage].destination}</span><h3>{lesson.title}</h3><p>{lesson.objective}</p></div><span className={viewStage === stage ? 'ct-stage-tag is-current' : 'ct-stage-tag'}>{viewStage === stage ? 'CURRENT STEP' : viewStage === 'review' && workflowIndex < activeIndex ? 'PREVIEW MODULE' : 'STUDY MODULE'}</span></div>

        <div className="ct-columns">
          <div className="ct-main">
            <section className="ct-learning-card" aria-label="Clinical reasoning">
              <div className="ct-card-heading"><span className="ct-kicker">01 / CASE REASONING</span><span>WHY IT MATTERS</span></div>
              <h4>Read the referral. Form a plan.</h4><blockquote>{clinicalCase.question}</blockquote>
              <div className="ct-learning-step"><span>01</span><div><strong>Interpret the request</strong><p>{lesson.clinicalReasoning}</p></div></div>
              <div className="ct-learning-step"><span>02</span><div><strong>Perform the step</strong><p>{lesson.practice}</p></div></div>
              <div className="ct-learning-step"><span>03</span><div><strong>Critique the result</strong><p>{lesson.imageCritique}</p></div></div>
              <button type="button" className="ct-hint-toggle" aria-expanded={showHints} onClick={() => setShowHints(value => !value)}><InfoCircledIcon />{showHints ? 'Hide examiner perspective' : 'Open examiner perspective'}<ArrowRightIcon /></button>
              {showHints && <div className="ct-examiner-note"><strong>Explain your decision out loud.</strong><p>Identify what you expect to see, which controllable error could obscure it, and how you would detect that error on the acquired image. State what evidence would justify changing your plan.</p></div>}
            </section>

            <section className="ct-quiz" aria-label="Clinical knowledge check">
              <div className="ct-card-heading"><span className="ct-kicker">02 / SELF-CHECK</span><span>{questions.length} CASE QUESTIONS</span></div>
              <div className="ct-quiz-heading"><div><h4>Defend your decisions.</h4><p>Choose an answer for each situation, then submit to see the teaching rationale.</p></div><span>{answeredQuestions}/{questions.length} answered</span></div>
              {questions.map((question, index) => {
                const result = isSubmitted ? grade.results[index] : null;
                return <fieldset className={`ct-question ${result ? result.correct ? 'is-correct' : 'is-incorrect' : ''}`} key={question.id}>
                  <legend><span>QUESTION {String(index + 1).padStart(2, '0')}</span>{question.prompt}</legend>
                  <div className="ct-choices">{question.choices.map((choice, choiceIndex) => <label key={choice.id} className={`ct-choice ${answers[question.id] === choice.id ? 'is-picked' : ''} ${isSubmitted && choice.id === question.correctId ? 'is-answer' : ''}`}>
                    <input type="radio" name={`${radioId}-${question.id}`} value={choice.id} checked={answers[question.id] === choice.id} disabled={isSubmitted} onChange={() => changeAnswer(question.id, choice.id)} />
                    <span className="ct-letter">{String.fromCharCode(65 + choiceIndex)}</span><span>{choice.label}</span>
                    {isSubmitted && choice.id === question.correctId && <CheckIcon className="ct-choice-check" aria-label="Correct answer" />}
                  </label>)}</div>
                  {result && <div className={`ct-question-result ${result.correct ? 'is-correct' : 'is-incorrect'}`} role="status"><strong>{result.correct ? 'Correct reasoning' : 'Revisit the decision'}</strong><p>{result.feedback}</p></div>}
                </fieldset>;
              })}
              <div className="ct-grade-footer">
                {isSubmitted ? <><div className="ct-grade"><strong>{grade.percent}%</strong><span>{grade.correct} of {questions.length} correct · {grade.earned}/{grade.total} points</span><small>Knowledge self-check only · not a clinical competency assessment</small></div><button type="button" className="ct-secondary-btn" onClick={resetStage}><ResetIcon /> Try again</button></> : <><p>Complete both questions to unlock detailed feedback.</p><button type="button" className="ct-primary-btn" disabled={!grade.complete} onClick={submitStage}>Grade this module <ArrowRightIcon /></button></>}
              </div>
            </section>
          </div>

          <aside className="ct-side" aria-label="Live simulator observations">
            <section className="ct-monitor">
              <div className="ct-card-heading"><span className="ct-kicker">LIVE / SETUP FEEDBACK</span><span className="ct-monitor-indicator"><i /> SYNCED</span></div>
              <h4>Examine your setup.</h4><p className="ct-monitor-intro">These observations read the current training controls and workflow marks. They are simplified checks, not clinical clearance.</p>
              <ul>{observations.map(observation => <li key={observation.id} className={`ct-observation is-${observation.status}`}><span className="ct-observation-icon">{observation.status === 'confirmed' ? <CheckIcon /> : observation.status === 'attention' ? <ExclamationTriangleIcon /> : <InfoCircledIcon />}</span><div><strong>{observation.label}</strong><p>{observation.detail}</p></div></li>)}</ul>
            </section>

            <section className="ct-takeaway"><span className="ct-kicker">CLINICAL THINKING</span><h4>One more question.</h4><p>What would you change first if the synthetic image did not meet the request, and what observation would demonstrate that your correction worked?</p><div>STATE YOUR EVIDENCE <ArrowRightIcon /></div></section>
            {viewStage === 'review' && assessment && assessment.caseId === clinicalCase.id && <section className="ct-rubric"><span className="ct-kicker">EXERCISE RESULTS</span><div><strong>{assessment.score}<small> / {assessment.total}</small></strong><span>{assessment.criticalFailures.length ? `${assessment.criticalFailures.length} critical workflow flag${assessment.criticalFailures.length === 1 ? '' : 's'}` : 'No critical workflow flags'}</span></div><p>Review the synthetic image directly. The rubric alone cannot authorize clinical acceptance or repeating an exposure.</p></section>}
          </aside>
        </div>

        <footer className="ct-footer"><span>SYNTHETIC PATIENT · EDUCATIONAL PHYSICS MODEL · NO PATIENT DOSE CALIBRATION</span><div><button type="button" className="ct-text-btn" disabled={activeIndex === 0} onClick={() => changeStage(GAME_STAGE_ORDER[activeIndex - 1])}><ArrowLeftIcon /> Previous</button><button type="button" className="ct-text-btn" disabled={activeIndex === GAME_STAGE_ORDER.length - 1} onClick={() => changeStage(GAME_STAGE_ORDER[activeIndex + 1])}>Next module <ArrowRightIcon /></button></div></footer>
      </div>
    </section>
  </div>;
}

export default ClinicalTeachingPanel;
