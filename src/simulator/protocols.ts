import type { Protocol, ProtocolId, SimulatorState } from './types';

export const PROTOCOLS: Protocol[] = [
  {
    id: 'chest-pa', name: 'Chest PA', projection: 'PA', region: 'chest', position: 'erect', centerY: 126,
    description: 'Erect posteroanterior chest',
    positioning: ['Face the wall detector; keep the midsagittal plane centered.', 'Roll shoulders forward and lift the chin clear of the chest.', 'Center to the mid-thorax and include both apices and costophrenic angles.', 'Suspend respiration after a full inspiration.'],
    defaults: { kvp: 110, ma: 200, exposureMs: 10, sid: 180, collimationWidth: 35, collimationHeight: 43, arms: 'hips', grid: true },
  },
  {
    id: 'chest-ap', name: 'Chest AP', projection: 'AP', region: 'chest', position: 'supine', centerY: 126,
    description: 'Supine anteroposterior chest',
    positioning: ['Position supine with the detector beneath the thorax.', 'Keep the torso straight and the chin above the field.', 'Center to the mid-thorax; include apices and lung bases.', 'Suspend respiration when the patient is able.'],
    defaults: { kvp: 90, ma: 200, exposureMs: 16, sid: 110, collimationWidth: 35, collimationHeight: 43, arms: 'down', grid: true },
  },
  {
    id: 'chest-lateral', name: 'Chest lateral', projection: 'LAT', region: 'chest', position: 'erect', centerY: 126,
    description: 'Erect left lateral chest',
    positioning: ['Place the left side against the wall detector.', 'Raise both arms clear of the thorax.', 'Keep shoulders and hips in a true lateral position.', 'Suspend respiration after a full inspiration.'],
    defaults: { kvp: 120, ma: 200, exposureMs: 32, sid: 180, collimationWidth: 30, collimationHeight: 43, arms: 'raised', grid: true },
  },
  {
    id: 'abdomen-ap', name: 'Abdomen AP', projection: 'AP', region: 'abdomen', position: 'supine', centerY: 95,
    description: 'Supine anteroposterior abdomen',
    positioning: ['Position supine on the radiolucent table.', 'Align the midsagittal plane with the detector center.', 'Center near the iliac crests; adapt coverage to the clinical request.', 'Suspend respiration on expiration.'],
    defaults: { kvp: 80, ma: 200, exposureMs: 100, sid: 100, collimationWidth: 35, collimationHeight: 43, arms: 'down', grid: true },
  },
  {
    id: 'pelvis-ap', name: 'Pelvis AP', projection: 'AP', region: 'pelvis', position: 'supine', centerY: 79,
    description: 'Supine anteroposterior pelvis',
    positioning: ['Position supine with the pelvis centered.', 'Check equal distance of each anterior iliac spine from the table.', 'Include the entire pelvis and proximal femora.', 'Adapt leg rotation to the indication; never rotate a suspected fracture.'],
    defaults: { kvp: 80, ma: 200, exposureMs: 80, sid: 100, collimationWidth: 35, collimationHeight: 35, arms: 'down', grid: true },
  },
];

export const DEFAULT_STATE: SimulatorState = {
  protocol: 'chest-pa', kvp: 110, ma: 200, exposureMs: 10, sid: 180, tubeAngle: 0,
  collimationWidth: 35, collimationHeight: 43, patientRotation: 0, patientOffsetX: 0,
  patientOffsetY: 0, patientSize: 1, arms: 'hips', breathHeld: true, grid: true,
  focalSpot: 0.6, anatomy: 'surface', lightField: true, showLabels: true,
  shielded: true, detectorReady: true,
};

export function getProtocol(id: ProtocolId): Protocol {
  return PROTOCOLS.find((protocol) => protocol.id === id) ?? PROTOCOLS[0];
}

/** Reference body midplane. The anterior/side surface rests near the receptor. */
export function getObjectDetectorDistance(state: SimulatorState): number {
  const protocol = getProtocol(state.protocol);
  return protocol.position === 'supine' ? 11 * state.patientSize + 4.5
    : (protocol.projection === 'LAT' ? 17 : 11) * state.patientSize + 1.5;
}

export function applyProtocol(state: SimulatorState, id: ProtocolId): SimulatorState {
  return { ...state, ...getProtocol(id).defaults, protocol: id, patientRotation: 0, patientOffsetX: 0, patientOffsetY: 0, tubeAngle: 0, breathHeld: true };
}
