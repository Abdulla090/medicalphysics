import { calculateMetrics, getReadinessChecks } from './physics';
import { getProtocol } from './protocols';
import type { CaseId, ClinicalCase, PreparationRecord, SimulatedAssessment } from './clinicalCases';
import type { GameStage } from './GameJourney';
import type { SimulatorState } from './types';

/** An authored learning bank for fictional cases. Scores measure recall within this exercise only. */
export interface TeachingChoice {
  id: string;
  label: string;
  feedback: string;
}

export interface TeachingQuestion {
  id: string;
  stage: GameStage;
  prompt: string;
  choices: TeachingChoice[];
  correctId: string;
  rationale: string;
  points: number;
}

export interface TeachingLesson {
  title: string;
  objective: string;
  clinicalReasoning: string;
  practice: string;
  imageCritique: string;
}

export interface TeachingGrade {
  earned: number;
  total: number;
  answered: number;
  correct: number;
  complete: boolean;
  percent: number;
  results: { id: string; selectedId: string | null; correct: boolean; feedback: string }[];
}

export interface TeachingObservation {
  id: string;
  label: string;
  status: 'confirmed' | 'attention' | 'guidance';
  detail: string;
}

const makeQuestion = (
  id: string,
  stage: GameStage,
  prompt: string,
  choices: [string, string, string][],
  correctId: string,
  rationale: string,
  points = 10,
): TeachingQuestion => ({ id, stage, prompt, choices: choices.map(([key, label, feedback]) => ({ id: key, label, feedback })), correctId, rationale, points });

const SHARED_QUESTIONS: Record<GameStage, TeachingQuestion> = {
  registration: makeQuestion('common-identity', 'registration', 'The referral and appointment details match. What is the next patient-identification action?', [
    ['a', 'Ask the person to state two identifiers and compare with the request.', 'Correct: independently stated identifiers help detect a wrong-patient match.'],
    ['b', 'Read the displayed name aloud and ask whether it sounds right.', 'Leading questions can be agreed with even when details are wrong.'],
    ['c', 'Use the examination type as sufficient evidence of identity.', 'A shared examination type cannot identify an individual.'],
  ], 'a', 'Active identification and cross-checking the request come before preparing the simulated examination.'),
  changing: makeQuestion('common-preparation', 'changing', 'How should preparation be approached before exposing a patient?', [
    ['a', 'Skip the safety questions if the patient appears comfortable.', 'Appearance does not replace indicated screening or informed communication.'],
    ['b', 'Explain the view, ask relevant safety questions, and remove objects that may obscure anatomy.', 'Correct: preparation includes communication, appropriate screening and artifact prevention.'],
    ['c', 'Remove all belongings regardless of the examined region without explaining why.', 'Preparation should be relevant, proportionate and respectful of privacy.'],
  ], 'b', 'The clinical request, patient circumstances and local policy inform preparation.'),
  escort: makeQuestion('common-escort', 'escort', 'The patient reports dizziness while walking toward the imaging room. What should you do?', [
    ['a', 'Continue because the room is nearby.', 'Proceeding without responding may increase risk during transfer.'],
    ['b', 'Tell the patient to walk faster to finish the examination.', 'Rushing is not a suitable response to a change in patient condition.'],
    ['c', 'Pause, protect the patient from falling and seek appropriate clinical assistance.', 'Correct: reassess safety and mobility before continuing.'],
  ], 'c', 'Clinical communication is continuous; the simulated workflow should not override patient safety.'),
  position: makeQuestion('common-position', 'position', 'What best demonstrates successful positioning in this exercise?', [
    ['a', 'Only the numerical rotation value is near zero.', 'A single control does not establish centering or required anatomical coverage.'],
    ['b', 'The required anatomy is included, the projection is aligned and limbs do not obscure the question.', 'Correct: coverage, centering and avoidable superimposition must be considered together.'],
    ['c', 'The collimator is opened to its maximum regardless of anatomy.', 'An unnecessarily wide field may include avoidable exposure and scatter.'],
  ], 'b', 'Review the light field, patient posture, projection and anatomical boundaries together.'),
  exposure: makeQuestion('common-mas', 'exposure', 'A simulated technique uses 200 mA for 10 ms. What is its mAs?', [
    ['a', '2 mAs', 'Correct: 200 × 0.010 s = 2 mAs.'],
    ['b', '20 mAs', 'The exposure time is 0.010 seconds, not 0.10 seconds.'],
    ['c', '2,000 mAs', 'Milliseconds must be converted to seconds before multiplying by mA.'],
  ], 'a', 'mAs = tube current (mA) × exposure duration (seconds). This is an equipment setting, not a patient-dose measurement.'),
  review: makeQuestion('common-review', 'review', 'A simulated radiograph shows cut-off anatomy. What is the appropriate next decision?', [
    ['a', 'Repeat automatically until the score reaches 100%.', 'An exercise score alone does not justify a new clinical exposure.'],
    ['b', 'Accept automatically because a digital image was generated.', 'Acquisition success does not establish whether the requested anatomy is represented.'],
    ['c', 'Evaluate whether required anatomy is missing and consider a repeat only if justified under local policy.', 'Correct: the reason for any repeat should be explicit and clinically justified.'],
  ], 'c', 'Separate image quality critique from any decision to repeat; this educational model cannot determine clinical acceptability.'),
};

const CASE_QUESTIONS: Record<CaseId, Partial<Record<GameStage, TeachingQuestion>>> = {
  'outpatient-chest': {
    registration: makeQuestion('pa-request', 'registration', 'Alex can stand and follow instructions. Which plan answers this referral in the exercise?', [
      ['a', 'A supine AP chest because it is always equivalent to PA.', 'Projection and patient posture affect interpretation; AP is not interchangeable by default.'],
      ['b', 'An erect PA chest with deliberate lung coverage and inspiratory instruction.', 'Correct: it matches the simulated request and Alex’s stated ability.'],
      ['c', 'An AP abdomen to include the lung bases.', 'The ordered anatomy and clinical question are for a chest view.'],
    ], 'b', 'Match the requested projection and the patient’s circumstances before planning technique.'),
    changing: makeQuestion('pa-artifacts', 'changing', 'Alex is wearing a necklace and has a metal object in a shirt pocket. Why address both?', [
      ['a', 'They may project over lung or mediastinal anatomy and obscure information.', 'Correct: remove relevant items with the patient’s understanding and privacy.'],
      ['b', 'Metal always prevents a digital detector from functioning.', 'The main issue here is an image artifact, not a universal detector failure.'],
      ['c', 'Their removal is needed only if the first image looks abnormal.', 'Avoid preventable image artifacts during preparation.'],
    ], 'a', 'Artifact prevention occurs before imaging and should target the field of interest.'),
    escort: makeQuestion('pa-upright', 'escort', 'Alex has reached the wall stand. What should you explain before positioning?', [
      ['a', 'Expect movement throughout exposure to demonstrate breathing.', 'Movement can blur the image and chest position must be coordinated.'],
      ['b', 'Breathing instructions can be omitted for all standing examinations.', 'Breathing coordination is important for the requested model of chest imaging.'],
      ['c', 'How to stand at the receptor, roll shoulders and hold a full inspiration on instruction.', 'Correct: explain cooperation and breathing before asking the patient to hold still.'],
    ], 'c', 'Clear instructions make a reproducible erect PA projection more likely.'),
    position: makeQuestion('pa-rotation', 'position', 'One medial clavicular end appears further from the spine than the other on the PA chest image. What should you investigate?', [
      ['a', 'Rotation during positioning before evaluating symmetry in the image.', 'Correct: unequal symmetry may indicate rotation; review patient alignment.'],
      ['b', 'Only a change in tube voltage.', 'kVp does not correct rotational projection geometry.'],
      ['c', 'Only a change in digital display brightness.', 'Windowing cannot remove anatomical rotation.'],
    ], 'a', 'Clavicular symmetry is an image critique clue, considered with patient anatomy and projection.'),
    exposure: makeQuestion('pa-breath', 'exposure', 'Alex is ready at the PA stand. When should the brief breath hold be coordinated?', [
      ['a', 'During a full expiration, long before equipment is ready.', 'Expiration reduces inspired lung volume in this synthetic chest model.'],
      ['b', 'After a full inspiration, once the operator is ready to expose from protection.', 'Correct: coordinate an achievable inspiratory breath hold with acquisition.'],
      ['c', 'Only after the radiograph appears on the screen.', 'The instruction must precede the capture.'],
    ], 'b', 'Breathing is time-sensitive; explain and coordinate it, then resume normal breathing promptly.'),
    review: makeQuestion('pa-corners', 'review', 'The synthetic PA image omits the lateral costophrenic angles. What is the primary critique?', [
      ['a', 'The lung fields may be incompletely demonstrated for the requested view.', 'Correct: evaluate required anatomical boundaries before disposition.'],
      ['b', 'The image is perfect if the ribs remain visible.', 'Partial visibility does not establish complete lung coverage.'],
      ['c', 'This necessarily proves a disease process.', 'Coverage errors cannot establish a diagnosis.'],
    ], 'a', 'Evaluate both lung apices and costophrenic angles alongside rotation, inspiration and artifacts.'),
  },
  'lateral-followup': {
    registration: makeQuestion('lat-indication', 'registration', 'Jordan’s request asks for a lateral chest view after a left basal opacity. Which part of the request changes the planned projection?', [
      ['a', 'The patient’s age alone.', 'Age is relevant to context, but does not define the requested projection here.'],
      ['b', 'The instruction to provide a lateral view and assess the region behind the heart.', 'Correct: the projection and clinical question inform positioning and coverage.'],
      ['c', 'The number of prior appointments.', 'Appointment count does not determine the ordered view.'],
    ], 'b', 'Review the specific examination request without inferring a diagnosis from the fictional indication.'),
    changing: makeQuestion('lat-jewelry', 'changing', 'Why check necklaces, fasteners and other objects before Jordan’s lateral chest?', [
      ['a', 'Items over the thorax may mimic or hide structures, reducing interpretability.', 'Correct: relevant artifact removal is part of preparing the requested region.'],
      ['b', 'The detector cannot record images if any jewelry is present.', 'The detector may still acquire, but image artifacts can result.'],
      ['c', 'All metal must be removed from every room in the hospital.', 'Preparation must be relevant to the examination and patient circumstances.'],
    ], 'a', 'Reducing superimposed artifacts matters particularly when evaluating an obscured region.'),
    escort: makeQuestion('lat-position', 'escort', 'Jordan can stand for the requested lateral. Which side is placed against the wall receptor in this exercise?', [
      ['a', 'The back of the patient, creating a PA view.', 'This would alter the requested projection.'],
      ['b', 'The right side without checking the local lateral protocol.', 'The exercise protocol specifically describes a left lateral projection.'],
      ['c', 'The left side, with comfortable arm elevation planned.', 'Correct: this exercise uses an erect left lateral chest projection.'],
    ], 'c', 'Match the protocol and adapt for comfort and local clinical practice.'),
    position: makeQuestion('lat-arms', 'position', 'Jordan’s humeri project across the upper thorax in the simulated lateral image. Which correction targets that problem?', [
      ['a', 'Raise the arms clear of the field while preserving a true lateral posture.', 'Correct: arm position can reduce avoidable superimposition.'],
      ['b', 'Increase tube voltage to remove the bones.', 'Increasing kVp does not remove projected anatomy.'],
      ['c', 'Rotate the patient into an AP projection.', 'That would change the requested projection.'],
    ], 'a', 'Review arm clearance and shoulder/hip overlap together for the lateral position.'),
    exposure: makeQuestion('lat-noise', 'exposure', 'The modeled lateral view shows pronounced quantum noise. Which adjustment most directly changes detector fluence within this simplified model?', [
      ['a', 'Select a different patient identifier.', 'Identification must be correct, but it does not change modeled photon fluence.'],
      ['b', 'Review mAs and acquisition parameters using the local technique protocol.', 'Correct: mAs affects modeled photon statistics; the training range is illustrative.'],
      ['c', 'Change the background color of the review screen.', 'Display styling does not improve acquired signal statistics.'],
    ], 'b', 'Higher fluence can reduce visible quantum noise but changes exposure; this model has no calibrated dose output.'),
    review: makeQuestion('lat-overlap', 'review', 'The simulated lateral chest shows conspicuously separated posterior rib contours. What issue deserves review?', [
      ['a', 'Automatic confirmation that the lungs are disease-free.', 'The model does not assess pathology.'],
      ['b', 'An image that needs no positioning review because it is lateral.', 'A named projection does not guarantee an optimal image.'],
      ['c', 'Patient rotation away from a true lateral position.', 'Correct: rib separation may indicate obliquity; inspect the view and other clues.'],
    ], 'c', 'Critique overlap, arms, coverage and motion before deciding whether the image meets the request.'),
  },
  'abdominal-survey': {
    registration: makeQuestion('abd-justification', 'registration', 'Sam has a request for non-specific abdominal pain. What needs review before proceeding?', [
      ['a', 'The requested view and clinical justification, with any relevant pregnancy considerations under local policy.', 'Correct: appropriateness and indicated screening cannot be assumed from the complaint.'],
      ['b', 'Only the scanner’s available exposure time.', 'Equipment settings do not replace clinical justification or screening.'],
      ['c', 'That an X-ray must be performed for every abdominal pain complaint.', 'Symptoms alone do not automatically justify any particular imaging examination.'],
    ], 'a', 'The training exercise does not itself establish whether imaging is clinically indicated.'),
    changing: makeQuestion('abd-belt', 'changing', 'Sam has a metallic belt buckle at the lower abdomen. What is the relevant concern?', [
      ['a', 'The belt increases the tube voltage electronically.', 'Clothing artifacts do not directly change kVp.'],
      ['b', 'The buckle could obscure the intended anatomy or create an image artifact.', 'Correct: remove relevant waist objects while respecting privacy.'],
      ['c', 'Clothing is unrelated to radiographic image quality.', 'Objects in the field can be projected onto the image.'],
    ], 'b', 'Appropriate artifact prevention supports deliberate abdominal coverage.'),
    escort: makeQuestion('abd-transfer', 'escort', 'Sam needs a supine abdominal acquisition but reports difficulty lying flat. What should happen next?', [
      ['a', 'Proceed without informing the team because the request says supine.', 'A request does not eliminate the need to assess patient tolerance.'],
      ['b', 'Change the protocol without documenting or discussing the limitation.', 'A changed projection must be reviewed with the appropriate clinical team.'],
      ['c', 'Pause, assess safe positioning and communicate limitations to the supervising team.', 'Correct: adapt the plan safely using local clinical guidance.'],
    ], 'c', 'Mobility, dignity and clinical tolerance affect how an exam can be performed.'),
    position: makeQuestion('abd-centering', 'position', 'For the exercise’s supine AP abdomen, which centering cue is specified by the selected protocol?', [
      ['a', 'Center near the iliac crests, then confirm the requested anatomy is within the beam.', 'Correct: the exercise protocol uses the iliac crests as a reference with coverage review.'],
      ['b', 'Aim at the skull to ensure the detector includes the abdomen.', 'The skull is unrelated to this abdominal projection.'],
      ['c', 'Center on a random point if the field is fully open.', 'A deliberately chosen anatomical reference is essential.'],
    ], 'a', 'Centering and collimation should be adapted to the precise anatomy requested.'),
    exposure: makeQuestion('abd-respiration', 'exposure', 'Which breath instruction corresponds to the modeled supine abdominal protocol?', [
      ['a', 'Hold a deep inspiration as for the erect PA chest.', 'This is not the exercise’s abdominal breathing instruction.'],
      ['b', 'Suspend respiration on expiration once equipment is ready.', 'Correct: this matches the training protocol and limits motion in the model.'],
      ['c', 'Continue moving through normal breathing throughout acquisition.', 'Motion can degrade the synthetic acquisition.'],
    ], 'b', 'Explain the instruction and coordinate a brief achievable hold immediately before acquisition.'),
    review: makeQuestion('abd-coverage', 'review', 'The abdominal radiograph cuts off anatomy required by the referral. What should your critique address?', [
      ['a', 'Whether the simulated patient has a named abdominal disease.', 'The synthetic phantom does not support diagnostic conclusions.'],
      ['b', 'Only the percentage score of the exercise.', 'The rubric cannot independently decide clinical suitability.'],
      ['c', 'Centering, collimation and whether the request is adequately covered before any justified repeat decision.', 'Correct: identify the actual technical deficiency and its effect on the requested examination.'],
    ], 'c', 'Interpret simulated positioning and coverage as educational observations only.'),
  },
};

const LESSONS: Record<CaseId, Record<GameStage, TeachingLesson>> = {
  'outpatient-chest': {
    registration: { title: 'Interpret the PA chest request', objective: 'Identify the correct patient and the requested projection.', clinicalReasoning: 'Alex is ambulatory and can follow a breathing instruction. The fictional referral requests an erect PA chest to demonstrate the lung fields.', practice: 'Have Alex state two identifiers. Compare the referral, indication and requested PA projection before proceeding.', imageCritique: 'Later check that the final projection corresponds to the order.' },
    changing: { title: 'Prepare the thorax', objective: 'Protect privacy while preparing an artifact-free field.', clinicalReasoning: 'Jewelry and pocket contents can superimpose the lung fields, hiding information needed for the exercise.', practice: 'Explain the gown, remove relevant objects, complete screening and plan a full-inspiration breath instruction.', imageCritique: 'Check for external objects along the chest and clavicles.' },
    escort: { title: 'Coordinate the erect examination', objective: 'Confirm safe standing and describe the positioning sequence.', clinicalReasoning: 'The patient must remain comfortable and cooperate long enough for alignment and a brief breath hold.', practice: 'Bring Alex to the wall receptor; explain the posture, shoulder placement and breathing cue.', imageCritique: 'Look for motion and the position of the shoulder blades.' },
    position: { title: 'Align the PA projection', objective: 'Center the chest and include the lung boundaries.', clinicalReasoning: 'Rotation, chin position and shoulder posture change the appearance of the mediastinum and lung fields.', practice: 'Face the detector, roll shoulders forward, lift the chin, recenter and inspect the light field.', imageCritique: 'Inspect medial clavicle symmetry, scapular position, apices and costophrenic angles.' },
    exposure: { title: 'Coordinate technique and inspiration', objective: 'Combine the exercise’s settings with a protected exposure workflow.', clinicalReasoning: 'Tube voltage, mAs, field size and distance affect this synthetic image; none provides a calibrated patient-dose estimate.', practice: 'Compare settings to this case’s illustrative exercise ranges, check receptor readiness and protection, then give a short full-inspiration cue.', imageCritique: 'Inspect lung inflation, noise and motion after acquisition.' },
    review: { title: 'Critique the PA image', objective: 'Explain whether the depicted anatomy answers the training request.', clinicalReasoning: 'Acquisition success and a high exercise score do not guarantee clinical suitability.', practice: 'Review coverage, rotation, inspiration, artifacts, noise and sharpness in the synthetic radiograph.', imageCritique: 'Verify both lung apices and costophrenic angles; justify any contemplated repeat separately.' },
  },
  'lateral-followup': {
    registration: { title: 'Interpret the lateral follow-up', objective: 'Identify the patient and the ordered lateral chest view.', clinicalReasoning: 'The fictional question emphasizes the region posterior to the heart; the request specifies a left lateral view.', practice: 'Verify Jordan’s identifiers and note the projected anatomy before preparing the room.', imageCritique: 'Confirm that the selected view is lateral, rather than a substituted PA or AP.' },
    changing: { title: 'Clear the thoracic field', objective: 'Reduce avoidable image artifacts.', clinicalReasoning: 'Jewelry, clothing fasteners and upper-limb superimposition may obscure the requested thoracic region.', practice: 'Explain the gown, ask safety questions and remove objects relevant to the projected chest anatomy.', imageCritique: 'Examine the retrocardiac region for projected objects or superimposed arms.' },
    escort: { title: 'Set up the left lateral view', objective: 'Bring Jordan safely to the wall detector.', clinicalReasoning: 'The patient can stand; a true lateral position with the left side against the receptor is requested.', practice: 'Explain lateral stance, arm elevation and breathing instruction; assess comfort before requiring the pose.', imageCritique: 'Later inspect whether the posture appears truly lateral.' },
    position: { title: 'Control overlap and arm placement', objective: 'Produce a true lateral with thoracic anatomy visible.', clinicalReasoning: 'Rotated shoulders, hips and lowered arms may introduce avoidable superimposition.', practice: 'Raise both arms clear of the image field, align shoulders and hips, recenter and inspect coverage.', imageCritique: 'Look for posterior rib overlap, lung boundaries and whether the humeri obscure the chest.' },
    exposure: { title: 'Balance signal and motion', objective: 'Select an illustrative technique and coordinate protected acquisition.', clinicalReasoning: 'A lateral chest may require a different modeled mAs than PA, but settings must follow the training range and local policy.', practice: 'Review the selected projection, SID, mAs, receptor, protection and a brief full-inspiration cue.', imageCritique: 'Check noise and motion without interpreting the model as a calibrated dose estimator.' },
    review: { title: 'Critique the lateral projection', objective: 'Identify avoidable positioning and signal-quality issues.', clinicalReasoning: 'Superimposed arms or excessive posterior-rib separation may limit the projected region in this exercise.', practice: 'Inspect true lateral posture, arm clearance, coverage, blur, noise and relevant anatomy.', imageCritique: 'Explain any technical limitation before discussing image disposition or potential repeat.' },
  },
  'abdominal-survey': {
    registration: { title: 'Review the abdominal request', objective: 'Verify identity, indication and whether the order is justified.', clinicalReasoning: 'The fictional complaint is non-specific. This simulator does not determine clinical imaging appropriateness.', practice: 'Review the ordered AP abdominal view and check indicated pregnancy considerations according to local policy.', imageCritique: 'Later ensure the acquired region and view match the referral.' },
    changing: { title: 'Prepare the abdominal field', objective: 'Complete safety questions and prevent clothing artifacts.', clinicalReasoning: 'Metal near the waist or lower abdomen may obscure projected anatomy; privacy remains essential.', practice: 'Review relevant screening and communication, remove waist artifacts, explain the gown and expiration cue.', imageCritique: 'Check for projected belt buckles or clothing hardware.' },
    escort: { title: 'Plan a safe supine transfer', objective: 'Assess comfort and reach the radiographic table safely.', clinicalReasoning: 'Supine positioning can require mobility assistance or adaptation based on a patient’s condition.', practice: 'Explain the table position and identify any mobility or tolerance concerns before moving Sam.', imageCritique: 'Later check positioning after the transfer.' },
    position: { title: 'Center the AP abdomen', objective: 'Include the requested anatomy with deliberate collimation.', clinicalReasoning: 'The exercise uses the iliac crests as a centering reference; the actual request determines coverage.', practice: 'Align the supine midsagittal plane, center near the iliac crests and inspect beam boundaries.', imageCritique: 'Check anatomy coverage and rotation before deciding on image adequacy.' },
    exposure: { title: 'Acquire at expiration', objective: 'Coordinate an expiration breath hold and protected workflow.', clinicalReasoning: 'A timed breath hold limits modeled motion; kVp, mAs and SID change synthetic detector statistics.', practice: 'Compare technique against illustrative case ranges, check the detector and protection, and cue expiration.', imageCritique: 'Review motion and noise without claiming a calibrated patient dose.' },
    review: { title: 'Critique the abdominal coverage', objective: 'Identify whether the requested projected anatomy is included.', clinicalReasoning: 'The simulator’s synthetic anatomy and rubric cannot support clinical diagnosis or a definitive repeat decision.', practice: 'Review centering, field limits, rotation, artifacts, motion and the referral before disposition.', imageCritique: 'Describe missing anatomy, if any, and the corrective positioning action rather than assigning pathology.' },
  },
};

export function getTeachingLesson(caseId: CaseId, stage: GameStage): TeachingLesson {
  return LESSONS[caseId][stage];
}

export function getTeachingQuestions(caseId: CaseId, stage: GameStage): TeachingQuestion[] {
  return [CASE_QUESTIONS[caseId][stage]!, SHARED_QUESTIONS[stage]];
}

/** A missing or unknown answer receives zero credit and is never treated as completed. */
export function gradeTeachingAnswers(questions: readonly TeachingQuestion[], answers: Readonly<Record<string, string>>): TeachingGrade {
  const results = questions.map(question => {
    const choice = question.choices.find(option => option.id === answers[question.id]);
    const correct = !!choice && choice.id === question.correctId;
    return {
      id: question.id,
      selectedId: choice?.id ?? null,
      correct,
      feedback: choice ? correct ? question.rationale : `${choice.feedback} ${question.rationale}` : 'Choose an answer to complete this item.',
    };
  });
  const total = questions.reduce((sum, question) => sum + question.points, 0);
  const earned = questions.reduce((sum, question, index) => sum + (results[index].correct ? question.points : 0), 0);
  const answered = results.filter(item => item.selectedId !== null).length;
  return { earned, total, answered, correct: results.filter(item => item.correct).length, complete: answered === questions.length, percent: total ? Math.round(100 * earned / total) : 0, results };
}

export function getTeachingObservations(
  clinicalCase: ClinicalCase,
  stage: GameStage,
  state: SimulatorState,
  preparation: PreparationRecord,
  assessment: SimulatedAssessment | null,
  extras: { patientPrepared?: boolean; hygieneDone?: boolean } = {},
): TeachingObservation[] {
  const observations: TeachingObservation[] = [];
  const add = (id: string, label: string, ok: boolean | undefined, success: string, next: string) => observations.push({
    id, label, status: ok === undefined ? 'guidance' : ok ? 'confirmed' : 'attention', detail: ok ? success : next,
  });
  const checks = getReadinessChecks(state);
  const passes = (id: string) => checks.some(item => item.id === id && item.passed);
  const projection = getProtocol(clinicalCase.requested);
  const metrics = calculateMetrics(state);
  const within = (value: number, [min, max]: [number, number]) => Number.isFinite(value) && value >= min && value <= max;
  switch (stage) {
    case 'registration':
      add('identity', 'Identity verification', preparation.identity, 'Two identifiers recorded as verified.', 'Ask the patient to state two identifiers and cross-check the fictional request.');
      add('request', 'Requested projection', preparation.request, `Referral reviewed: ${projection.name}.`, `Review the clinical question and confirm the ${projection.name} order.`);
      break;
    case 'changing':
      add('screening', 'Safety conversation', preparation.screening, 'Safety questions marked complete.', clinicalCase.id === 'abdominal-survey' ? 'Review indicated pregnancy screening and justification under local policy.' : 'Ask relevant safety and mobility questions.');
      add('metals', 'Artifact prevention', preparation.metals, 'Relevant objects recorded as removed.', clinicalCase.preparationNote);
      add('communication', 'Instructions', preparation.communication, 'Preparation instructions recorded.', 'Explain the gown, privacy, projection and breathing before proceeding.');
      break;
    case 'escort':
      add('prepared', 'Ready to move to imaging', extras.patientPrepared, 'Patient preparation completed in the simulator.', 'Complete gowning, preserve privacy and assess mobility before escort.');
      add('requested', 'Destination and equipment', undefined, '', `${projection.position === 'erect' ? 'Wall stand' : 'Supine table'} is specified for this case. Confirm comfort and ability to cooperate.`);
      break;
    case 'position':
      add('hygiene', 'Hand hygiene', extras.hygieneDone, 'Hand hygiene was completed in this scenario.', 'Use the imaging-room hygiene station before patient contact.');
      add('projection', 'Protocol match', state.protocol === clinicalCase.requested, `Selected ${projection.name} matches the request.`, `Change the selected protocol to the requested ${projection.name}.`);
      add('alignment', 'Patient alignment', passes('centering') && passes('rotation') && passes('arms'), 'The simulated centering, rotation and arm clearance checks pass.', 'Recenter, correct avoidable rotation and clear arms from the region of interest.');
      add('coverage', 'Field coverage', passes('coverage'), 'The model estimates adequate target coverage.', 'Check the light field and anatomical edges; the model estimates coverage from simplified geometry.');
      break;
    case 'exposure':
      add('technique', 'Illustrative case settings', within(state.kvp, clinicalCase.expected.kvp) && within(state.sid, clinicalCase.expected.sid) && within(metrics.mas, clinicalCase.expected.mas), `${state.kvp} kVp · ${Number.isFinite(metrics.mas) ? metrics.mas.toFixed(2) : '—'} mAs · ${state.sid} cm SID fall within this exercise’s reference ranges.`, 'Compare kVp, mAs and SID with the illustrative training ranges and local protocol; they are not clinical prescriptions.');
      add('detector', 'Receptor ready', state.detectorReady, 'Detector readiness is enabled.', 'Arm the simulated detector before requesting acquisition.');
      add('protection', 'Operator protection', state.shielded, 'Shielded position is indicated by the simulator.', 'Enter the protected operator station and secure its door before acquiring.');
      add('breath', 'Breathing and motion', state.breathHeld, 'Breath-hold state is active in the phantom.', clinicalCase.requested === 'abdomen-ap' ? 'Coordinate a brief expiration hold when the system is ready.' : 'Coordinate a brief full-inspiration hold when the system is ready.');
      break;
    case 'review':
      if (!assessment || assessment.caseId !== clinicalCase.id) {
        add('capture', 'Image review', undefined, '', 'Acquire this fictional case, inspect the radiograph, and explain limitations before disposition.');
      } else {
        add('score', 'Exercise rubric', assessment.criticalFailures.length === 0, `No critical workflow failures recorded; rubric ${assessment.score}/${assessment.total}.`, `Rubric ${assessment.score}/${assessment.total}: ${assessment.criticalFailures[0]} Address workflow concerns before deciding on image use.`);
        const missed = assessment.items.filter(item => item.earned < item.points);
        if (missed.length) missed.slice(0, 3).forEach(item => add(`rubric-${item.id}`, item.label, false, '', item.feedback));
        else add('rubric-complete', 'Exercise checks', true, 'All scored simulator checks passed. Still critique visible anatomy and artifacts.', '');
      }
      break;
  }
  return observations;
}
