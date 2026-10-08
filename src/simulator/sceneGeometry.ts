import { getObjectDetectorDistance, getProtocol } from './protocols';
import type { SimulatorState } from './types';

export type Point3 = [number, number, number];

/** Geometry is in metres. The image model uses these same receptor distances. */
export function getSceneGeometry(state: SimulatorState) {
  const protocol = getProtocol(state.protocol);
  const supine = protocol.position === 'supine';
  const sid = state.sid / 100;
  const angle = (state.tubeAngle * Math.PI) / 180;
  const oid = getObjectDetectorDistance(state) / 100;
  const receptorX = supine ? -0.45 : 0.65;
  const target: Point3 = supine
    ? [receptorX, 0.775, 1.32 - protocol.centerY / 100]
    : [receptorX, protocol.centerY / 100, -2.15];
  const source: Point3 = supine
    ? [target[0], target[1] + Math.cos(angle) * sid, target[2] - Math.sin(angle) * sid]
    : [target[0], target[1] + Math.sin(angle) * sid, target[2] + Math.cos(angle) * sid];
  const patientPosition: Point3 = supine
    ? [receptorX + state.patientOffsetX / 100, target[1] + oid, 1.32 - state.patientOffsetY / 100]
    : [receptorX - state.patientOffsetX / 100, state.patientOffsetY / 100, target[2] + oid];
  const patientRotation: Point3 = supine
    ? [-Math.PI / 2, 0, 0]
    : [0, protocol.projection === 'LAT' ? Math.PI / 2 : Math.PI, 0];
  return { protocol, supine, sid, source, target, patientPosition, patientRotation, receptorX };
}
