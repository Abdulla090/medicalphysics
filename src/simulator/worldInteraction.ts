import { getSceneGeometry, type Point3 } from './sceneGeometry';
import type { SimulatorState } from './types';

export type WorldTargetId = 'tube' | 'patient' | 'detector' | 'table' | 'console' | 'barrier' | 'stand';
export interface WorldTarget {
  id: WorldTargetId;
  label: string;
  description: string;
  /** Room-space metres, matching the displayed apparatus. */
  position: Point3;
  /** Analytic selection sphere; this is not a collision or shielding volume. */
  radius: number;
  /** Maximum camera-to-target-surface interaction distance in metres. */
  reach: number;
}
export type ManipulationMode = 'move' | 'rotate';

/** Room walls minus the 20 cm observer margin, on the closed-barrier side. */
export function isOperatorProtected(position: Point3, barrierClosed: boolean): boolean {
  if (!barrierClosed || !position.every(Number.isFinite)) return false;
  const [x, y, z] = position;
  return x > 1.65 && x <= 3.2 && y >= 0 && y <= 3.45 && z < -1.94 && z >= -3.05;
}

export function getWorldTargets(state: SimulatorState): WorldTarget[] {
  const { source, target, patientPosition, supine } = getSceneGeometry(state);
  const patient: Point3 = supine
    ? [patientPosition[0], patientPosition[1] + 0.05, patientPosition[2] - 0.9]
    : [patientPosition[0], patientPosition[1] + 1.15, patientPosition[2]];
  const detectorHandle: Point3 = supine
    ? [target[0] + 0.35, target[1] + 0.05, target[2]]
    : [target[0] + 0.34, target[1] - 0.1, target[2] + 0.03];
  return [
    { id: 'tube', label: 'X-ray tube', description: 'Adjust source distance and tube angulation.', position: source, radius: 0.4, reach: 1.8 },
    { id: 'patient', label: 'Patient', description: 'Position the patient or rotate the projection.', position: patient, radius: 0.38, reach: 1.8 },
    { id: 'detector', label: 'Digital detector', description: 'Inspect the receptor and arm it for acquisition.', position: detectorHandle, radius: 0.13, reach: 1.8 },
    // A local tabletop hotspot avoids a room-sized selection sphere swallowing the patient.
    { id: 'table', label: 'Radiography table', description: 'Move the patient along the floating tabletop.', position: [-0.45, 0.8, 0.4], radius: 0.32, reach: 1.8 },
    { id: 'console', label: 'Acquisition console', description: 'Set exposure technique, prepare and acquire.', position: [2.25, 1.05, -2.65], radius: 0.28, reach: 1.8 },
    { id: 'barrier', label: 'Protective barrier switch', description: 'Operate the barrier and move behind it before acquisition.', position: [1.65, 1.3, -1.75], radius: 0.16, reach: 1.8 },
    ...(supine ? [{ id: 'stand' as const, label: 'Wall stand', description: 'Position the patient at the standing receptor.', position: [0.99, 1.2, -2.12] as Point3, radius: 0.13, reach: 1.8 }] : []),
  ];
}

/**
 * Crosshair picking against analytic target spheres, with closed-barrier occlusion.
 * Other scene-mesh occlusion is the caller's responsibility. Direction need not be unit.
 */
export function getAimedTarget(cameraPosition: Point3, direction: Point3, targets: WorldTarget[], barrierClosed = false): WorldTarget | null {
  if (!cameraPosition.every(Number.isFinite) || !direction.every(Number.isFinite)) return null;
  const magnitude = Math.hypot(...direction);
  if (magnitude === 0) return null;
  const unit: Point3 = [direction[0] / magnitude, direction[1] / magnitude, direction[2] / magnitude];
  let nearest: WorldTarget | null = null, nearestDistance = Infinity;
  for (const target of targets) {
    if (!target.position.every(Number.isFinite) || !Number.isFinite(target.radius) || !Number.isFinite(target.reach) || target.radius <= 0 || target.reach < 0) continue;
    const delta: Point3 = [target.position[0] - cameraPosition[0], target.position[1] - cameraPosition[1], target.position[2] - cameraPosition[2]];
    const along = delta[0] * unit[0] + delta[1] * unit[1] + delta[2] * unit[2];
    const discriminant = along * along - (delta[0] ** 2 + delta[1] ** 2 + delta[2] ** 2 - target.radius ** 2);
    if (discriminant < 0) continue;
    const halfChord = Math.sqrt(discriminant);
    if (along + halfChord < 0) continue;
    const distance = Math.max(0, along - halfChord);
    if (distance > target.reach) continue;
    if (barrierClosed && target.id !== 'barrier' && Math.abs(unit[2]) > 1e-12) {
      const barrierDistance = (-1.75 - cameraPosition[2]) / unit[2];
      // Test the actual camera ray only up to the selected sphere's near surface.
      // A center-to-center test would incorrectly block rays around the side edge.
      if (barrierDistance > 1e-9 && barrierDistance < distance - 1e-9) {
        const x = cameraPosition[0] + unit[0] * barrierDistance;
        const y = cameraPosition[1] + unit[1] * barrierDistance;
        if (x >= 1.75 && x <= 2.95 && y >= 0 && y <= 2.17) continue;
      }
    }
    if (distance < nearestDistance - 1e-9 || Math.abs(distance - nearestDistance) <= 1e-9 && (!nearest || target.id.localeCompare(nearest.id) < 0)) {
      nearest = target;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/** dx/dy are raw pointer pixels relative to the passed drag-start state. */
export function manipulateTarget(state: SimulatorState, id: WorldTargetId, dx: number, dy: number, mode: ManipulationMode = 'move'): SimulatorState {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || dx === 0 && dy === 0) return state;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  if (id === 'tube') {
    if (mode === 'rotate') return { ...state, tubeAngle: clamp(state.tubeAngle + dx * 0.18 - dy * 0.18, -30, 30) };
    return { ...state, sid: clamp(state.sid + dx * 0.25, 80, 200), tubeAngle: clamp(state.tubeAngle - dy * 0.18, -30, 30) };
  }
  if (id === 'patient' || id === 'table') {
    if (id === 'table' && !getSceneGeometry(state).supine) return state;
    if (mode === 'rotate') return { ...state, patientRotation: clamp(state.patientRotation + dx * 0.18, -45, 45) };
    return { ...state, patientOffsetX: clamp(state.patientOffsetX + dx * 0.12, -15, 15), patientOffsetY: clamp(state.patientOffsetY - dy * 0.12, -15, 15) };
  }
  // Console, barrier, detector and stand require explicit caller actions, never drag side effects.
  return state;
}
