import { getSceneGeometry } from './sceneGeometry';
import type { SimulatorState } from './types';

export interface GroundPoint { x: number; z: number }
export type RoomCollider =
  | { kind: 'box'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { kind: 'circle'; x: number; z: number; radius: number };

export const OBSERVER_RADIUS = 0.20;
export const WORLD_BOUNDS = { minX: -6.60, maxX: 8.40, minZ: -3.25, maxZ: 12.25 };
export type WorldZone = 'Imaging room' | 'Radiographer control room' | 'Patient changing room' | 'Clinical corridor' | 'Learning gallery' | 'Courtyard';

export function getWorldZone({ x, z }: GroundPoint): WorldZone {
  if (z < 3.25 && x > 3.4) return 'Radiographer control room';
  if (z < 3.25) return 'Imaging room';
  if (z < 6.25 && x < -3.4) return 'Patient changing room';
  if (z < 6.25) return 'Clinical corridor';
  return x < 1 ? 'Learning gallery' : 'Courtyard';
}

/** Exact exponential velocity integration keeps travel equal at different frame rates. */
export function integrateWalking(velocity: GroundPoint, desired: GroundPoint, delta: number, reducedMotion = false) {
  const decay = reducedMotion ? 0 : Math.exp(-18 * delta);
  const integral = reducedMotion ? 0 : (1 - decay) / 18;
  return {
    velocity: { x: desired.x + (velocity.x - desired.x) * decay, z: desired.z + (velocity.z - desired.z) * decay },
    displacement: { x: desired.x * delta + (velocity.x - desired.x) * integral, z: desired.z * delta + (velocity.z - desired.z) * integral },
  };
}

// These exact wall planes and openings are shared with RoomArchitecture / HospitalWorld.
// A 1.6 m doorway joins the imaging room to a continuous, explorable clinical wing.
export const ARCHITECTURE_COLLIDERS: RoomCollider[] = [
  { kind: 'box', minX: -3.40, maxX: 3.40, minZ: -3.25, maxZ: -3.25 },
  { kind: 'box', minX: -3.40, maxX: -3.40, minZ: -3.25, maxZ: 3.25 },
  // Two accessible rooms branch from the corridor: changing to the west,
  // and the shielded control room north of the observation suite.
  { kind: 'box', minX: -3.40, maxX: -3.40, minZ: 3.25, maxZ: 4.24 },
  { kind: 'box', minX: -3.40, maxX: -3.40, minZ: 5.46, maxZ: 10.50 },
  { kind: 'box', minX: -6.60, maxX: -6.60, minZ: 3.25, maxZ: 6.25 },
  { kind: 'box', minX: -6.60, maxX: -3.40, minZ: 3.25, maxZ: 3.25 },
  { kind: 'box', minX: -6.60, maxX: -3.40, minZ: 6.25, maxZ: 6.25 },
  { kind: 'box', minX: 3.40, maxX: 3.40, minZ: -3.25, maxZ: 3.25 },
  { kind: 'box', minX: 3.40, maxX: 6.80, minZ: -3.25, maxZ: -3.25 },
  { kind: 'box', minX: 6.80, maxX: 6.80, minZ: -3.25, maxZ: 3.25 },
  { kind: 'box', minX: -3.40, maxX: 1.30, minZ: 3.25, maxZ: 3.25 },
  { kind: 'box', minX: 2.90, maxX: 4.50, minZ: 3.25, maxZ: 3.25 },
  { kind: 'box', minX: 5.80, maxX: 8.40, minZ: 3.25, maxZ: 3.25 },
  { kind: 'box', minX: 8.40, maxX: 8.40, minZ: 3.25, maxZ: 12.25 },
  { kind: 'box', minX: -3.40, maxX: 1, minZ: 10.50, maxZ: 10.50 },
  { kind: 'box', minX: 1, maxX: 1, minZ: 10.50, maxZ: 12.25 },
  { kind: 'box', minX: 1, maxX: 8.40, minZ: 12.25, maxZ: 12.25 },
  // Learning gallery entrance (x = -2.65 .. -1.15).
  { kind: 'box', minX: -3.40, maxX: -2.65, minZ: 6.25, maxZ: 6.25 },
  { kind: 'box', minX: -1.15, maxX: 4.65, minZ: 6.25, maxZ: 6.25 },
  { kind: 'box', minX: 6.35, maxX: 8.40, minZ: 6.25, maxZ: 6.25 },
  // Gallery-to-garden portal (z = 7.80 .. 9.20).
  { kind: 'box', minX: 1, maxX: 1, minZ: 6.25, maxZ: 7.80 },
  { kind: 'box', minX: 1, maxX: 1, minZ: 9.20, maxZ: 10.50 },
];

const ANNEX_FURNITURE: RoomCollider[] = [
  { kind: 'box', minX: -3.05, maxX: -2.55, minZ: 5.15, maxZ: 6.05 }, // waiting bench, clear of changing-room door
  { kind: 'box', minX: 7.42, maxX: 8.07, minZ: 4.05, maxZ: 5.50 }, // reception desk
  { kind: 'box', minX: -5.30, maxX: -3.80, minZ: 3.42, maxZ: 3.90 }, // gown lockers
  { kind: 'box', minX: -5.4, maxX: -4.55, minZ: 5.52, maxZ: 5.88 }, // changing bench
  { kind: 'box', minX: -6.25, maxX: -5.65, minZ: 5.30, maxZ: 5.95 }, // basin
  { kind: 'box', minX: -6.53, maxX: -5.37, minZ: 4.54, maxZ: 4.60 }, // changing privacy screen
  { kind: 'box', minX: 4.35, maxX: 5.77, minZ: -1.47, maxZ: -0.75 }, // operator console
  { kind: 'box', minX: 5.99, maxX: 6.62, minZ: -2.36, maxZ: -1.88 }, // equipment cabinet
  { kind: 'box', minX: -0.40, maxX: 0.28, minZ: 7.10, maxZ: 8.25 }, // teaching plinth
  { kind: 'box', minX: 3.15, maxX: 6.25, minZ: 9.20, maxZ: 10.60 }, // planted courtyard bed
  { kind: 'box', minX: 2.45, maxX: 2.95, minZ: 8.95, maxZ: 10.85 }, // garden bench
  { kind: 'box', minX: 6.55, maxX: 7.05, minZ: 8.95, maxZ: 10.85 },
];

/** Actual equipment footprints, in metres; observer radius is applied by the resolver. */
export function getRoomColliders(state: SimulatorState, eyeHeight = 1.62, barrierClosed = true, changingDoorClosed = false, patientPrepared = true, registered = true, patientInRoom = true): RoomCollider[] {
  const { supine, source, patientPosition } = getSceneGeometry(state);
  const colliders: RoomCollider[] = [
    ...ANNEX_FURNITURE,
    { kind: 'box', minX: -0.85, maxX: -0.05, minZ: -0.575, maxZ: 1.775 }, // carbon table
    { kind: 'box', minX: -3.40, maxX: -2.48, minZ: -2.91, maxZ: -0.49 }, // clinical counter
    { kind: 'box', minX: 0.29, maxX: 1.01, minZ: -2.54, maxZ: -2.11 }, // wall receptor stand
    { kind: 'box', minX: 2.18, maxX: 2.60, minZ: -3.03, maxZ: -2.68 }, // clinical storage
    { kind: 'circle', x: 2.39, z: -2.85, radius: 0.22 },
  ];
  if (barrierClosed) colliders.push({ kind: 'box', minX: 4.50, maxX: 5.80, minZ: 3.20, maxZ: 3.28 });
  if (changingDoorClosed) colliders.push({ kind: 'box', minX: -3.46, maxX: -3.34, minZ: 4.24, maxZ: 5.46 });
  if (patientPrepared && patientInRoom && !supine) colliders.push({ kind: 'circle', x: patientPosition[0], z: patientPosition[2], radius: (state.arms === 'hips' ? 0.30 : 0.24) * state.patientSize });
  if (!registered) colliders.push({ kind: 'circle', x: 5.4, z: 4.3, radius: 0.18 });
  else if (!patientPrepared) colliders.push({ kind: 'circle', x: -5.51, z: 5.08, radius: 0.19 });
  else if (!patientInRoom) colliders.push({ kind: 'circle', x: -2.54, z: 4.75, radius: 0.19 });
  // A lowered horizontal tube occupies the observer's standing/crouching height.
  if (source[1] < eyeHeight + 0.25 && source[1] + 0.40 > 0.50) {
    colliders.push({ kind: 'circle', x: source[0], z: source[2], radius: 0.29 });
  }
  return colliders;
}

function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(high, value));
}

function keepInsideRoom(point: GroundPoint, radius: number) {
  point.x = clamp(point.x, WORLD_BOUNDS.minX + radius, WORLD_BOUNDS.maxX - radius);
  point.z = clamp(point.z, WORLD_BOUNDS.minZ + radius, WORLD_BOUNDS.maxZ - radius);
}

function resolveCollider(point: GroundPoint, collider: RoomCollider, radius: number) {
  if (collider.kind === 'circle') {
    const dx = point.x - collider.x;
    const dz = point.z - collider.z;
    const clearance = radius + collider.radius;
    const distance = Math.hypot(dx, dz);
    if (distance >= clearance) return;
    if (distance < 0.000001) {
      point.x = collider.x + clearance;
    } else {
      point.x = collider.x + dx / distance * clearance;
      point.z = collider.z + dz / distance * clearance;
    }
    return;
  }
  const closestX = clamp(point.x, collider.minX, collider.maxX);
  const closestZ = clamp(point.z, collider.minZ, collider.maxZ);
  const dx = point.x - closestX;
  const dz = point.z - closestZ;
  const distance = Math.hypot(dx, dz);
  if (distance >= radius) return;
  if (distance > 0.000001) {
    point.x = closestX + dx / distance * radius;
    point.z = closestZ + dz / distance * radius;
    return;
  }
  // Handles a patient/rig moving into a stationary observer without trapping them.
  const faces = [point.x - collider.minX, collider.maxX - point.x, point.z - collider.minZ, collider.maxZ - point.z];
  const closestFace = faces.indexOf(Math.min(...faces));
  if (closestFace === 0) point.x = collider.minX - radius;
  else if (closestFace === 1) point.x = collider.maxX + radius;
  else if (closestFace === 2) point.z = collider.minZ - radius;
  else point.z = collider.maxZ + radius;
}

/** Small swept steps and normal projection let the observer slide around corners. */
export function moveObserver(position: GroundPoint, displacement: GroundPoint, colliders: RoomCollider[], radius = OBSERVER_RADIUS): GroundPoint {
  const point = { ...position };
  const steps = Math.max(1, Math.ceil(Math.hypot(displacement.x, displacement.z) / 0.035));
  for (let step = 0; step < steps; step++) {
    point.x += displacement.x / steps;
    point.z += displacement.z / steps;
    keepInsideRoom(point, radius);
    for (let pass = 0; pass < 3; pass++) {
      for (const wall of ARCHITECTURE_COLLIDERS) resolveCollider(point, wall, radius);
      for (const collider of colliders) resolveCollider(point, collider, radius);
      keepInsideRoom(point, radius);
    }
  }
  return point;
}
