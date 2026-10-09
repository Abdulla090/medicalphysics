import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { assessClinicalAttempt, CLINICAL_CASES, EMPTY_PREPARATION } from './clinicalCases';
import { GAME_STAGE_ORDER } from './GameJourney';
import { applyProtocol, DEFAULT_STATE } from './protocols';
import { ClinicalTeachingPanel } from './ClinicalTeachingPanel';
import { getTeachingLesson, getTeachingObservations, getTeachingQuestions, gradeTeachingAnswers } from './clinicalTeaching';

const allPrepared = { identity: true, request: true, screening: true, metals: true, communication: true };

describe('authored clinical teaching bank', () => {
  it('has two valid, unique questions and meaningful lesson content for every case and stage', () => {
    for (const clinicalCase of CLINICAL_CASES) for (const stage of GAME_STAGE_ORDER) {
      const questions = getTeachingQuestions(clinicalCase.id, stage);
      const lesson = getTeachingLesson(clinicalCase.id, stage);
      expect(questions).toHaveLength(2);
      expect(new Set(questions.map(question => question.id)).size).toBe(2);
      for (const question of questions) {
        expect(question.stage).toBe(stage);
        expect(question.points).toBeGreaterThan(0);
        expect(question.choices.length).toBeGreaterThanOrEqual(3);
        expect(question.choices.filter(option => option.id === question.correctId)).toHaveLength(1);
        expect(question.choices.every(option => option.feedback.length > 25)).toBe(true);
        expect(question.rationale.length).toBeGreaterThan(45);
      }
      expect(lesson.clinicalReasoning.length).toBeGreaterThan(50);
      expect(lesson.practice.length).toBeGreaterThan(30);
      expect(lesson.imageCritique.length).toBeGreaterThan(30);
    }
  });

  it('grades correct answers deterministically without granting credit for missing or unknown selections', () => {
    const questions = getTeachingQuestions('outpatient-chest', 'exposure');
    const correct = Object.fromEntries(questions.map(question => [question.id, question.correctId]));
    expect(gradeTeachingAnswers(questions, correct)).toMatchObject({ earned: 20, total: 20, answered: 2, correct: 2, percent: 100, complete: true });
    const missing = gradeTeachingAnswers(questions, { [questions[0].id]: 'invalid' });
    expect(missing).toMatchObject({ earned: 0, answered: 0, correct: 0, percent: 0, complete: false });
    expect(missing.results[0].feedback).toContain('Choose an answer');
  });

  it('gives targeted feedback on wrong answers and keeps scoring stable when extra keys are present', () => {
    const questions = getTeachingQuestions('abdominal-survey', 'review');
    const incorrect = questions[0].choices.find(choice => choice.id !== questions[0].correctId)!;
    const grade = gradeTeachingAnswers(questions, { [questions[0].id]: incorrect.id, [questions[1].id]: questions[1].correctId, other: 'a' });
    expect(grade).toMatchObject({ earned: 10, total: 20, answered: 2, correct: 1, percent: 50, complete: true });
    expect(grade.results[0].feedback).toContain(incorrect.feedback);
    expect(grade.results[0].feedback).toContain(questions[0].rationale);
    expect(grade.results[1].feedback).toBe(questions[1].rationale);
  });
});

describe('live educator observations', () => {
  it('responds to identity checks and pregnancy-related abdominal preparation without inventing patient history', () => {
    const patient = CLINICAL_CASES[2];
    const state = applyProtocol(DEFAULT_STATE, patient.requested);
    const registration = getTeachingObservations(patient, 'registration', state, EMPTY_PREPARATION, null);
    expect(registration).toHaveLength(2);
    expect(registration.every(item => item.status === 'attention')).toBe(true);
    const changing = getTeachingObservations(patient, 'changing', state, EMPTY_PREPARATION, null);
    expect(changing.find(item => item.id === 'screening')?.detail).toContain('pregnancy');
    expect(changing.find(item => item.id === 'screening')?.detail).toContain('local policy');
    expect(getTeachingObservations(patient, 'changing', state, allPrepared, null).every(item => item.status === 'confirmed')).toBe(true);
  });

  it('connects exercise positioning, projection and technique to the actual settings', () => {
    const patient = CLINICAL_CASES[1];
    const correctlyConfigured = applyProtocol(DEFAULT_STATE, patient.requested);
    const positioning = getTeachingObservations(patient, 'position', correctlyConfigured, allPrepared, null, { hygieneDone: true });
    expect(positioning.every(item => item.status === 'confirmed')).toBe(true);
    const changed = { ...correctlyConfigured, protocol: 'chest-pa' as const, patientRotation: 17, patientOffsetY: 6, arms: 'down' as const };
    const defects = getTeachingObservations(patient, 'position', changed, allPrepared, null, { hygieneDone: false });
    expect(defects.filter(item => item.status === 'attention').map(item => item.id)).toEqual(expect.arrayContaining(['projection', 'alignment', 'hygiene']));
    const exposure = getTeachingObservations(patient, 'exposure', { ...correctlyConfigured, kvp: 65, detectorReady: false, shielded: false, breathHeld: false }, allPrepared, null);
    expect(exposure.filter(item => item.status === 'attention').map(item => item.id)).toEqual(['technique', 'detector', 'protection', 'breath']);
    expect(exposure[0].detail).toContain('not clinical prescriptions');
  });

  it('uses case-matched exercise assessment while always requesting independent image critique', () => {
    const patient = CLINICAL_CASES[0];
    const state = applyProtocol(DEFAULT_STATE, patient.requested);
    const noImage = getTeachingObservations(patient, 'review', state, allPrepared, null);
    expect(noImage[0].status).toBe('guidance');
    const wrongCase = assessClinicalAttempt(CLINICAL_CASES[1], state, allPrepared, true, false);
    expect(getTeachingObservations(patient, 'review', state, allPrepared, wrongCase)[0].status).toBe('guidance');
    const assessment = assessClinicalAttempt(patient, { ...state, patientRotation: 18, shielded: false }, allPrepared, true, false);
    const review = getTeachingObservations(patient, 'review', state, allPrepared, assessment);
    expect(review[0].status).toBe('attention');
    expect(review.some(item => item.id === 'rubric-position')).toBe(true);
  });
});

describe('teaching panel keyboard and scoring behavior', () => {
  const basicProps = {
    open: true,
    onClose: vi.fn(),
    clinicalCase: CLINICAL_CASES[0],
    stage: 'registration' as const,
    state: DEFAULT_STATE,
    preparation: EMPTY_PREPARATION,
    assessment: null,
    guided: true,
  };

  it('renders only while open, focuses its close button and handles Escape', () => {
    const onClose = vi.fn();
    const panel = render(createElement(ClinicalTeachingPanel, { ...basicProps, open: false, onClose }));
    expect(screen.queryByRole('dialog')).toBeNull();
    panel.rerender(createElement(ClinicalTeachingPanel, { ...basicProps, onClose }));
    expect(screen.getByRole('dialog', { name: /Think like a radiographer/ })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close clinical teaching panel' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('prevents early grading, reveals explanations, and emits a score only on submission', () => {
    const onGrade = vi.fn();
    render(createElement(ClinicalTeachingPanel, { ...basicProps, onGrade }));
    const submit = screen.getByRole('button', { name: /Grade this module/ });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    const questions = getTeachingQuestions('outpatient-chest', 'registration');
    fireEvent.click(screen.getByText(questions[0].choices.find(choice => choice.id !== questions[0].correctId)!.label));
    fireEvent.click(screen.getByText(questions[1].choices.find(choice => choice.id === questions[1].correctId)!.label));
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(submit);
    expect(onGrade).toHaveBeenCalledTimes(1);
    expect(onGrade).toHaveBeenCalledWith('registration', expect.objectContaining({ percent: 50, correct: 1, complete: true }));
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('Revisit the decision')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect((screen.getByRole('button', { name: /Grade this module/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
