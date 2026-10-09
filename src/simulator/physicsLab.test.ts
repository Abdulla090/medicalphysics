import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from './protocols';
import { observePhysicsExperiment } from './physicsLab';

describe('hands-on physics learning experiments', () => {
  it('predicts the inverse-square fluence direction when source distance changes', () => {
    const observation = observePhysicsExperiment('distance', DEFAULT_STATE, { ...DEFAULT_STATE, sid: DEFAULT_STATE.sid * .8 });
    expect(observation.direction).toBe('increase');
    expect(observation.current).toBeGreaterThan(observation.baseline);
  });
  it('detects changes in modeled focal spot blur', () => {
    const observation = observePhysicsExperiment('sharpness', DEFAULT_STATE, { ...DEFAULT_STATE, focalSpot: 1.2 });
    expect(observation.direction).toBe('increase');
  });
  it('explains field change and warns when anatomy coverage is lost', () => {
    const observation = observePhysicsExperiment('field', DEFAULT_STATE, { ...DEFAULT_STATE, collimationWidth: 8, collimationHeight: 8 });
    expect(observation.direction).toBe('decrease');
    expect(observation.coverageOkay).toBe(false);
  });
});
