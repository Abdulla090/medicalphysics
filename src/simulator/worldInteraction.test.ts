import { describe, expect, it } from 'vitest';
import { applyProtocol, DEFAULT_STATE, PROTOCOLS } from './protocols';
import { getSceneGeometry } from './sceneGeometry';
import { getAimedTarget, getWorldTargets, isOperatorProtected, manipulateTarget, type WorldTarget } from './worldInteraction';

const target = (id: WorldTarget['id'], position: WorldTarget['position'], radius = 0.2, reach = 1.8): WorldTarget => ({ id, label: id, description: id, position, radius, reach });

describe('room crosshair selection', () => {
  it('selects the nearest positive ray intersection independently of target-array order', () => {
    const near = target('tube', [0, 0, -1]), far = target('detector', [0, 0, -1.5]);
    expect(getAimedTarget([0, 0, 0], [0, 0, -1], [far, near])?.id).toBe('tube');
    expect(getAimedTarget([0, 0, 0], [0, 0, -10], [near, far])?.id).toBe('tube');
    expect(getAimedTarget([0, 0, 0], [0, 0, 1], [near, far])).toBeNull();
  });
  it('measures reach to the object surface, rejects angular misses and does not target distant objects', () => {
    const edge = target('tube', [0, 0, -2], 0.3, 1.8);
    expect(getAimedTarget([0, 0, 0], [0, 0, -1], [edge])?.id).toBe('tube');
    expect(getAimedTarget([0, 0, 0], [0.3, 0, -1], [edge])).toBeNull();
    expect(getAimedTarget([0, 0, 0], [0, 0, -1], [{ ...edge, reach: 1.69 }])).toBeNull();
    expect(getAimedTarget([0, 0, 0], [0, 0, -1], [target('tube', [0, 0, -20])])).toBeNull();
  });
  it('handles an observer inside a hotspot, invalid rays and equal-distance ties deterministically', () => {
    expect(getAimedTarget([0, 0, 0], [0, 0, -1], [target('patient', [0, 0, 0])])?.id).toBe('patient');
    expect(getAimedTarget([0, 0, 0], [0, 0, 0], [target('tube', [0, 0, -1])])).toBeNull();
    expect(getAimedTarget([NaN, 0, 0], [0, 0, -1], [])).toBeNull();
    const equal = [target('table', [0, 0, -1]), target('tube', [0, 0, -1])];
    expect(getAimedTarget([0, 0, 0], [0, 0, -1], equal)?.id).toBe('table');
    expect(getAimedTarget([0, 0, 0], [0, 0, -1], equal.reverse())?.id).toBe('table');
  });
  it('prevents operating the console through lead glass and permits reach from inside the protected room', () => {
    const console = getWorldTargets(DEFAULT_STATE).find((item) => item.id === 'console')!;
    const front: [number, number, number] = [3.15, 1.62, -1.1];
    const frontAim: [number, number, number] = [1.9, -0.46, 0];
    expect(getAimedTarget(front, frontAim, [console], true)).toBeNull();
    expect(getAimedTarget(front, frontAim, [console], false)).toBeNull();
    expect(getAimedTarget([5.05, 1.62, 0.15], [0, -0.46, -1.25], [console], true)?.id).toBe('console');
  });
  it('lets a learner reach the two door switches and patient gown station', () => {
    const targets = getWorldTargets(DEFAULT_STATE);
    expect(getAimedTarget([-2.8, 1.62, 4.85], [-0.64, -0.38, 0], targets)?.id).toBe('changing-door');
    expect(getAimedTarget([-4.45, 1.62, 4.63], [-0.6, -0.4, 0], targets)?.id).toBe('changing-booth');
    expect(getAimedTarget([-3.1, 1.62, 4.63], [-1.95, -0.4, 0], targets)?.id).not.toBe('changing-booth');
    expect(getAimedTarget([5.12, 1.62, 4], [0, -0.37, -0.78], targets)?.id).toBe('control-door');
  });
});

describe('apparatus-aware hotspots', () => {
  it('tracks source, detector and body placement across every protocol and moving geometry', () => {
    for (const protocol of PROTOCOLS) {
      const state = { ...applyProtocol(DEFAULT_STATE, protocol.id), sid: 140, tubeAngle: 15, patientOffsetX: 4, patientOffsetY: -3, patientSize: 1.2 };
      const geometry = getSceneGeometry(state), targets = getWorldTargets(state);
      expect(new Set(targets.map((item) => item.id)).size).toBe(targets.length);
      expect(targets.find((item) => item.id === 'tube')!.position).toEqual(geometry.source);
      const detector = targets.find((item) => item.id === 'detector')!.position;
      expect(detector[0]).toBeCloseTo(geometry.target[0] + (geometry.supine ? 0.35 : 0.34), 12);
      expect(detector[1]).toBeCloseTo(geometry.target[1] + (geometry.supine ? 0.05 : -0.1), 12);
      expect(detector[2]).toBeCloseTo(geometry.target[2] + (geometry.supine ? 0 : 0.03), 12);
      const patient = targets.find((item) => item.id === 'patient')!;
      expect(patient.position[0]).toBe(geometry.patientPosition[0]);
      if (geometry.supine) {
        expect(patient.position[1]).toBeCloseTo(geometry.patientPosition[1] + 0.05, 12);
        expect(patient.position[2]).toBeCloseTo(geometry.patientPosition[2] - 0.9, 12);
      } else expect(patient.position[1]).toBeCloseTo(geometry.patientPosition[1] + 1.15, 12);
    }
  });
  it('keeps the supine patient reachable without the table swallowing the same sightline', () => {
    const targets = getWorldTargets(applyProtocol(DEFAULT_STATE, 'abdomen-ap'));
    const patient = targets.find((item) => item.id === 'patient')!;
    const position: [number, number, number] = [patient.position[0] + 0.6, 1.62, patient.position[2]];
    expect(getAimedTarget(position, [-0.6, patient.position[1] - 1.62, 0], targets)?.id).toBe('patient');
  });
  it('offers the separate wall-stand handle from supine protocols without replacing or duplicating the active detector', () => {
    for (const protocol of PROTOCOLS.filter((item) => item.position === 'supine')) {
      const state = applyProtocol(DEFAULT_STATE, protocol.id), targets = getWorldTargets(state);
      const stand = targets.find((item) => item.id === 'stand');
      expect(stand?.position).toEqual([0.99, 1.2, -2.12]);
      expect(targets.filter((item) => item.id === 'detector')).toHaveLength(1);
      expect(targets.find((item) => item.id === 'detector')!.position).not.toEqual(stand!.position);
      expect(getAimedTarget([1.25, 1.62, -1.5], [-0.26, -0.42, -0.62], targets)?.id).toBe('stand');
    }
    expect(getWorldTargets(DEFAULT_STATE).some((item) => item.id === 'stand')).toBe(false);
    expect(getWorldTargets(applyProtocol(DEFAULT_STATE, 'chest-lateral')).some((item) => item.id === 'stand')).toBe(false);
  });
});

describe('interactive physics gallery', () => {
  it('opens each experiment from an actual point in front of its 3D exhibition board', () => {
    const targets = getWorldTargets(DEFAULT_STATE);
    expect(getAimedTarget([-1.2, 1.62, 9.20], [0, 0.11, 1.25], targets)?.id).toBe('physics-distance');
    expect(getAimedTarget([-2.1, 1.62, 8.30], [-1.27, 0.13, 0], targets)?.id).toBe('physics-sharpness');
    expect(getAimedTarget([3.5, 1.62, 11.0], [0, 0.11, 1.2], targets)?.id).toBe('physics-field');
  });
});

describe('direct apparatus manipulation', () => {
  it('changes actual tube and patient state immutably with supported console limits', () => {
    const before = { ...DEFAULT_STATE };
    const tube = manipulateTarget(before, 'tube', -240, 50);
    expect(tube.sid).toBe(120); expect(tube.tubeAngle).toBe(-9);
    expect(before).toEqual(DEFAULT_STATE);
    const positioned = manipulateTarget(before, 'patient', 50, -25);
    expect(positioned.patientOffsetX).toBe(6); expect(positioned.patientOffsetY).toBe(3);
    expect(manipulateTarget(before, 'table', 50, -25)).toBe(before);
    const supine = applyProtocol(before, 'abdomen-ap');
    expect(manipulateTarget(supine, 'table', 50, -25)).toEqual(manipulateTarget(supine, 'patient', 50, -25));
    expect(manipulateTarget(before, 'patient', 100, 40, 'rotate').patientRotation).toBe(18);
    expect(manipulateTarget(before, 'tube', 1000, -1000).sid).toBe(200);
    expect(manipulateTarget(before, 'tube', -1000, 1000).sid).toBe(80);
    expect(manipulateTarget(before, 'tube', 1000, -1000).tubeAngle).toBe(30);
    expect(manipulateTarget(before, 'tube', -1000, 1000).tubeAngle).toBe(-30);
    expect(manipulateTarget(before, 'patient', 1000, -1000)).toMatchObject({ patientOffsetX: 15, patientOffsetY: 15 });
    expect(manipulateTarget(before, 'patient', -1000, 0, 'rotate').patientRotation).toBe(-45);
  });
  it('does not toggle operator protection, detector readiness or other settings as a drag side effect', () => {
    for (const id of ['console', 'barrier', 'detector', 'stand', 'changing-door', 'changing-booth', 'control-door'] as const) expect(manipulateTarget(DEFAULT_STATE, id, 1, 1)).toBe(DEFAULT_STATE);
    expect(manipulateTarget(DEFAULT_STATE, 'patient', NaN, 0)).toBe(DEFAULT_STATE);
    expect(manipulateTarget(DEFAULT_STATE, 'tube', 0, 0)).toBe(DEFAULT_STATE);
    expect(manipulateTarget(DEFAULT_STATE, 'patient', 0.2, 0.1)).toMatchObject({ shielded: DEFAULT_STATE.shielded, detectorReady: DEFAULT_STATE.detectorReady, kvp: DEFAULT_STATE.kvp });
  });
});

describe('spatial operator protection', () => {
  it('requires an observer in the separate control room with its lead door closed', () => {
    expect(isOperatorProtected([5.05, 1.62, -1.1], true)).toBe(true);
    expect(isOperatorProtected([5.05, 1.62, -1.1], false)).toBe(false);
    expect(isOperatorProtected([2.25, 1.62, -2.65], true)).toBe(false);
    expect(isOperatorProtected([-5.1, 1.62, 4.6], true)).toBe(false);
    expect(isOperatorProtected([100, 1.62, -100], true)).toBe(false);
    expect(isOperatorProtected([6.6, 1.62, -2.95], true)).toBe(true);
    expect(isOperatorProtected([6.70, 1.62, -2.95], true)).toBe(false);
    expect(isOperatorProtected([6.0, 1.62, -3.06], true)).toBe(false);
    expect(isOperatorProtected([5.1, NaN, -2.4], true)).toBe(false);
    expect(isOperatorProtected([3.65, 1.62, -2.4], true)).toBe(false);
    expect(isOperatorProtected([5.05, 1.62, 3.02], true)).toBe(false);
  });
});
