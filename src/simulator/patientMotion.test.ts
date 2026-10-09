import { describe, expect, it } from 'vitest';
import { advancePatientRoute, samplePatientPose } from './patientMotion';

describe('patient navigation independent of graphics frame rate', () => {
  it('travels precisely the same path with different frame intervals', () => {
    const traverse = (frames: number) => {
      let point: [number, number] = [0, 0];
      const path: Array<[number, number]> = [[2, 0], [2, 2], [3, 2]];
      for (let i = 0; i < frames; i++) point = advancePatientRoute(point, path, 5 / frames);
      return { point, path };
    };
    expect(traverse(100)).toEqual(traverse(1));
    expect(traverse(1).point).toEqual([3, 2]);
  });
  it('does not cut corners when a slow frame crosses several doorway waypoints', () => {
    const path: Array<[number, number]> = [[1, 0], [1, 2]];
    const result = advancePatientRoute([0, 0], path, 2);
    expect(result).toEqual([1, 1]);
    expect(path).toEqual([[1, 2]]);
  });
  it('gives opposite thighs alternating stride and allows a settled stationary pose', () => {
    const stride = samplePatientPose(Math.PI / (2 * 7.4), true);
    expect(stride.thigh[0]).toBeCloseTo(-stride.thigh[1], 5);
    expect(stride.knee[0]).toBeGreaterThanOrEqual(0);
    expect(stride.knee[1]).toBeGreaterThanOrEqual(0);
    const idle = samplePatientPose(3.5, false);
    expect(idle.thigh).toEqual([0, -0]);
    expect(idle.knee).toEqual([0, 0]);
    expect(idle.stepLift).toBe(0);
    expect(Math.abs(idle.headTurn)).toBeLessThan(0.1);
  });
  it('limits range of movement for a patient with shoulder discomfort', () => {
    const plain = samplePatientPose(0.37, true);
    const guarded = samplePatientPose(0.37, true, 1);
    expect(Math.abs(guarded.shoulder[0])).toBeLessThan(Math.abs(plain.shoulder[0]));
    expect(Number.isFinite(samplePatientPose(Number.NaN, true).headTurn)).toBe(true);
  });
});
