import type { SimulatorState } from './types';

/** Patient-local centimetres. +x is the patient's left, +z anterior, feet y=0. */
export type Vec3 = [number, number, number];
export type PhantomMaterial = 'soft-tissue' | 'lung' | 'bone' | 'heart' | 'air';
export interface PhantomPrimitive {
  id: string;
  label: string;
  material: PhantomMaterial;
  layer: 'surface' | 'skeleton' | 'organs';
  center: Vec3;
  radii: Vec3;
  /** Euler XYZ radians, identical to THREE.Euler's default ordering. */
  rotation?: Vec3;
  /** g/cm³. These are phantom parameters, not an individual patient's tissue densities. */
  density: number;
  /** Hollow ellipsoid: uniform approximate cortical wall thickness in cm. */
  shell?: number;
}
export interface ArmJoints { shoulder: Vec3; elbow: Vec3; wrist: Vec3 }

export function getArmJoints(state: Pick<SimulatorState, 'patientSize' | 'arms'>): { left: ArmJoints; right: ArmJoints } {
  const size = state.patientSize;
  const one = (side: number): ArmJoints => {
    const scale = ([x, y, z]: Vec3): Vec3 => [x * size, y, z * size];
    const shoulder: Vec3 = [side * 18, 138, 0];
    const elbow: Vec3 = state.arms === 'raised' ? [side * 22, 160, 0]
      : state.arms === 'hips' ? [side * 29, 118, 4] : [side * 21, 112, 1];
    const wrist: Vec3 = state.arms === 'raised' ? [side * 12, 180, 0]
      : state.arms === 'hips' ? [side * 18, 100, 8] : [side * 21, 88, 3];
    return { shoulder: scale(shoulder), elbow: scale(elbow), wrist: scale(wrist) };
  };
  return { left: one(1), right: one(-1) };
}

/**
 * Analytic anthropomorphic teaching phantom; deliberately not a segmented CT patient.
 * Same primitives drive visible organs/bones and the attenuation integrator.
 * Patient placement/rotation belong to the scene group and ray transform, not this function.
 */
export function getPhantom(state: SimulatorState): PhantomPrimitive[] {
  const primitives: PhantomPrimitive[] = [];
  const size = state.patientSize;
  const add = (id: string, label: string, material: PhantomMaterial, layer: PhantomPrimitive['layer'], center: Vec3, radii: Vec3, density = 1.06, rotation?: Vec3, shell?: number) => {
    primitives.push({ id, label, material, layer, center: [center[0] * size, center[1], center[2] * size], radii: [radii[0] * size, radii[1], radii[2] * size], density, rotation, shell });
  };
  const segment = (id: string, label: string, material: PhantomMaterial, layer: PhantomPrimitive['layer'], a: Vec3, b: Vec3, radius: number, density: number, shell?: number) => {
    // Size first, then orient: the long axis must still hit the shared arm joints.
    const dx = (b[0] - a[0]) * size, dy = b[1] - a[1], dz = (b[2] - a[2]) * size;
    const length = Math.hypot(dx, dy, dz);
    primitives.push({ id, label, material, layer, center: [(a[0] + b[0]) * size / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) * size / 2], radii: [radius * size, length / 2 + radius * 0.45, radius * size], density, rotation: [Math.atan2(dz, dy), 0, -Math.asin(dx / length)], shell });
  };
  const chain = (id: string, label: string, points: Vec3[], radius: number, density = 1.92) => {
    for (let i = 1; i < points.length; i++) segment(`${id}-${i}`, label, 'bone', 'skeleton', points[i - 1], points[i], radius, density);
  };

  add('thorax-surface', 'Thorax', 'soft-tissue', 'surface', [0, 126, 0], [17, 25, 11]);
  add('abdomen-surface', 'Abdomen', 'soft-tissue', 'surface', [0, 102, 0], [15, 19, 10]);
  add('pelvis-surface', 'Pelvis', 'soft-tissue', 'surface', [0, 79, 0], [17, 13, 11]);
  add('head-surface', 'Head', 'soft-tissue', 'surface', [0, 160, 0], [7.5, 11, 8.5]);
  add('neck-surface', 'Neck', 'soft-tissue', 'surface', [0, 145, 0], [5, 7, 5]);
  add('nose-surface', 'Nose', 'soft-tissue', 'surface', [0, 161, 8], [1.4, 2.4, 2.1]);
  add('skull', 'Cranium', 'bone', 'skeleton', [0, 162, -0.4], [6.9, 8.7, 7.8], 1.92, undefined, 0.45);
  chain('mandible', 'Mandible', [[-5.8, 157, 3], [-5, 151, 5], [0, 149.5, 6.6], [5, 151, 5], [5.8, 157, 3]], 0.6);

  // Routine chest views use suspended inspiration; the abdomen AP protocol
  // instead teaches end-expiration. Neither state is a respiratory animation.
  const inspiration = !state.breathHeld ? 0.97 : state.protocol === 'abdomen-ap' ? 0.94 : 1;
  const lungDensity = state.breathHeld ? state.protocol === 'abdomen-ap' ? 0.31 : 0.26 : 0.29;
  add('right-lung', 'Right lung', 'lung', 'organs', [-7.7, 124.5, 0.3], [6.7, 15.5 * inspiration, 8.3], lungDensity, [0, 0, -0.035]);
  add('left-lung', 'Left lung', 'lung', 'organs', [7.7, 124.8, 0.3], [6.3, 14.9 * inspiration, 8.1], lungDensity, [0, 0, 0.035]);
  add('heart', 'Heart', 'heart', 'organs', [3.2, 119, 4.3], [6.6, 9.3, 5.8], 1.06, [0.12, 0, -0.34]);
  add('mediastinum', 'Mediastinum', 'heart', 'organs', [0, 134, 1.2], [3.2, 12, 4.2], 1.06);
  add('aortic-arch', 'Aortic arch', 'heart', 'organs', [2.1, 136.6, -0.5], [2.6, 3.1, 2.2], 1.06);
  // Idealized hilar-to-peripheral branching adds line-like parenchymal structure
  // to the projected lungs. Segments occupy true 3D space so PA/AP/LAT views
  // superimpose them differently. They are illustrative vessels, not an atlas,
  // a vascular abnormality generator, or diagnostic anatomy.
  for (const side of [-1, 1]) {
    const hilum: Vec3 = [side * 4.2, 129, -0.8];
    const branches: Vec3[][] = [
      [hilum, [side * 7.1, 134, -1.5], [side * 9.8, 138, -3.3], [side * 11.1, 140, -4.2]],
      [hilum, [side * 7.8, 128, 0.5], [side * 10.7, 126.5, 2.6], [side * 12.1, 125, 3.4]],
      [hilum, [side * 6.9, 122, -1.3], [side * 9.2, 117, -2.4], [side * 10.7, 113.5, -3.8]],
      [hilum, [side * 7.1, 124, 1.9], [side * 9.1, 118, 3.2], [side * 10.1, 113.8, 3.7]],
    ];
    branches.forEach((points, branch) => {
      for (let i = 1; i < points.length; i++) {
        segment(`${side > 0 ? 'left' : 'right'}-vessel-${branch}-${i}`, 'Pulmonary vascular branch', 'heart', 'organs', points[i - 1], points[i], [0.65, 0.38, 0.17][i - 1], 1.05);
      }
      // Small asymmetric distal bifurcations preserve identifiable vessel
      // tapering without inventing focal rounded shadows or lesions.
      const end = points[2];
      segment(`${side > 0 ? 'left' : 'right'}-vessel-tip-${branch}-a`, 'Distal vascular branch', 'heart', 'organs', end,
        [end[0] + side * 1.1, end[1] + 2.4, end[2] + 1.1], 0.13, 1.05);
      segment(`${side > 0 ? 'left' : 'right'}-vessel-tip-${branch}-b`, 'Distal vascular branch', 'heart', 'organs', end,
        [end[0] + side * 1.3, end[1] - 2.1, end[2] - 1.1], 0.11, 1.05);
    });
  }
  add('trachea', 'Trachea', 'air', 'organs', [0, 145, 1.3], [0.95, 8.5, 0.95], 0.0012);
  add('liver', 'Liver', 'heart', 'organs', [-5.8, 107, 2.1], [8.3, 5.7, 6.3], 1.06, [0, 0, -0.13]);
  add('stomach-air', 'Gastric gas', 'air', 'organs', [7.2, 108, 2.5], [3.8, 2.3, 3.1], 0.0012);
  add('left-kidney', 'Left kidney', 'heart', 'organs', [6, 99, -4.5], [2.4, 5.2, 2.6], 1.06, [0, 0, 0.13]);
  add('right-kidney', 'Right kidney', 'heart', 'organs', [-6, 97, -4.5], [2.4, 5.2, 2.6], 1.06, [0, 0, -0.13]);
  for (let i = 0; i < 7; i++) add(`bowel-gas-${i}`, 'Bowel gas', 'air', 'organs', [Math.sin(i * 2.4) * 8, 88 + i * 2.5, 3], [1.6 + (i % 2) * 0.5, 2.1, 1.5], 0.0012);

  for (let i = 0; i < 24; i++) {
    const y = i < 5 ? 85 + i * 3.5 : i < 17 ? 102 + (i - 5) * 3.2 : 141 + (i - 17) * 2;
    add(`vertebra-${i}`, i < 5 ? 'Lumbar vertebra' : i < 17 ? 'Thoracic vertebra' : 'Cervical vertebra', 'bone', 'skeleton', [0, y, -6.9], [i < 5 ? 2.4 : 1.8, 1.05, 1.7], 1.45);
    add(`spinous-${i}`, 'Spinous process', 'bone', 'skeleton', [0, y - 0.2, -9.1], [0.45, 0.55, 1.4], 1.92);
  }
  add('sternum', 'Sternum', 'bone', 'skeleton', [0, 132, 9.7], [0.8, 9.3, 0.55], 1.55);
  for (const side of [-1, 1]) {
    const sideName = side === 1 ? 'left' : 'right';
    chain(`${sideName}-clavicle`, 'Clavicle', [[side * 0.8, 141, 7], [side * 5.5, 141.7, 6.7], [side * 10.5, 140.8, 5.2], [side * 16, 139.4, 1.5]], 0.48);
    add(`${sideName}-scapula`, 'Scapula', 'bone', 'skeleton', [side * 10.7, 135.5, -8.6], [4.3, 7.2, 0.4], 1.55, [0, side * 0.28, side * 0.25]);
    for (let rib = 0; rib < 12; rib++) {
      const rx = rib < 3 ? 10.5 + rib * 1.7 : 15.2 - Math.max(0, rib - 7) * 1.15;
      const points: Vec3[] = [];
      for (let j = 0; j <= 12; j++) {
        const t = 0.05 + j / 12 * (rib < 10 ? Math.PI * 0.88 : Math.PI * 0.67);
        points.push([side * rx * Math.sin(t), 142 - rib * 2.4 - 3.6 * Math.sin(t / 2), -1.2 - 9 * Math.cos(t)]);
      }
      chain(`${sideName}-rib-${rib + 1}`, `Rib ${rib + 1}`, points, rib < 2 ? 0.32 : 0.39, 1.65);
    }
    add(`${sideName}-ilium`, 'Ilium', 'bone', 'skeleton', [side * 10, 81, -1.6], [6, 8.2, 1.6], 1.2, [0, side * 0.25, side * 0.26]);
    add(`${sideName}-acetabulum`, 'Acetabulum', 'bone', 'skeleton', [side * 9.2, 73.5, 0.2], [3.2, 3.7, 3.1], 1.92, undefined, 0.45);
    chain(`${sideName}-pubis`, 'Pubic and ischial rami', [[side * 10, 74, 1.5], [side * 5.5, 72, 5.4], [side * 1.2, 73, 6], [side * 4, 68.2, 4], [side * 9, 69, 0]], 0.75, 1.4);
    const thighTop: Vec3 = [side * 9, 73, 0], knee: Vec3 = [side * 8, 44, 0], ankle: Vec3 = [side * 8, 8, 0];
    segment(`${sideName}-thigh-surface`, 'Thigh', 'soft-tissue', 'surface', [side * 9, 73, 0], knee, 7, 1.06);
    segment(`${sideName}-calf-surface`, 'Calf', 'soft-tissue', 'surface', [side * 8, 43, 0], ankle, 4.7, 1.06);
    add(`${sideName}-foot-surface`, 'Foot', 'soft-tissue', 'surface', [side * 8, 4, 4.4], [4.2, 3.8, 10], 1.06);
    segment(`${sideName}-femur`, 'Femur', 'bone', 'skeleton', thighTop, knee, 1.6, 1.92, 0.3);
    add(`${sideName}-femoral-head`, 'Femoral head', 'bone', 'skeleton', [side * 9, 73, 0], [2.45, 2.45, 2.45], 1.15);
    segment(`${sideName}-tibia`, 'Tibia', 'bone', 'skeleton', [side * 7.3, 43, 0.8], [side * 7.3, 8, 0.8], 1.25, 1.92, 0.24);
    segment(`${sideName}-fibula`, 'Fibula', 'bone', 'skeleton', [side * 10, 42, -0.6], [side * 10, 8, -0.6], 0.62, 1.92, 0.16);
    add(`${sideName}-patella`, 'Patella', 'bone', 'skeleton', [side * 8, 44, 3], [1.65, 2, 0.75], 1.8);
    segment(`${sideName}-foot-bones`, 'Tarsals and metatarsals', 'bone', 'skeleton', [side * 8, 3.8, -1], [side * 8, 3.8, 11], 1.45, 1.35);
  }
  add('sacrum', 'Sacrum', 'bone', 'skeleton', [0, 78, -6], [3.8, 7.2, 1.9], 1.25);
  const joints = getArmJoints({ arms: state.arms, patientSize: 1 });
  for (const [side, joint] of Object.entries(joints)) {
    segment(`${side}-upper-arm-surface`, 'Upper arm', 'soft-tissue', 'surface', joint.shoulder, joint.elbow, 3.7, 1.06);
    segment(`${side}-forearm-surface`, 'Forearm', 'soft-tissue', 'surface', joint.elbow, joint.wrist, 2.8, 1.06);
    segment(`${side}-humerus`, 'Humerus', 'bone', 'skeleton', joint.shoulder, joint.elbow, 1.1, 1.92, 0.22);
    segment(`${side}-radius`, 'Radius', 'bone', 'skeleton', [joint.elbow[0] + 0.55, joint.elbow[1], joint.elbow[2]], [joint.wrist[0] + 0.55, joint.wrist[1], joint.wrist[2]], 0.55, 1.92, 0.13);
    segment(`${side}-ulna`, 'Ulna', 'bone', 'skeleton', [joint.elbow[0] - 0.55, joint.elbow[1], joint.elbow[2]], [joint.wrist[0] - 0.55, joint.wrist[1], joint.wrist[2]], 0.55, 1.92, 0.13);
    const handDirection = state.arms === 'raised' ? 1 : -1;
    add(`${side}-hand-surface`, 'Hand', 'soft-tissue', 'surface', [joint.wrist[0], joint.wrist[1] + 5 * handDirection, joint.wrist[2]], [2.6, 5.6, 1.2]);
    add(`${side}-hand-bones`, 'Hand bones', 'bone', 'skeleton', [joint.wrist[0], joint.wrist[1] + 4 * handDirection, joint.wrist[2]], [1.5, 3.8, 0.4], 1.3);
  }
  return primitives;
}
