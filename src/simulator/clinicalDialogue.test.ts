import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CLINICAL_CASES, type ClinicalCase } from './clinicalCases';
import { ClinicalConversation } from './ClinicalConversation';
import {
  applyClinicalDialogue, createClinicalDialogue, getDialogueOutcome, getDialogueReadiness,
  type ClinicalDialogueSession, type DialogueAction,
} from './clinicalDialogue';

const getCase = (id: ClinicalCase['id']) => CLINICAL_CASES.find(item => item.id === id)!;
const step = (patient: ClinicalCase, state: ClinicalDialogueSession, action: DialogueAction) => applyClinicalDialogue(patient, state, action);
const ask = (patient: ClinicalCase, state: ClinicalDialogueSession, topic: Extract<DialogueAction, { type: 'ask' }>['topic']) => step(patient, state, { type: 'ask', topic });
const respond = (patient: ClinicalCase, state: ClinicalDialogueSession, response: Extract<DialogueAction, { type: 'respond' }>['response']) => step(patient, state, { type: 'respond', response });

function register(patient: ClinicalCase) {
  let conversation = createClinicalDialogue(patient, 'registration');
  for (const topic of ['name', 'identifier', 'reason', 'agreement'] as const) conversation = ask(patient, conversation, topic);
  conversation = step(patient, conversation, { type: 'transcribe', field: 'name', value: patient.name });
  conversation = step(patient, conversation, { type: 'transcribe', field: 'identifier', value: patient.identifier });
  return conversation;
}

function prepare(patient: ClinicalCase) {
  let conversation = createClinicalDialogue(patient, 'preparation');
  for (const topic of ['mobility', 'metals', 'pregnancy', 'explain', 'breathing', 'privacy'] as const) conversation = ask(patient, conversation, topic);
  conversation = respond(patient, conversation, 'remove-metals');
  return conversation;
}

describe('clinical patient interaction engine', () => {
  it('requires both spoken and accurately transcribed identity fields, not passive checkbox acknowledgements', () => {
    const patient = getCase('outpatient-chest');
    let conversation = createClinicalDialogue(patient, 'registration');
    conversation = step(patient, conversation, { type: 'transcribe', field: 'name', value: patient.name });
    expect(conversation.nameVerified).toBe(false);
    conversation = ask(patient, conversation, 'name');
    conversation = ask(patient, conversation, 'identifier');
    conversation = step(patient, conversation, { type: 'transcribe', field: 'name', value: 'Alex' });
    expect(conversation.nameVerified).toBe(false);
    expect(conversation.turns.at(-1)?.message).toMatch(/does not match/i);
    conversation = step(patient, conversation, { type: 'transcribe', field: 'name', value: '  ALEX    MORGAN ' });
    conversation = step(patient, conversation, { type: 'transcribe', field: 'identifier', value: 'edu-0417' });
    expect(conversation.nameVerified && conversation.identifierVerified).toBe(true);
    expect(getDialogueReadiness(patient, conversation).ready).toBe(false);
    conversation = ask(patient, conversation, 'reason');
    conversation = ask(patient, conversation, 'agreement');
    expect(getDialogueReadiness(patient, conversation).ready).toBe(true);
    expect(getDialogueOutcome(patient, conversation)?.preparation.identity).toBe(true);
  });

  it.each(CLINICAL_CASES.map(item => [item.id, item.name]))('completes complete registration for %s (%s)', (id) => {
    const patient = getCase(id as ClinicalCase['id']);
    expect(getDialogueReadiness(patient, register(patient)).ready).toBe(true);
  });

  it('requires referral and the patient agreement even if identifiers were checked', () => {
    const patient = getCase('lateral-followup');
    let state = createClinicalDialogue(patient, 'registration');
    state = ask(patient, state, 'name');
    state = ask(patient, state, 'identifier');
    state = step(patient, state, { type: 'transcribe', field: 'name', value: patient.name });
    state = step(patient, state, { type: 'transcribe', field: 'identifier', value: patient.identifier });
    expect(getDialogueReadiness(patient, state).blockers).toEqual(expect.arrayContaining([expect.stringMatching(/referred/), expect.stringMatching(/agrees/)]));
  });

  it('branches lateral chest to a supported positioning conversation before preparation can finish', () => {
    const patient = getCase('lateral-followup');
    let state = prepare(patient);
    expect(state.turns.some(item => item.message.includes('raising my arms quickly is painful'))).toBe(true);
    expect(getDialogueReadiness(patient, state).blockers.join(' ')).toMatch(/painful shoulder/);
    state = respond(patient, state, 'assist-mobility');
    expect(getDialogueReadiness(patient, state).ready).toBe(true);
    expect(state.turns.at(-1)?.message).toMatch(/stop if I say it hurts/);
  });

  it('requires metal removal, explanatory communication, privacy and breathing practice for the chest patient', () => {
    const patient = getCase('outpatient-chest');
    let state = createClinicalDialogue(patient, 'preparation');
    state = ask(patient, state, 'metals');
    state = respond(patient, state, 'remove-metals');
    expect(getDialogueReadiness(patient, state).preparation.metals).toBe(true);
    expect(getDialogueReadiness(patient, state).ready).toBe(false);
    state = ask(patient, state, 'mobility');
    state = ask(patient, state, 'pregnancy');
    state = ask(patient, state, 'explain');
    state = ask(patient, state, 'breathing');
    expect(getDialogueReadiness(patient, state).blockers).toEqual(['Explain how the patient will change privately.']);
    state = ask(patient, state, 'privacy');
    expect(getDialogueReadiness(patient, state).ready).toBe(true);
  });

  it('enforces an absolute hold on the abdominal case until simulated supervising clinician review is recorded', () => {
    const patient = getCase('abdominal-survey');
    let state = prepare(patient);
    expect(state.pregnancy).toBe('hold');
    expect(getDialogueReadiness(patient, state).safetyHold).toBe(true);
    expect(getDialogueOutcome(patient, state)).toBeNull();
    state = respond(patient, state, 'review-report');
    expect(state.pregnancy).toBe('hold');
    state = respond(patient, state, 'refer-clinician');
    expect(getDialogueReadiness(patient, state).ready).toBe(false);
    state = respond(patient, state, 'review-report');
    expect(state.pregnancy).toBe('reviewed-clear');
    expect(getDialogueReadiness(patient, state).ready).toBe(true);
    expect(getDialogueOutcome(patient, state)?.preparation.screening).toBe(true);
    expect(state.turns.some(turn => turn.speaker === 'clinician')).toBe(true);
  });

  it('low rapport blocks preparation; a respectful response can restore cooperation', () => {
    const patient = getCase('outpatient-chest');
    let state = prepare(patient);
    state = respond(patient, state, 'dismiss-concern');
    expect(state.trust).toBeLessThan(35);
    expect(getDialogueReadiness(patient, state).ready).toBe(false);
    state = respond(patient, state, 'reassure');
    expect(getDialogueReadiness(patient, state).ready).toBe(true);
  });

  it('rejects actions for another patient and prevents reusing a verified case after switching appointments', () => {
    const chest = getCase('outpatient-chest');
    const abdomen = getCase('abdominal-survey');
    const state = register(chest);
    expect(applyClinicalDialogue(abdomen, state, { type: 'ask', topic: 'reason' })).toBe(state);
    expect(getDialogueReadiness(abdomen, state).ready).toBe(false);
    expect(getDialogueOutcome(abdomen, state)).toBeNull();
  });

  it('ignores questions from the wrong phase and never lets a student self-clear an uncertainty', () => {
    const patient = getCase('abdominal-survey');
    const registration = createClinicalDialogue(patient, 'registration');
    expect(ask(patient, registration, 'pregnancy')).toBe(registration);
    const preparation = ask(patient, createClinicalDialogue(patient, 'preparation'), 'pregnancy');
    expect(preparation.pregnancy).toBe('hold');
    expect(respond(patient, preparation, 'review-report')).toBe(preparation);
  });

  it('provides interactive spoken identity questions, text transcription and a gated completion button', () => {
    const patient = getCase('outpatient-chest');
    let completion: ReturnType<typeof getDialogueOutcome> = null;
    render(createElement(ClinicalConversation, {
      clinicalCase: patient, phase: 'registration', onClose: () => {}, onComplete: result => { completion = result; },
    }));
    const finish = screen.getByRole('button', { name: /Complete registration/i });
    expect(finish.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Ask full name/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ask hospital ID/i }));
    fireEvent.change(screen.getByLabelText('Full name stated by patient'), { target: { value: patient.name } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify spoken full name' }));
    fireEvent.change(screen.getByLabelText('Identifier stated by patient'), { target: { value: patient.identifier } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify spoken hospital identifier' }));
    fireEvent.click(screen.getByRole('button', { name: /Discuss referral/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ask for agreement/i }));
    expect(finish.hasAttribute('disabled')).toBe(false);
    fireEvent.click(finish);
    expect(completion).toMatchObject({ caseId: patient.id });
    cleanup();
  });

  it('keeps gown handover disabled in the interactive UI during a pregnancy safety hold', () => {
    const patient = getCase('abdominal-survey');
    let completed = false;
    render(createElement(ClinicalConversation, {
      clinicalCase: patient, phase: 'preparation', onClose: () => {}, onComplete: () => { completed = true; },
      patientArrived: true, doorClosed: false,
    }));
    for (const name of ['Check positioning comfort', 'Ask about artifacts', 'Pregnancy considerations', 'Explain the examination', 'Practice breathing', 'Explain private changing']) {
      fireEvent.click(screen.getByRole('button', { name }));
    }
    fireEvent.click(screen.getByRole('button', { name: /Ask patient to remove relevant metal/i }));
    const finish = screen.getByRole('button', { name: /Hand over gown/i });
    expect(finish.hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('alert').textContent).toMatch(/SAFETY HOLD/);
    fireEvent.click(screen.getByRole('button', { name: /Pause and refer/i }));
    expect(finish.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Receive simulated clinician assessment/i }));
    expect(finish.hasAttribute('disabled')).toBe(false);
    fireEvent.click(finish);
    expect(completed).toBe(true);
    cleanup();
  });
});
