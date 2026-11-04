import { describe, expect, it } from 'vitest';
import { advancePendulum, derivedResult, groupedReadings, linearFit, pendulumPeriod, readingsCSV, STANDARD_GRAVITY, stepLoadedSpring, validReading, type Reading } from './physics';

const reading = (overrides: Partial<Reading> = {}): Reading => ({ id: 'reading-1', source: 'bench', x: 1, elapsed: 20, cycles: 10, y: 4, createdAt: '2026-11-04T10:00:00Z', ...overrides });

describe('loaded spring response', () => {
  it('keeps an equilibrium load stationary', () => {
    const state = { extension: 0.1 * STANDARD_GRAVITY / 20, velocity: 0 };
    expect(stepLoadedSpring(state, 0.1, 0.1, 20)).toEqual(state);
  });
  it('dissipates transient energy and settles at mg/k', () => {
    const target = 0.3 * STANDARD_GRAVITY / 20;
    let state = { extension: 0.1 * STANDARD_GRAVITY / 20, velocity: 0 };
    let lastEnergy = 0.5 * 20 * (state.extension - target) ** 2;
    for (let i = 0; i < 600; i++) {
      state = stepLoadedSpring(state, 1 / 120, 0.3, 20);
      const energy = 0.5 * 0.3 * state.velocity ** 2 + 0.5 * 20 * (state.extension - target) ** 2;
      expect(energy).toBeLessThanOrEqual(lastEnergy + 1e-12);
      lastEnergy = energy;
    }
    expect(state.extension).toBeCloseTo(target, 6);
    expect(state.velocity).toBeCloseTo(0, 5);
  });
  it('preserves velocity when a changing load interrupts the response', () => {
    const moving = stepLoadedSpring({ extension: 0.02, velocity: 0 }, 0.08, 0.4, 20);
    const interrupted = stepLoadedSpring(moving, 0, 0.2, 20);
    expect(interrupted.extension).toBeCloseTo(moving.extension, 12);
    expect(interrupted.velocity).toBeCloseTo(moving.velocity, 12);
  });
});

describe('pendulum model', () => {
  it('agrees with the small-amplitude limit and known nonlinear period', () => {
    expect(pendulumPeriod(1, STANDARD_GRAVITY)).toBeCloseTo(2 * Math.PI / Math.sqrt(STANDARD_GRAVITY), 12);
    expect(pendulumPeriod(1, STANDARD_GRAVITY, 90) / pendulumPeriod(1, STANDARD_GRAVITY)).toBeCloseTo(1.180340599, 8);
    expect(pendulumPeriod(1, STANDARD_GRAVITY, 45)).toBeGreaterThan(pendulumPeriod(1, STANDARD_GRAVITY, 8));
  });
  it('rejects degenerate physical parameters', () => {
    for (const args of [[0, 9.8, 0], [1, 0, 0], [-1, 9.8, 0], [1, 9.8, 180], [Infinity, 9.8, 0], [1, 9.8, NaN]]) {
      expect(pendulumPeriod(...args as [number, number, number])).toBeNaN();
    }
  });
  it('RK4 preserves energy and returns after the elliptic-integral period', () => {
    const angle = Math.PI / 4;
    const period = pendulumPeriod(0.8, STANDARD_GRAVITY, 45);
    const steps = 4000;
    let state = { theta: angle, omega: 0, time: 0 };
    const initialEnergy = STANDARD_GRAVITY * 0.8 * (1 - Math.cos(angle));
    for (let i = 0; i < steps; i++) state = advancePendulum(state, period / steps, 0.8);
    expect(state.theta).toBeCloseTo(angle, 9);
    expect(state.omega).toBeCloseTo(0, 9);
    const energy = 0.5 * (0.8 * state.omega) ** 2 + STANDARD_GRAVITY * 0.8 * (1 - Math.cos(state.theta));
    expect(energy).toBeCloseTo(initialEnergy, 9);
  });
  it('counts complete positive turning-point returns at the expected elapsed time', () => {
    let state = { theta: 8 * Math.PI / 180, omega: 0, time: 0 };
    let count = 0; let measured = 0;
    while (count < 5 && state.time < 20) {
      const previous = state;
      state = advancePendulum(state, 1 / 240, 0.8);
      if (previous.omega > 0 && state.omega <= 0 && state.theta > 0) {
        count++; measured = previous.time + 1 / 240 * previous.omega / (previous.omega - state.omega);
      }
    }
    expect(count).toBe(5);
    expect(measured).toBeCloseTo(5 * pendulumPeriod(0.8, STANDARD_GRAVITY, 8), 6);
  });
});

describe('lab analysis', () => {
  it('fits a free intercept, slope, and residual uncertainty', () => {
    const fit = linearFit([{ x: 1, y: 3.1 }, { x: 2, y: 5 }, { x: 3, y: 7.1 }, { x: 4, y: 8.8 }])!;
    expect(fit.slope).toBeCloseTo(1.92, 10);
    expect(fit.intercept).toBeCloseTo(1.2, 10);
    expect(fit.rSquared).toBeGreaterThan(0.998);
    expect(fit.slopeUncertainty).toBeGreaterThan(0);
  });
  it('does not fit repeated identical lengths or fabricate uncertainty from two points', () => {
    expect(linearFit([{ x: 1, y: 2 }, { x: 1, y: 3 }])).toBeNull();
    expect(linearFit([{ x: 1, y: 2 }, { x: 2, y: 4 }])?.slopeUncertainty).toBeNull();
    expect(linearFit([])).toBeNull();
  });
  it('averages periods before squaring and propagates repeat SEM', () => {
    const points = groupedReadings([reading({ elapsed: 18 }), reading({ elapsed: 22 })], 'simple-pendulum');
    expect(points).toHaveLength(1);
    expect(points[0].mean).toBe(2);
    expect(points[0].y).toBe(4);
    expect(points[0].uncertainty).toBeCloseTo(0.8, 12);
    expect(points[0].repeats).toBe(2);
  });
  it('recovers gravity from small-angle timing data', () => {
    const data = [0.3, 0.5, 0.8, 1, 1.3].map(x => reading({ x, elapsed: 10 * pendulumPeriod(x, STANDARD_GRAVITY) }));
    const fit = linearFit(groupedReadings(data, 'simple-pendulum'));
    expect(derivedResult('simple-pendulum', fit)?.value).toBeCloseTo(STANDARD_GRAVITY, 10);
  });
  it('derives stiffness and resistance using SI units, rejecting negative slopes', () => {
    const fit = linearFit([{ x: 0.01, y: 0.2 }, { x: 0.02, y: 0.4 }, { x: 0.03, y: 0.6 }]);
    expect(derivedResult('hookes-law', fit)?.value).toBeCloseTo(20, 10);
    expect(derivedResult('ohms-law', fit)?.value).toBeCloseTo(20, 10);
    expect(derivedResult('simple-pendulum', { ...fit!, slope: -1 })).toBeNull();
  });
  it('validates persisted readings and rejects non-finite, negative, and malformed values', () => {
    expect(validReading(reading())).toBe(true);
    for (const bad of [null, {}, reading({ x: NaN }), reading({ elapsed: 0 }), reading({ cycles: 1.5 }), reading({ cycles: 0 }), reading({ y: Infinity }), reading({ angle: 180 })]) expect(validReading(bad)).toBe(false);
  });
  it('exports full precision with units and source labels', () => {
    const csv = readingsCSV('simple-pendulum', [reading({ elapsed: 20.1234567 })]);
    expect(csv).toContain('"length_m"'); expect(csv).toContain('"bench"'); expect(csv).toContain('"20.1234567"');
    expect(csv.split('\r\n')).toHaveLength(2);
    expect(readingsCSV('ohms-law', [reading()])).toContain('"current_A","voltage_V"');
  });
});
