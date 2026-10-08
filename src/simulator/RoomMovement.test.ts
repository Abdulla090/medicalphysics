import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from './protocols';
import { getSceneGeometry } from './sceneGeometry';
import { getRoomColliders, moveObserver, OBSERVER_RADIUS, type RoomCollider } from './RoomMovement';

describe('first person room movement', () => {
  it('moves freely by the requested distance without changing direction', () => {
    const destination = moveObserver({ x: 2, z: 2 }, { x: -0.20, z: -0.40 }, []);
    expect(destination.x).toBeCloseTo(1.8, 10);
    expect(destination.z).toBeCloseTo(1.6, 10);
  });

  it('slides along equipment instead of stopping both axes', () => {
    const equipment: RoomCollider[] = [{ kind: 'box', minX: -1, maxX: 1, minZ: -1, maxZ: 1 }];
    const destination = moveObserver({ x: 1.4, z: 0 }, { x: -1, z: 0.40 }, equipment);
    expect(destination.x).toBeGreaterThanOrEqual(1 + OBSERVER_RADIUS - 1e-8);
    expect(destination.z).toBeCloseTo(0.4, 10);
  });

  it('cannot tunnel through thin equipment during a long movement step', () => {
    const equipment: RoomCollider[] = [{ kind: 'box', minX: -1, maxX: 1, minZ: -0.02, maxZ: 0.02 }];
    const destination = moveObserver({ x: 0, z: 1 }, { x: 0, z: -2 }, equipment);
    expect(destination.z).toBeGreaterThanOrEqual(0.02 + OBSERVER_RADIUS - 1e-8);
  });

  it.each([
    { movement: { x: 10, z: 0 }, expected: { x: 3.2, z: 0 } },
    { movement: { x: -10, z: 0 }, expected: { x: -3.2, z: 0 } },
    { movement: { x: 0, z: 10 }, expected: { x: 0, z: 3.05 } },
    { movement: { x: 0, z: -10 }, expected: { x: 0, z: -3.05 } },
  ])('keeps the observer inside the physical room: $expected', ({ movement, expected }) => {
    const destination = moveObserver({ x: 0, z: 0 }, movement, []);
    expect(destination.x).toBeCloseTo(expected.x, 9);
    expect(destination.z).toBeCloseTo(expected.z, 9);
  });

  it('blocks the closed lead barrier and allows passage when opened', () => {
    const start = { x: 2.25, z: -1.20 };
    const displacement = { x: 0, z: -1.15 };
    const closed = moveObserver(start, displacement, getRoomColliders(DEFAULT_STATE, 1.62, true));
    const open = moveObserver(start, displacement, getRoomColliders(DEFAULT_STATE, 1.62, false));
    expect(closed.z).toBeGreaterThanOrEqual(-1.53 - 1e-8);
    expect(open.z).toBeCloseTo(-2.35, 9);
  });

  it('lets an operator walk around the barrier through the left corridor and reach the console', () => {
    const room = getRoomColliders(DEFAULT_STATE, 1.62, true);
    const corridor = moveObserver({ x: 2.13, z: 2.30 }, { x: -0.68, z: 0 }, room);
    const behindBarrier = moveObserver(corridor, { x: 0, z: -4.65 }, room);
    expect(behindBarrier.x).toBeCloseTo(1.45, 8);
    expect(behindBarrier.z).toBeCloseTo(-2.35, 8);
    const consolePosition = moveObserver(behindBarrier, { x: 0.80, z: 0 }, room);
    expect(consolePosition.x).toBeCloseTo(2.25, 8);
    expect(consolePosition.z).toBeCloseTo(-2.35, 8);
    // The safe operator position can be occupied without touching the desk or screen.
    expect(moveObserver(consolePosition, { x: 0, z: 0 }, room)).toEqual(consolePosition);
  });

  it('moves patient collision bounds with patient positioning and body size', () => {
    const state = { ...DEFAULT_STATE, patientOffsetX: -70, patientSize: 1.25 };
    const geometry = getSceneGeometry(state);
    const position = { x: geometry.patientPosition[0], z: geometry.patientPosition[2] + 0.9 };
    const destination = moveObserver(position, { x: 0, z: -0.85 }, getRoomColliders(state, 1.62, false));
    const clearance = Math.hypot(destination.x - geometry.patientPosition[0], destination.z - geometry.patientPosition[2]);
    expect(clearance).toBeGreaterThanOrEqual(0.30 * state.patientSize + OBSERVER_RADIUS - 1e-8);
    expect(destination.z).toBeGreaterThan(position.z - 0.85);
  });

  it('recovers safely when repositioned equipment overlaps a stationary observer', () => {
    const destination = moveObserver({ x: -0.45, z: 0.60 }, { x: 0, z: 0 }, getRoomColliders(DEFAULT_STATE));
    const outsideTable = destination.x <= -0.85 - OBSERVER_RADIUS + 1e-8
      || destination.x >= -0.05 + OBSERVER_RADIUS - 1e-8
      || destination.z <= -0.575 - OBSERVER_RADIUS + 1e-8
      || destination.z >= 1.775 + OBSERVER_RADIUS - 1e-8;
    expect(outsideTable).toBe(true);
    expect(Number.isFinite(destination.x) && Number.isFinite(destination.z)).toBe(true);
  });

  it('recovers from a patient moving exactly onto the observer', () => {
    const patient: RoomCollider[] = [{ kind: 'circle', x: 0.65, z: -1.9, radius: 0.30 }];
    const destination = moveObserver({ x: 0.65, z: -1.9 }, { x: 0, z: 0 }, patient);
    expect(Math.hypot(destination.x - 0.65, destination.z + 1.9)).toBeCloseTo(0.30 + OBSERVER_RADIUS, 10);
  });
});
