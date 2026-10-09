import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowRightIcon, CheckIcon, Cross2Icon, PersonIcon } from '@radix-ui/react-icons';
import { CLINICAL_CASES, type CaseId, type ClinicalCase } from './clinicalCases';
import { getProtocol } from './protocols';
import {
  applyClinicalDialogue, createClinicalDialogue, getDialogueOutcome, getDialogueReadiness,
  PREPARATION_TOPICS, REGISTRATION_TOPICS, TOPIC_LABELS,
  type ClinicalDialogueOutcome, type ClinicalDialogueSession, type ConversationPhase, type DialogueAction,
} from './clinicalDialogue';
import './ClinicalConversation.css';

export interface ClinicalConversationProps {
  clinicalCase: ClinicalCase;
  phase: ConversationPhase;
  onComplete: (result: ClinicalDialogueOutcome) => void;
  onClose: () => void;
  /** Optional registration case selection; parent owns the selected clinical case. */
  onSelectCase?: (id: CaseId) => void;
  /** Pass both props to preserve all dialogue turns across rooms and reopenings. */
  session?: ClinicalDialogueSession;
  onSessionChange?: (session: ClinicalDialogueSession) => void;
  /** Physical-world interlock values for the private changing room. */
  patientArrived?: boolean;
  doorClosed?: boolean;
}

function trapFocus(event: KeyboardEvent<HTMLElement>, onClose: () => void) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
  if (event.key !== 'Tab') return;
  const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], summary, [tabindex]:not([tabindex="-1"])'))
    .filter(item => item.getClientRects().length > 0);
  if (!controls.length) return;
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

export function ClinicalConversation({
  clinicalCase, phase, onComplete, onClose, onSelectCase, session: controlledSession,
  onSessionChange, patientArrived = true, doorClosed = false,
}: ClinicalConversationProps) {
  const [localSession, setLocalSession] = useState(() => createClinicalDialogue(clinicalCase, phase));
  const [enteredName, setEnteredName] = useState(controlledSession?.caseId === clinicalCase.id && controlledSession?.phase === phase ? controlledSession.typedName : '');
  const [enteredIdentifier, setEnteredIdentifier] = useState(controlledSession?.caseId === clinicalCase.id && controlledSession?.phase === phase ? controlledSession.typedIdentifier : '');
  const panelRef = useRef<HTMLElement>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const matches = (item: ClinicalDialogueSession) => item.caseId === clinicalCase.id && item.phase === phase;
  const current = controlledSession && matches(controlledSession) ? controlledSession : matches(localSession) ? localSession : createClinicalDialogue(clinicalCase, phase);
  const readiness = getDialogueReadiness(clinicalCase, current);
  const physicallyReady = phase === 'registration' || (patientArrived && !doorClosed);
  const topics = phase === 'registration' ? REGISTRATION_TOPICS : PREPARATION_TOPICS;

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.querySelector<HTMLButtonElement>('header button')?.focus();
    return () => { if (previousFocus.current?.isConnected) previousFocus.current.focus(); };
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [current.turns.length]);

  const update = (action: DialogueAction) => {
    const next = applyClinicalDialogue(clinicalCase, current, action);
    if (next === current) return;
    setLocalSession(next);
    onSessionChange?.(next);
  };

  const switchCase = (id: CaseId) => {
    if (!onSelectCase || id === clinicalCase.id) return;
    const selected = CLINICAL_CASES.find(item => item.id === id);
    if (!selected) return;
    const next = createClinicalDialogue(selected, phase);
    setLocalSession(next);
    setEnteredName('');
    setEnteredIdentifier('');
    onSelectCase(id);
    onSessionChange?.(next);
  };

  const submitIdentifier = (event: FormEvent, field: 'name' | 'identifier') => {
    event.preventDefault();
    update({ type: 'transcribe', field, value: field === 'name' ? enteredName : enteredIdentifier });
  };

  const complete = () => {
    if (!physicallyReady) return;
    const result = getDialogueOutcome(clinicalCase, current);
    if (result) onComplete(result);
  };

  const lastTurn = current.turns[current.turns.length - 1];
  return <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="conversation-title" onKeyDown={event => trapFocus(event, onClose)} className="game-dialog game-conversation">
    <header><span>{phase === 'registration' ? '01 / PATIENT REGISTRATION' : '02 / CLINICAL PREPARATION'}</span><button onClick={onClose} aria-label="Close patient conversation"><Cross2Icon /></button></header>
    <div className="game-dialog-content game-conversation-content">
      <div className="game-conversation-heading">
        <div><span className="game-dialog-kicker">SIMULATED PATIENT ENCOUNTER</span><h2 id="conversation-title">{phase === 'registration' ? 'Meet your patient.' : 'Talk before you image.'}</h2><p>{phase === 'registration' ? 'Ask the patient to identify themselves, then compare both answers with the referral.' : 'Listen for concerns, explain the view, and prepare the patient together.'}</p></div>
        <span className="game-conversation-stage">{phase === 'registration' ? 'RECEPTION' : 'CHANGING'}</span>
      </div>

      {phase === 'registration' && onSelectCase && <div className="game-conversation-case-picker"><label htmlFor="conversation-case">ACTIVE APPOINTMENT</label><select id="conversation-case" value={clinicalCase.id} onChange={event => switchCase(event.target.value as CaseId)}>{CLINICAL_CASES.map(item => <option key={item.id} value={item.id}>{item.name} · {getProtocol(item.requested).name}</option>)}</select></div>}

      <div className="game-conversation-patient"><span className="game-conversation-monogram" aria-hidden="true"><PersonIcon /></span><div><small>FICTIONAL PATIENT · AGE {clinicalCase.age}</small><strong>{clinicalCase.name}</strong><span>{getProtocol(clinicalCase.requested).name} · {clinicalCase.indication}</span></div><b title="Scripted patient cooperation score, not a clinical measurement">SIMULATED RAPPORT {current.trust}%</b></div>

      {phase === 'registration' && <div className="game-conversation-chart" aria-label="Referral document for matching patient answers"><span>REFERRAL RECORD</span><div><b>{clinicalCase.name}</b><b>{clinicalCase.identifier}</b></div><small>{clinicalCase.accession} · {getProtocol(clinicalCase.requested).name}</small></div>}

      <div className="game-conversation-progress"><span>{readiness.complete} OF {readiness.total} CONVERSATION STEPS</span><strong>{readiness.ready ? 'STEPS COMPLETE' : `${readiness.blockers.length} REMAINING`}</strong></div>
      <div className="game-conversation-bar" role="progressbar" aria-label="Clinical conversation completion" aria-valuenow={readiness.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${readiness.progress}%` }} /></div>

      <div className="game-conversation-log-label"><span>LIVE CONVERSATION</span><small>CHOOSE WHAT TO SAY BELOW</small></div>
      <ol ref={logRef} className="game-conversation-transcript" aria-label="Conversation transcript">
        {current.turns.map(turn => <li key={turn.id} className={`game-conversation-turn is-${turn.speaker}`}><span>{turn.speaker === 'student' ? 'YOU' : turn.speaker === 'patient' ? 'PATIENT' : turn.speaker === 'clinician' ? 'SUPERVISING CLINICIAN' : 'TRAINING SYSTEM'}</span><p>{turn.message}</p></li>)}
      </ol>
      <div className="game-conversation-announce" aria-live="polite" aria-atomic="true">{lastTurn ? `${lastTurn.speaker}: ${lastTurn.message}` : ''}</div>

      <div className="game-conversation-options"><span className="game-conversation-section-label">ASK OR EXPLAIN</span><div className="game-conversation-options-grid">{topics.map(topic => <button key={topic} type="button" className={current.asked.includes(topic) ? 'is-asked' : ''} onClick={() => update({ type: 'ask', topic })}><span>{TOPIC_LABELS[topic]}</span>{current.asked.includes(topic) ? <span className="game-conversation-asked"><CheckIcon aria-hidden="true" /> Asked</span> : <ArrowRightIcon aria-hidden="true" />}</button>)}</div></div>

      {phase === 'registration' && <div className="game-conversation-record"><span className="game-conversation-section-label">DOCUMENT THE PATIENT'S ANSWERS</span><div>
        <form onSubmit={event => submitIdentifier(event, 'name')}><label htmlFor="conversation-patient-name">Full name stated by patient</label><div><input id="conversation-patient-name" autoComplete="off" value={enteredName} onChange={event => setEnteredName(event.target.value)} placeholder="Type the patient's full name" disabled={!current.asked.includes('name') || current.nameVerified} aria-invalid={!!current.typedName && !current.nameVerified} aria-describedby="conversation-name-feedback" /><button disabled={!current.asked.includes('name') || current.nameVerified} type="submit" aria-label="Verify spoken full name">{current.nameVerified ? <CheckIcon aria-hidden="true" /> : 'VERIFY'}</button></div><small id="conversation-name-feedback" className={current.typedName && !current.nameVerified ? 'is-mismatch' : current.nameVerified ? 'is-matched' : ''}>{current.nameVerified ? 'Verified against the fictional referral.' : current.typedName ? 'Name does not match the fictional referral. Listen and try again.' : 'Ask the patient for their name before recording it.'}</small></form>
        <form onSubmit={event => submitIdentifier(event, 'identifier')}><label htmlFor="conversation-patient-id">Identifier stated by patient</label><div><input id="conversation-patient-id" autoComplete="off" value={enteredIdentifier} onChange={event => setEnteredIdentifier(event.target.value)} placeholder="Type the patient's hospital ID" disabled={!current.asked.includes('identifier') || current.identifierVerified} aria-invalid={!!current.typedIdentifier && !current.identifierVerified} aria-describedby="conversation-id-feedback" /><button disabled={!current.asked.includes('identifier') || current.identifierVerified} type="submit" aria-label="Verify spoken hospital identifier">{current.identifierVerified ? <CheckIcon aria-hidden="true" /> : 'VERIFY'}</button></div><small id="conversation-id-feedback" className={current.typedIdentifier && !current.identifierVerified ? 'is-mismatch' : current.identifierVerified ? 'is-matched' : ''}>{current.identifierVerified ? 'Verified against the fictional referral.' : current.typedIdentifier ? 'Identifier does not match the fictional referral. Listen and try again.' : 'Ask the patient for their identifier before recording it.'}</small></form>
      </div></div>}

      {phase === 'preparation' && <div className="game-conversation-respond"><span className="game-conversation-section-label">PATIENT CARE ACTIONS</span><div>
        {current.metalsReviewed && !current.metalsRemoved && <button onClick={() => update({ type: 'respond', response: 'remove-metals' })}>Ask patient to remove relevant metal <ArrowRightIcon /></button>}
        {current.mobilityReviewed && !current.mobilityAssisted && clinicalCase.id === 'lateral-followup' && <button onClick={() => update({ type: 'respond', response: 'assist-mobility' })}>Offer supported arm positioning <ArrowRightIcon /></button>}
        {(!current.reassured || current.trust < 55) && <button onClick={() => update({ type: 'respond', response: 'reassure' })}>Listen and reassure the patient <ArrowRightIcon /></button>}
        {readiness.safetyHold && !current.clinicianReferred && <button className="is-escalation" onClick={() => update({ type: 'respond', response: 'refer-clinician' })}>Pause and refer to supervising clinician <ArrowRightIcon /></button>}
        {readiness.safetyHold && current.clinicianReferred && <button className="is-escalation" onClick={() => update({ type: 'respond', response: 'review-report' })}>Receive simulated clinician assessment <ArrowRightIcon /></button>}
      </div><details className="game-conversation-training-choice"><summary>Explore an unsafe response</summary><button onClick={() => update({ type: 'respond', response: 'dismiss-concern' })}>Dismiss the patient’s concern and rush them</button><small>Patient confidence will decrease. Repair the interaction to continue.</small></details></div>}

      {readiness.safetyHold && <div role="alert" className="game-conversation-safety"><strong>SAFETY HOLD · DO NOT EXPOSE</strong><p>Possible pregnancy was reported in this fictional case. Escalate and wait for the supervising clinician's documented simulated assessment before continuing.</p></div>}
      {!physicallyReady && <div role="status" className="game-conversation-safety"><strong>ROOM NOT READY</strong><p>{!patientArrived ? 'Wait for the patient to arrive at the changing station.' : 'Open the privacy door to hand over the gown. Close it after leaving the room.'}</p></div>}

      <div className="game-conversation-footer"><span className="game-conversation-section-label">{readiness.ready ? physicallyReady ? 'READY FOR NEXT STEP' : 'ROOM ACTION REQUIRED' : 'NEXT REQUIRED STEP'}</span><p role="status">{!physicallyReady ? !patientArrived ? 'Wait for the patient to arrive at the changing room.' : 'Open the changing-room door before handing over the gown.' : readiness.blockers[0] ?? (phase === 'registration' ? 'Identity, referral and agreement documented.' : 'Screening, positioning comfort and patient communication are complete.')}</p><button className="game-primary" type="button" disabled={!readiness.ready || !physicallyReady} onClick={complete}>{phase === 'registration' ? 'Complete registration' : 'Hand over gown and leave room'} <ArrowRightIcon /></button><small>Scripted learning encounter · not real clinical clearance</small></div>
    </div>
  </section>;
}
