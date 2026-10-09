import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from './protocols';
import { getSceneGeometry } from './sceneGeometry';
import { getRoomColliders, getWorldZone, integrateWalking, moveObserver, OBSERVER_RADIUS, type RoomCollider } from './RoomMovement';

describe('first person room movement', () => {
  it('travels the same distance at 30 and 120 fps with smooth acceleration and release', () => {
    const travel = (fps: number) => {
      let velocity = { x: 0, z: 0 }, distance = 0;
      for (let frame = 0; frame < fps * 2; frame++) {
        const step = integrateWalking(velocity, { x: frame < fps ? 1.7 : 0, z: 0 }, 1 / fps);
        velocity = step.velocity;
        distance += step.displacement.x;
      }
      return { distance, velocity };
    };
    expect(travel(30).distance).toBeCloseTo(travel(120).distance, 10);
    expect(travel(30).distance).toBeCloseTo(1.7, 6);
    expect(travel(30).velocity.x).toBeLessThan(0.00001);
  });

  it('removes acceleration drift when reduced motion is preferred', () => {
    expect(integrateWalking({ x: 1, z: 0 }, { x: 0, z: 0 }, 0.1, true)).toEqual({ velocity: { x: 0, z: 0 }, displacement: { x: 0, z: 0 } });
  });
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

  it('blocks entry across the lead control-room door until it is opened', () => {
    const start = { x: 5.12, z: 4.05 };
    const closed = moveObserver(start, { x: 0, z: -1.8 }, getRoomColliders(DEFAULT_STATE, 1.62, true));
    const open = moveObserver(start, { x: 0, z: -1.8 }, getRoomColliders(DEFAULT_STATE, 1.62, false));
    expect(closed.z).toBeGreaterThanOrEqual(3.45 - 1e-8);
    expect(open.z).toBeCloseTo(2.25, 8);
    expect(getWorldZone(open)).toBe('Radiographer control room');
  });

  it('enters the control room from the corridor and reaches the protected console', () => {
    const room = getRoomColliders(DEFAULT_STATE, 1.62, false);
    const start = { x: 5.12, z: 4.05 };
    const inside = moveObserver(start, { x: 0, z: -2.2 }, room);
    expect(inside.z).toBeCloseTo(1.85, 8);
    const console = moveObserver(inside, { x: 0, z: -2.2 }, room);
    expect(console.z).toBeGreaterThan(-0.55);
    expect(console.z).toBeLessThan(-0.2);
    expect(moveObserver(console, { x: 0, z: 0 }, room)).toEqual(console);
  });

  it('requires the changing-room privacy door to open for a patient-preparation visit', () => {
    const start = { x: -2.45, z: 4.85 };
    const closed = moveObserver(start, { x: -2.0, z: 0 }, getRoomColliders(DEFAULT_STATE, 1.62, false, true));
    const open = moveObserver(start, { x: -2.0, z: 0 }, getRoomColliders(DEFAULT_STATE, 1.62, false, false));
    expect(closed.x).toBeGreaterThanOrEqual(-3.14 - 1e-8);
    expect(open.x).toBeCloseTo(-4.45, 8);
    expect(getWorldZone(open)).toBe('Patient changing room');
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

  it('walks through the real imaging-room doorway and returns without teleporting', () => {
    const room = getRoomColliders(DEFAULT_STATE);
    const corridor = moveObserver({ x: 2.1, z: 2.3 }, { x: 0, z: 2.5 }, room);
    expect(corridor).toEqual({ x: 2.1, z: expect.closeTo(4.8, 8) });
    expect(getWorldZone(corridor)).toBe('Clinical corridor');
    const back = moveObserver(corridor, { x: 0, z: -2.5 }, room);
    expect(back.z).toBeCloseTo(2.3, 8);
    expect(getWorldZone(back)).toBe('Imaging room');
  });

  it('connects the corridor, learning gallery and courtyard through their openings', () => {
    const room = getRoomColliders(DEFAULT_STATE);
    let point = { x: 2.1, z: 4.8 };
    point = moveObserver(point, { x: -4, z: 0 }, room);
    point = moveObserver(point, { x: 0, z: 3.7 }, room);
    expect(point.x).toBeCloseTo(-1.9, 8);
    expect(point.z).toBeCloseTo(8.5, 8);
    expect(getWorldZone(point)).toBe('Learning gallery');
    point = moveObserver(point, { x: 3.4, z: 0 }, room);
    expect(point.x).toBeCloseTo(1.5, 8);
    expect(getWorldZone(point)).toBe('Courtyard');
  });

  it('prevents tunnelling through gallery glazing and the garden planter', () => {
    const room = getRoomColliders(DEFAULT_STATE);
    const glass = moveObserver({ x: 2.1, z: 4.8 }, { x: 0, z: 6 }, room);
    expect(glass.z).toBeCloseTo(6.05, 8);
    const planter = moveObserver({ x: 5.5, z: 7 }, { x: 0, z: 6 }, room);
    expect(planter.z).toBeCloseTo(9, 8);
    const boundary = moveObserver({ x: 7.8, z: 7 }, { x: 0, z: 10 }, room);
    expect(boundary.z).toBeCloseTo(12.05, 8);
  });
});
