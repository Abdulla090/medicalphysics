import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TechniqueGuide } from './TechniqueGuide';
import { CLINICAL_CASES } from './clinicalCases';
import { applyProtocol, DEFAULT_STATE } from './protocols';

describe('optional radiography technique teaching', () => {
  it('stays optional and separates too low, correct exercise range and too high from simulator equipment limits', () => {
    const clinicalCase = CLINICAL_CASES[0]; // PA chest
    const state = { ...DEFAULT_STATE, kvp: 80, ma: 200, exposureMs: 50, sid: 180 }; // 10 mAs
    const result = render(<TechniqueGuide state={state} clinicalCase={clinicalCase}/>);
    expect(screen.queryByText('LIVE EXERCISE FEEDBACK')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Show student technique tips' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(screen.getByText('LIVE EXERCISE FEEDBACK')).toBeTruthy();
    expect(screen.getByText('Too low for this exercise')).toBeTruthy(); // kVp
    expect(screen.getByText('Too high for this exercise')).toBeTruthy(); // mAs
    expect(screen.getByText('Correct exercise range')).toBeTruthy(); // SID
    expect(screen.getByText(/mAs = tube current/)).toBeTruthy();
    expect(screen.getByText('40–150 kVp')).toBeTruthy();
    expect(screen.getByText('25–500 mA × 1–500 ms')).toBeTruthy();
    expect(screen.getByText('80–200 cm')).toBeTruthy();
    expect(screen.getByText(/Simulator equipment limits only describe/)).toBeTruthy();
    result.rerender(<TechniqueGuide state={{...state, kvp: 110, ma: 100, exposureMs: 20, sid: 220}} clinicalCase={clinicalCase} />);
    expect(screen.queryByText('Too low for this exercise')).toBeNull();
    expect(screen.getAllByText('Correct exercise range')).toHaveLength(2);
    expect(screen.getByText('Too high for this exercise')).toBeTruthy(); // SID
    fireEvent.click(screen.getByRole('button', { name: 'Hide student technique tips' }));
    expect(screen.queryByText('LIVE EXERCISE FEEDBACK')).toBeNull();
  });

  it('derives positioning and collimation feedback from the current protocol geometry checks', () => {
    const clinicalCase = CLINICAL_CASES[0];
    const state = {
      ...DEFAULT_STATE,
      patientOffsetX: 5,
      patientRotation: 6,
      tubeAngle: 4,
      collimationWidth: 8,
      collimationHeight: 8,
    };
    const result = render(<TechniqueGuide state={state} clinicalCase={clinicalCase}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Show student technique tips' }));
    expect(screen.getByText('Needs correction')).toBeTruthy();
    expect(screen.getByText('Coverage incomplete')).toBeTruthy();
    expect(screen.getByText(/centering · body rotation · tube alignment/)).toBeTruthy();
    expect(screen.getByText(/Part of the protocol-specific projected reference anatomy/)).toBeTruthy();

    result.rerender(<TechniqueGuide state={DEFAULT_STATE} clinicalCase={clinicalCase}/>);
    expect(screen.getByText('Exercise setup check passed')).toBeTruthy();
    expect(screen.getByText('Requested anatomy covered')).toBeTruthy();
    expect(screen.getByText(/100% envelope/)).toBeTruthy();
  });

  it('flags projection mismatch instead of presenting geometry feedback as case-valid', () => {
    const abdominalCase = CLINICAL_CASES[2];
    render(<TechniqueGuide state={DEFAULT_STATE} clinicalCase={abdominalCase}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Show student technique tips' }));
    expect(screen.getAllByText(/Exercise request: Abdomen AP · Selected setup: Chest PA/)).toHaveLength(2);
    expect(screen.getAllByText(/Match the selected projection to the exercise request/)).toHaveLength(2);
  });

  it('supports Sorani labels and uses the abdominal case instead of chest ranges', () => {
    const clinicalCase = CLINICAL_CASES[2];
    const state = applyProtocol(DEFAULT_STATE, clinicalCase.requested);
    render(<TechniqueGuide state={state} clinicalCase={clinicalCase} language="ku" />);
    fireEvent.click(screen.getByRole('button', { name: /پیشاندانی ئامۆژگاری/ }));
    expect(screen.getAllByText('لە مەودای دروستی ڕاهێنانە')).toHaveLength(3);
    expect(screen.getByText(/70–95/)).toBeTruthy();
    expect(screen.getByText('پشکنینی ڕێکخستنی ڕاهێنان تێپەڕا')).toBeTruthy();
    expect(screen.getByText('ئەناتۆمی داواکراو لە بوارەکەدایە')).toBeTruthy();
  });
});
