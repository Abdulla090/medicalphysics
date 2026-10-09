import type { ClinicalCase, CaseId, PreparationRecord } from './clinicalCases';

/** Scripted, fictional patient encounters for radiography students. Clinical escalation
 * is deliberately modelled as a separate supervising-clinician decision. */
export type ConversationPhase = 'registration' | 'preparation';
export type DialogueTopic = 'name' | 'identifier' | 'reason' | 'agreement' | 'mobility' | 'metals' | 'pregnancy' | 'explain' | 'breathing' | 'privacy';
export type DialogueResponse = 'remove-metals' | 'assist-mobility' | 'reassure' | 'refer-clinician' | 'review-report' | 'dismiss-concern';
export type DialogueAction =
  | { type: 'ask'; topic: DialogueTopic }
  | { type: 'transcribe'; field: 'name' | 'identifier'; value: string }
  | { type: 'respond'; response: DialogueResponse };

export type DialogueSpeaker = 'student' | 'patient' | 'system' | 'clinician';
export interface DialogueTurn { id: number; speaker: DialogueSpeaker; message: string }
export type PregnancyDisposition = 'unasked' | 'not-applicable' | 'no-concern-reported' | 'hold' | 'reviewed-clear';

export interface ClinicalDialogueSession {
  caseId: CaseId;
  phase: ConversationPhase;
  turns: DialogueTurn[];
  asked: DialogueTopic[];
  typedName: string;
  typedIdentifier: string;
  nameVerified: boolean;
  identifierVerified: boolean;
  referralReviewed: boolean;
  patientAgreed: boolean;
  mobilityReviewed: boolean;
  mobilityAssisted: boolean;
  metalsReviewed: boolean;
  metalsRemoved: boolean;
  pregnancy: PregnancyDisposition;
  explanationGiven: boolean;
  breathRehearsed: boolean;
  privacyExplained: boolean;
  trust: number;
  reassured: boolean;
  clinicianReferred: boolean;
}

export interface DialogueReadiness {
  ready: boolean;
  blockers: string[];
  progress: number;
  complete: number;
  total: number;
  safetyHold: boolean;
  preparation: PreparationRecord;
}

export interface ClinicalDialogueOutcome {
  phase: ConversationPhase;
  caseId: CaseId;
  preparation: PreparationRecord;
  pregnancy: PregnancyDisposition;
  trust: number;
  turns: DialogueTurn[];
}

interface PatientScript {
  opening: string;
  reason: string;
  agreement: string;
  mobility: string;
  metal: string;
  pregnancy: string;
  pregnancyDisposition: Exclude<PregnancyDisposition, 'unasked' | 'reviewed-clear'>;
  explanation: string;
  breathing: string;
  privacy: string;
  afterMetal: string;
  mobilitySupport?: string;
  requiresMobilitySupport: boolean;
}

const SCRIPTS: Record<CaseId, PatientScript> = {
  'outpatient-chest': {
    opening: 'Hi. I have been coughing for two weeks. I can stand, but I am worried I might cough while you take the picture.',
    reason: 'My clinician requested a chest X-ray because the cough has not settled.',
    agreement: 'Yes, I agree. Please tell me when to take a breath.',
    mobility: 'I can stand without help. I may need an extra moment before holding my breath.',
    metal: 'I have a small necklace under my shirt.',
    pregnancy: 'Pregnancy does not apply to me.',
    pregnancyDisposition: 'not-applicable',
    explanation: 'That makes sense. Can you give me a moment to get ready?',
    breathing: 'I can breathe in deeply and hold it briefly. Please give me a clear signal.',
    privacy: 'Thank you. I will change once you step out.',
    afterMetal: 'I have taken off the necklace and put it away.',
    requiresMobilitySupport: false,
  },
  'lateral-followup': {
    opening: 'Hello. I am here for the follow-up picture. My left shoulder has been rather stiff today.',
    reason: 'I was asked to return for a side-view chest image after something was seen near the base of my left lung.',
    agreement: 'I agree, provided we can take it slowly when I lift my arms.',
    mobility: 'I can stand still, but raising my arms quickly is painful. Could you guide me?',
    metal: 'I am wearing earrings and a necklace.',
    pregnancy: 'There is no pregnancy possibility in my circumstances.',
    pregnancyDisposition: 'not-applicable',
    explanation: 'A side-on image, all right. Please remind me where to put my arms.',
    breathing: 'I can hold my breath for a few seconds when you tell me.',
    privacy: 'I appreciate you explaining the changing arrangements.',
    afterMetal: 'Both the earrings and necklace are off now.',
    mobilitySupport: 'Thanks for offering support. I can lift my arms gradually; please stop if I say it hurts.',
    requiresMobilitySupport: true,
  },
  'abdominal-survey': {
    opening: 'Hello. My stomach hurts, and I am a bit uncomfortable lying flat.',
    reason: 'The clinician requested an abdominal X-ray because I have been having abdominal pain.',
    agreement: 'Yes, if my safety questions are answered before an X-ray.',
    mobility: 'I can lie down if I move slowly. My abdomen is sore when I move too quickly.',
    metal: 'I have a belt and metal zip at my waist.',
    pregnancy: 'I am not sure. Pregnancy might be possible, and I would like it checked before an X-ray.',
    pregnancyDisposition: 'hold',
    explanation: 'I understand where the detector goes. Thanks for explaining why you need me on the table.',
    breathing: 'Yes, I can breathe out gently and hold still when you ask.',
    privacy: 'Please give me some privacy while I change.',
    afterMetal: 'I have removed the belt and changed out of the metal-fastened clothing.',
    requiresMobilitySupport: false,
  },
};

const QUESTIONS: Record<DialogueTopic, string> = {
  name: 'Could you tell me your full name, please?',
  identifier: 'Please tell me your hospital identifier.',
  reason: 'What examination has your clinician requested, and why?',
  agreement: 'Are you comfortable proceeding with this discussion and examination?',
  mobility: 'Are you comfortable standing or lying in the required position?',
  metals: 'Do you have jewelry, fasteners or metal near the area being imaged?',
  pregnancy: 'Could pregnancy be possible for you? You may discuss this privately.',
  explain: 'I will explain the requested view, positioning and what the equipment does.',
  breathing: 'Let us practice the breathing instruction for this examination.',
  privacy: 'You can change privately. I will leave and the room can be closed.',
};

export const REGISTRATION_TOPICS: readonly DialogueTopic[] = ['name', 'identifier', 'reason', 'agreement'];
export const PREPARATION_TOPICS: readonly DialogueTopic[] = ['mobility', 'metals', 'pregnancy', 'explain', 'breathing', 'privacy'];

export const TOPIC_LABELS: Record<DialogueTopic, string> = {
  name: 'Ask full name', identifier: 'Ask hospital ID', reason: 'Discuss referral', agreement: 'Ask for agreement',
  mobility: 'Check positioning comfort', metals: 'Ask about artifacts', pregnancy: 'Pregnancy considerations',
  explain: 'Explain the examination', breathing: 'Practice breathing', privacy: 'Explain private changing',
};

function addTurns(session: ClinicalDialogueSession, ...entries: Array<[DialogueSpeaker, string]>): ClinicalDialogueSession {
  const last = session.turns[session.turns.length - 1]?.id ?? 0;
  return { ...session, turns: [...session.turns, ...entries.map(([speaker, message], index) => ({ id: last + index + 1, speaker, message }))].slice(-50) };
}

const fullNameKey = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ' ).replace(/\s+/g, ' ');
const identifierKey = (value: string) => value.normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function createClinicalDialogue(clinicalCase: ClinicalCase, phase: ConversationPhase): ClinicalDialogueSession {
  const opening = phase === 'registration'
    ? SCRIPTS[clinicalCase.id].opening
    : `I am ready to talk through the ${clinicalCase.requested === 'abdomen-ap' ? 'abdominal' : 'chest'} examination before changing.`;
  return {
    caseId: clinicalCase.id, phase,
    turns: [{ id: 1, speaker: 'patient', message: opening }], asked: [], typedName: '', typedIdentifier: '',
    nameVerified: false, identifierVerified: false, referralReviewed: false, patientAgreed: false,
    mobilityReviewed: false, mobilityAssisted: false, metalsReviewed: false, metalsRemoved: false,
    pregnancy: 'unasked', explanationGiven: false, breathRehearsed: false, privacyExplained: false,
    trust: 64, reassured: false, clinicianReferred: false,
  };
}

export function applyClinicalDialogue(clinicalCase: ClinicalCase, current: ClinicalDialogueSession, action: DialogueAction): ClinicalDialogueSession {
  if (current.caseId !== clinicalCase.id) return current;
  const script = SCRIPTS[clinicalCase.id];

  if (action.type === 'transcribe') {
    if (current.phase !== 'registration' || !current.asked.includes(action.field)) return current;
    const value = action.value.trim();
    const isName = action.field === 'name';
    const correct = !!value && (isName ? fullNameKey(value) === fullNameKey(clinicalCase.name) : identifierKey(value) === identifierKey(clinicalCase.identifier));
    const next = {
      ...current,
      typedName: isName ? value : current.typedName,
      typedIdentifier: isName ? current.typedIdentifier : value,
      nameVerified: isName ? correct : current.nameVerified,
      identifierVerified: isName ? current.identifierVerified : correct,
      trust: !correct && value ? Math.max(20, current.trust - 4) : current.trust,
    };
    return addTurns(next, ['student', isName ? `Recorded name: ${value || '(blank)'}` : `Recorded identifier: ${value || '(blank)'}`],
      [correct ? 'system' : 'patient', correct ? `${isName ? 'Full name' : 'Second identifier'} matches the referral record.` : value ? `That does not match the ${isName ? 'full name' : 'identifier'} I told you. Please check again.` : `I need you to record the ${isName ? 'full name' : 'identifier'} before we continue.`]);
  }

  if (action.type === 'ask') {
    const permitted = current.phase === 'registration' ? REGISTRATION_TOPICS : PREPARATION_TOPICS;
    if (!permitted.includes(action.topic)) return current;
    const asked = current.asked.includes(action.topic) ? current.asked : [...current.asked, action.topic];
    let next: ClinicalDialogueSession = { ...current, asked };
    let reply = '';
    switch (action.topic) {
      case 'name': reply = `My full name is ${clinicalCase.name}.`; break;
      case 'identifier': reply = `The identifier on my appointment is ${clinicalCase.identifier}.`; break;
      case 'reason': reply = script.reason; next = { ...next, referralReviewed: true }; break;
      case 'agreement': reply = script.agreement; next = { ...next, patientAgreed: true }; break;
      case 'mobility': reply = script.mobility; next = { ...next, mobilityReviewed: true }; break;
      case 'metals': reply = script.metal; next = { ...next, metalsReviewed: true }; break;
      case 'pregnancy': reply = script.pregnancy; next = { ...next, pregnancy: script.pregnancyDisposition }; break;
      case 'explain': {
        reply = script.explanation;
        next = { ...next, explanationGiven: true };
        break;
      }
      case 'breathing': {
        reply = script.breathing;
        next = { ...next, breathRehearsed: true };
        break;
      }
      case 'privacy': reply = script.privacy; next = { ...next, privacyExplained: true }; break;
    }
    if (action.topic === 'explain') {
      const description = clinicalCase.requested === 'abdomen-ap'
        ? 'You will lie on your back for a single abdominal view. I will ask you to breathe out gently and hold still.'
        : clinicalCase.requested === 'chest-lateral'
          ? 'We need a side-on chest image with your arms supported above the field. I will ask you to breathe in and hold briefly.'
          : 'We need an upright chest image facing the detector. I will ask you to breathe in deeply and hold briefly.';
      return addTurns(next, ['student', description], ['patient', reply]);
    }
    if (action.topic === 'breathing') {
      const instruction = clinicalCase.requested === 'abdomen-ap'
        ? 'Take a relaxed breath, breathe out gently, and hold still while the image is made. Breathe normally again when I say so.'
        : 'Take a full breath in and hold it briefly while the image is made. Breathe normally again when I say so.';
      return addTurns(next, ['student', instruction], ['patient', reply]);
    }
    return addTurns(next, ['student', QUESTIONS[action.topic]], ['patient', reply]);
  }

  if (current.phase !== 'preparation') return current;
  switch (action.response) {
    case 'remove-metals':
      if (!current.metalsReviewed) return addTurns(current, ['system', 'Ask what the patient is wearing before requesting artifact removal.']);
      if (current.metalsRemoved) return current;
      return addTurns({ ...current, metalsRemoved: true, trust: Math.min(100, current.trust + 2) },
        ['student', 'Please remove items that could obscure the examination, and tell me when you are ready.'], ['patient', script.afterMetal]);
    case 'assist-mobility':
      if (!current.mobilityReviewed) return addTurns(current, ['system', 'Ask about movement and comfort first.']);
      if (current.mobilityAssisted) return current;
      return addTurns({ ...current, mobilityAssisted: true, trust: Math.min(100, current.trust + 6) },
        ['student', 'We can adjust your pace and support your position. Tell me if anything is uncomfortable.'],
        ['patient', script.mobilitySupport ?? 'Thank you. Moving slowly will help me get into position.']);
    case 'reassure':
      if (current.reassured && current.trust >= 55) return current;
      return addTurns({ ...current, reassured: true, trust: Math.min(75, current.trust + 14) },
        ['student', 'I hear your concern. I will explain each step, and you can ask me to stop at any time.'],
        ['patient', 'Thank you for listening. I feel more comfortable now.']);
    case 'dismiss-concern':
      return addTurns({ ...current, trust: Math.max(0, current.trust - 35) },
        ['student', 'There is nothing to worry about. We need to get this done.'],
        ['patient', 'I do not feel listened to. Please explain what is happening before we continue.']);
    case 'refer-clinician':
      if (current.pregnancy !== 'hold') return addTurns(current, ['system', 'There is currently no pregnancy-related safety hold to escalate.']);
      if (current.clinicianReferred) return current;
      return addTurns({ ...current, clinicianReferred: true, trust: Math.min(100, current.trust + 8) },
        ['student', 'We will pause the examination and refer this concern to the supervising clinical team.'],
        ['patient', 'Thank you. I would prefer to have that checked first.'],
        ['system', 'Safety hold remains active. Await the scripted supervising-clinician outcome.']);
    case 'review-report':
      if (current.pregnancy !== 'hold' || !current.clinicianReferred) return current;
      return addTurns({ ...current, pregnancy: 'reviewed-clear' },
        ['clinician', 'SIMULATED SENIOR CLINICIAN REPORT: Additional fictional assessment excluded pregnancy in this training case. The referral was reviewed and the planned examination can continue under the exercise protocol.'],
        ['system', 'Safety hold released by the scripted supervising-clinician decision. In practice, follow local escalation, documentation, and justification procedures.']);
  }
}

export function getDialogueReadiness(clinicalCase: ClinicalCase, session: ClinicalDialogueSession): DialogueReadiness {
  if (session.caseId !== clinicalCase.id) return { ready: false, blockers: ['The patient case has changed. Start a new conversation.'], progress: 0, complete: 0, total: 0, safetyHold: false, preparation: { identity: false, request: false, screening: false, metals: false, communication: false } };
  const screening = session.mobilityReviewed && session.pregnancy !== 'unasked' && session.pregnancy !== 'hold' && (!SCRIPTS[clinicalCase.id].requiresMobilitySupport || session.mobilityAssisted);
  const preparation: PreparationRecord = {
    identity: session.nameVerified && session.identifierVerified,
    request: session.referralReviewed,
    screening,
    metals: session.metalsReviewed && session.metalsRemoved,
    communication: session.explanationGiven && session.breathRehearsed && session.privacyExplained,
  };
  const requirements: Array<[boolean, string]> = session.phase === 'registration' ? [
    [session.nameVerified, 'Ask for and correctly record the patient’s full name.'],
    [session.identifierVerified, 'Ask for and correctly record the hospital identifier.'],
    [session.referralReviewed, 'Ask the patient why they were referred.'],
    [session.patientAgreed, 'Ask if the patient agrees to proceed.'],
  ] : [
    [session.mobilityReviewed, 'Ask about pain, mobility and positioning comfort.'],
    [!SCRIPTS[clinicalCase.id].requiresMobilitySupport || session.mobilityAssisted, 'Offer a supported, gradual position for the painful shoulder.'],
    [session.metalsReviewed, 'Ask about jewelry and metal in the imaging field.'],
    [session.metalsRemoved, 'Ask the patient to remove the relevant artifacts.'],
    [session.pregnancy !== 'unasked', 'Ask privately about pregnancy possibility, where applicable.'],
    [session.pregnancy !== 'hold', 'Pause and refer possible pregnancy for authorised review before proceeding.'],
    [session.explanationGiven, 'Explain the projection and positioning.'],
    [session.breathRehearsed, 'Rehearse the correct breathing instruction.'],
    [session.privacyExplained, 'Explain how the patient will change privately.'],
    [session.trust >= 35, 'Address the patient’s concern and rebuild confidence before proceeding.'],
  ];
  const complete = requirements.filter(([met]) => met).length;
  const blockers = requirements.filter(([met]) => !met).map(([, detail]) => detail);
  return { ready: blockers.length === 0, blockers, progress: Math.round(complete / requirements.length * 100), complete, total: requirements.length, safetyHold: session.pregnancy === 'hold', preparation };
}

export function getDialogueOutcome(clinicalCase: ClinicalCase, session: ClinicalDialogueSession): ClinicalDialogueOutcome | null {
  const readiness = getDialogueReadiness(clinicalCase, session);
  if (!readiness.ready) return null;
  return { phase: session.phase, caseId: session.caseId, preparation: readiness.preparation, pregnancy: session.pregnancy, trust: session.trust, turns: session.turns };
}
