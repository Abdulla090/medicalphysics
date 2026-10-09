import { useState } from 'react';
import { CheckIcon, Cross2Icon, FileTextIcon, LockClosedIcon } from '@radix-ui/react-icons';
import {
  CLINICAL_CASES, PREPARATION_ITEMS, type CaseId, type ClinicalCase,
  type PreparationKey, type PreparationRecord, type SimulatedAssessment,
} from './clinicalCases';
import { getProtocol } from './protocols';
import type { CapturedImage } from './types';

interface Props {
  open: boolean;
  clinicalCase: ClinicalCase;
  preparation: PreparationRecord;
  patientPrepared: boolean;
  canGown: boolean;
  hygieneDone: boolean;
  assessment: SimulatedAssessment | null;
  caseImages: CapturedImage[];
  onClose: () => void;
  onSelectCase: (id: CaseId) => void;
  onVerify: (key: PreparationKey, checked: boolean) => void;
  onGown: () => void;
}

export function ClinicalWorkstation({ open, clinicalCase, preparation, patientPrepared, canGown, hygieneDone, assessment, caseImages, onClose, onSelectCase, onVerify, onGown }: Props) {
  const [tab, setTab] = useState<'worklist' | 'safety' | 'evaluation'>('worklist');
  const [interview, setInterview] = useState<'identity' | 'mobility' | 'safety' | 'breathing' | null>(null);
  const completed = PREPARATION_ITEMS.filter(item => preparation[item.key]).length;
  const allVerified = completed === PREPARATION_ITEMS.length;
  const prompts = [
    { id: 'identity' as const, question: 'Please state your name and patient identifier.', response: `My name is ${clinicalCase.name}. My training ID is ${clinicalCase.identifier}.`, checked: 'identity' as const },
    { id: 'mobility' as const, question: 'Are you comfortable with the requested position?', response: clinicalCase.id === 'abdominal-survey' ? 'I can lie flat on the table. My abdomen is uncomfortable, so please explain how to position me.' : 'I can stand at the receptor and follow your directions. I may need help locating the correct position.', checked: 'communication' as const },
    { id: 'safety' as const, question: 'Can we review screening and safety considerations?', response: clinicalCase.id === 'abdominal-survey' ? 'I understand that pregnancy screening may be relevant. Please follow your department’s pathway before proceeding.' : 'I understand why you need to confirm the examination and discuss radiation safety.', checked: 'screening' as const },
    { id: 'breathing' as const, question: 'Can you hold your breath briefly when instructed?', response: clinicalCase.id === 'abdominal-survey' ? 'Yes. Please tell me when to breathe out and hold.' : 'Yes. Please tell me when to take a deep breath in and stop for the picture.', checked: 'communication' as const },
  ];
  if (!open) return null;

  return <section className="sim-clinical-overlay" role="dialog" aria-modal="true" aria-label="Clinical training worklist">
    <div className="sim-clinical-heading">
      <span><FileTextIcon /> RADIOGRAPHY / CLINICAL WORKLIST <em>TRAINING DATA</em></span>
      <button onClick={onClose} aria-label="Close clinical worklist"><Cross2Icon /></button>
    </div>
    <div className="sim-clinical-tabs" role="tablist" aria-label="Clinical chart sections">
      {([{ id: 'worklist', text: '01 / CASE' }, { id: 'safety', text: '02 / PREPARATION' }, { id: 'evaluation', text: '03 / REVIEW' }] as const).map(item =>
        <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}>{item.text}</button>,
      )}
    </div>
    <div className="sim-clinical-content">
      {tab === 'worklist' && <>
        <p className="sim-clinical-caption">SIMULATED WORKLIST / SELECT A PATIENT ENCOUNTER</p>
        <div className="sim-case-list">
          {CLINICAL_CASES.map(item => <button key={item.id} aria-pressed={clinicalCase.id === item.id} onClick={() => onSelectCase(item.id)}>
            <span><b>{item.accession}</b><strong>{item.indication}</strong></span>
            <small>{getProtocol(item.requested).name}<span>{clinicalCase.id === item.id ? 'ACTIVE' : 'OPEN'}</span></small>
          </button>)}
        </div>
        <div className="sim-clinical-patient"><div><span>FICTIONAL TRAINING PATIENT</span><strong>{clinicalCase.name}</strong><small>{clinicalCase.age} years · ID {clinicalCase.identifier}</small></div><div><span>REQUESTED VIEW</span><strong>{getProtocol(clinicalCase.requested).name}</strong><small>Order {clinicalCase.accession}</small></div></div>
        <p className="sim-clinical-caption">CLINICAL QUESTION</p>
        <p className="sim-clinical-prose">{clinicalCase.question}</p>
        <p className="sim-clinical-prose is-secondary">{clinicalCase.clinicalContext}</p>
        <button className="sim-clinical-primary" onClick={() => setTab('safety')}>Review patient safety & preparation <span>→</span></button>
      </>}
      {tab === 'safety' && <>
        <div className="sim-clinical-progress"><span>PRE-EXPOSURE VERIFICATION</span><strong>{completed}<small> / {PREPARATION_ITEMS.length}</small></strong></div>
        <p className="sim-clinical-prose is-secondary">Confirm each action only after checking it with the simulated patient and worklist. These are learner attestations for this exercise, not real clinical records.</p>
        <div className="sim-clinical-interview">
          <p className="sim-clinical-caption">SCRIPTED PATIENT INTERVIEW / ASK A QUESTION</p>
          <div className="sim-interview-questions">{prompts.map(item => <button key={item.id} aria-pressed={interview === item.id} onClick={() => { setInterview(item.id); onVerify(item.checked, true); }}>{item.question}</button>)}</div>
          {interview && <div className="sim-interview-response"><span>SIMULATED PATIENT / {clinicalCase.name.toUpperCase()}</span><p>{prompts.find(item => item.id === interview)?.response}</p></div>}
        </div>
        <div className="sim-clinical-checks">
          {PREPARATION_ITEMS.map(item => <label key={item.key} className={preparation[item.key] ? 'is-checked' : ''}>
            <input type="checkbox" checked={preparation[item.key]} onChange={event => onVerify(item.key, event.target.checked)} />
            <span className="sim-clinical-check-mark">{preparation[item.key] ? <CheckIcon /> : null}</span>
            <span><strong>{item.title}</strong><small>{item.detail}</small></span>
          </label>)}
        </div>
        <p className="sim-clinical-note">{clinicalCase.preparationNote}</p>
        <div className="sim-clinical-hygiene"><span className={hygieneDone ? 'is-done' : ''}>{hygieneDone ? <CheckIcon /> : '!'}</span><div><strong>{hygieneDone ? 'Hand hygiene completed' : 'Perform hand hygiene in Imaging 01'}</strong><small>Stand by the wall-mounted dispenser in the imaging room, aim at it and press E. Return to the changing area when ready.</small></div></div>
        <div className="sim-clinical-gown">
          <div><strong>{patientPrepared ? 'Patient prepared for examination' : 'Prepare in private changing room'}</strong><span>{patientPrepared ? 'Patient in gown · proceed to the imaging suite' : !hygieneDone ? 'Complete hand hygiene at the dispenser first' : !allVerified ? 'Complete all clinical verification items first' : !canGown ? 'Stand inside changing room and close its privacy door' : 'Checks recorded. The changing-room door is closed.'}</span></div>
          <button disabled={patientPrepared || !hygieneDone || !allVerified || !canGown} onClick={onGown}>{patientPrepared ? <CheckIcon /> : <LockClosedIcon />}{patientPrepared ? 'Prepared' : 'Gown patient'}</button>
        </div>
        <button className="sim-clinical-primary" onClick={onClose}>Return to department <span>→</span></button>
      </>}
      {tab === 'evaluation' && (assessment ? <>
        <div className="sim-assessment-hero"><div><span>EDUCATIONAL PERFORMANCE RUBRIC</span><strong>{assessment.score}<small> / {assessment.total}</small></strong><p>Technique and safety checkpoints from your most recent synthetic exposure.</p></div><div className="sim-assessment-ring" style={{ '--progress': `${assessment.score}%` } as React.CSSProperties}><span>{assessment.score}%</span></div></div>
        {assessment.criticalFailures.length > 0 && <div className="sim-assessment-critical"><strong>Critical review items</strong>{assessment.criticalFailures.map(message => <p key={message}>{message}</p>)}</div>}
        <div className="sim-assessment-items">{assessment.items.map(item => <div key={item.id}><span className={item.earned === item.points ? 'is-complete' : ''}>{item.earned === item.points ? <CheckIcon /> : '·'}</span><div><strong>{item.label}</strong>{item.earned < item.points && <small>{item.feedback}</small>}</div><b>{item.earned}/{item.points}</b></div>)}</div>
        {caseImages.length > 0 && <div className="sim-clinical-comparison">
          <span className="sim-clinical-caption">IMAGE QUALITY STUDIO / LAST TWO ACQUISITIONS</span>
          <div className="sim-clinical-comparison-images">
            {caseImages.slice(0, 2).map((item, index) => <div key={item.id}>
              <div className="sim-comparison-image"><img src={item.previewUrl} alt={`Synthetic ${getProtocol(item.state.protocol).name} study ${index + 1}`} /></div>
              <span>{index === 0 ? 'LATEST CAPTURE' : 'PREVIOUS CAPTURE'}</span>
              <b>{item.state.kvp} kVp · {item.metrics.mas.toFixed(1)} mAs</b>
              <small>Relative fluence {item.metrics.relativeExposure.toFixed(2)}× · modeled blur {item.metrics.unsharpness.toFixed(3)} mm</small>
            </div>)}
          </div>
          {caseImages.length > 1 && <p className="sim-clinical-prose is-secondary">
            Latest relative detector fluence: <strong>{(caseImages[0].metrics.relativeExposure / caseImages[1].metrics.relativeExposure).toFixed(2)}×</strong> the previous study.
            Compare anatomy coverage and modeled noise before choosing a technique. Relative fluence is not a calibrated dose or exposure index.
          </p>}
        </div>}
        <p className="sim-clinical-note">This transparent exercise rubric is approximate. Image acceptance in clinical practice requires a qualified radiographer and local quality standards.</p>
      </> : <div className="sim-clinical-empty"><FileTextIcon /><strong>No exposure assessed yet</strong><p>Prepare the patient, acquire an image from the shielded control room, then return here for a structured critique of your decisions.</p><button onClick={() => setTab('worklist')}>Review active case</button></div>)}
    </div>
    <footer className="sim-clinical-footer"><span>MEDICALPHYSICS / EDUCATIONAL SIMULATION</span><span>{clinicalCase.accession} · SESSION LOCAL</span></footer>
  </section>;
}
