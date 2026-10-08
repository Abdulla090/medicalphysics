import { getSceneGeometry } from './sceneGeometry';
import type { SimulatorState } from './types';

export interface GroundPoint { x: number; z: number }
export type RoomCollider =
  | { kind: 'box'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { kind: 'circle'; x: number; z: number; radius: number };

export const OBSERVER_RADIUS = 0.20;
const ROOM_BOUNDS = { minX: -3.40, maxX: 3.40, minZ: -3.25, maxZ: 3.25 };

/** Actual equipment footprints, in metres; observer radius is applied by the resolver. */
export function getRoomColliders(state: SimulatorState, eyeHeight = 1.62, barrierClosed = true): RoomCollider[] {
  const { supine, source, patientPosition } = getSceneGeometry(state);
  const colliders: RoomCollider[] = [
    { kind: 'box', minX: -0.85, maxX: -0.05, minZ: -0.575, maxZ: 1.775 }, // carbon table
    { kind: 'box', minX: -3.40, maxX: -2.48, minZ: -2.91, maxZ: -0.49 }, // clinical counter
    { kind: 'box', minX: 0.29, maxX: 1.01, minZ: -2.54, maxZ: -2.11 }, // wall receptor stand
    { kind: 'box', minX: 1.55, maxX: 2.95, minZ: -3.02, maxZ: -2.62 }, // exposure console
    { kind: 'circle', x: 2.39, z: -2.85, radius: 0.22 },
  ];
  if (barrierClosed) colliders.push({ kind: 'box', minX: 1.75, maxX: 2.95, minZ: -1.77, maxZ: -1.73 });
  if (!supine) colliders.push({ kind: 'circle', x: patientPosition[0], z: patientPosition[2], radius: (state.arms === 'hips' ? 0.30 : 0.24) * state.patientSize });
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
  point.x = clamp(point.x, ROOM_BOUNDS.minX + radius, ROOM_BOUNDS.maxX - radius);
  point.z = clamp(point.z, ROOM_BOUNDS.minZ + radius, ROOM_BOUNDS.maxZ - radius);
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
      for (const collider of colliders) resolveCollider(point, collider, radius);
      keepInsideRoom(point, radius);
    }
  }
  return point;
}
