import { describe, expect, it } from 'vitest';
import { GAME_STAGE_ORDER, getGameStage, getWaypointGuide } from './GameJourney';

describe('physical patient journey', () => {
  it('requires registration, gown, escort, manual positioning and exposure in sequence', () => {
    const flags = { registered: false, changed: false, escorted: false, positioned: false, acquired: false };
    expect(getGameStage(flags)).toBe('registration');
    flags.registered = true;
    expect(getGameStage(flags)).toBe('changing');
    flags.changed = true;
    expect(getGameStage(flags)).toBe('escort');
    flags.escorted = true;
    expect(getGameStage(flags)).toBe('position');
    flags.positioned = true;
    expect(getGameStage(flags)).toBe('exposure');
    flags.acquired = true;
    expect(getGameStage(flags)).toBe('review');
    expect(GAME_STAGE_ORDER).toHaveLength(6);
  });

  it('keeps the objective compass connected to the correct physical room', () => {
    expect(getWaypointGuide('registration', { x: 7.37, z: 4.77, yaw: 0 })?.distance).toBeCloseTo(0);
    expect(getWaypointGuide('changing', { x: 7.37, z: 4.77, yaw: 0 })?.distance).toBeGreaterThan(10);
    expect(getWaypointGuide('exposure', { x: 5.05, z: -1.1, yaw: 0 }, true)?.distance).toBeCloseTo(0);
    expect(getWaypointGuide('review', { x: 0, z: 0, yaw: 0 })).toBeNull();
  });
});
