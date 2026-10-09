import { getArmJoints, getPhantom, type PhantomPrimitive, type Vec3 } from './phantom';
import { getObjectDetectorDistance, getProtocol, PROTOCOLS } from './protocols';
import type { ExposureMetrics, ReadinessCheck, SimulatorState } from './types';

export { getArmJoints, getPhantom };

/** NIST ICRU-44 tables: diagnostic-energy μ/ρ in cm²/g. Energy is keV. */
export const ATTENUATION_TABLE = {
  energy: [15, 20, 30, 40, 50, 60, 80, 100, 150],
  tissue: [1.699, 0.823, 0.379, 0.2688, 0.2264, 0.2048, 0.1823, 0.1693, 0.1492],
  bone: [9.032, 4.001, 1.331, 0.6655, 0.4242, 0.3148, 0.2229, 0.1855, 0.148],
} as const;

export function massAttenuation(material: 'tissue' | 'bone', energyKeV: number): number {
  if (!Number.isFinite(energyKeV) || energyKeV < 15 || energyKeV > 150) throw new RangeError('Attenuation table supports 15–150 keV.');
  const energies = ATTENUATION_TABLE.energy, values = ATTENUATION_TABLE[material];
  for (let i = 1; i < energies.length; i++) {
    if (energyKeV <= energies[i]) {
      const fraction = Math.log(energyKeV / energies[i - 1]) / Math.log(energies[i] / energies[i - 1]);
      return Math.exp(Math.log(values[i - 1]) + fraction * Math.log(values[i] / values[i - 1]));
    }
  }
  return values[values.length - 1];
}

export function beerLambert(muPerCm: number, thicknessCm: number): number {
  if (!Number.isFinite(muPerCm) || !Number.isFinite(thicknessCm) || muPerCm < 0 || thicknessCm < 0) throw new RangeError('Attenuation and path length must be finite and nonnegative.');
  return Math.exp(-muPerCm * thicknessCm);
}

/** Fixed teaching-room geometry, also used by the THREE apparatus model. */
export function objectDetectorDistance(state: SimulatorState): number {
  return getObjectDetectorDistance(state);
}

export function calculateMetrics(state: SimulatorState): ExposureMetrics {
  const oid = objectDetectorDistance(state) / Math.cos(state.tubeAngle * Math.PI / 180), sod = state.sid - oid;
  const mas = state.ma * state.exposureMs / 1000;
  if (![state.sid, state.kvp, state.focalSpot, state.patientSize, state.tubeAngle, oid, sod, mas].every(Number.isFinite)
    || sod <= 0 || state.sid <= 0 || state.kvp <= 0 || mas <= 0 || state.focalSpot <= 0 || state.patientSize <= 0) {
    return { mas, magnification: NaN, unsharpness: NaN, relativeExposure: NaN, noise: NaN };
  }
  // Relative detector air fluence only; no dosimetric calibration or exposure index.
  const relativeExposure = mas / 2 * (state.kvp / 110) ** 2 * (180 / state.sid) ** 2 * (state.grid ? 1 : 1 / 0.72);
  return { mas, magnification: state.sid / sod, unsharpness: state.focalSpot * oid / sod, relativeExposure, noise: 1 / Math.sqrt(1000 * relativeExposure) };
}

/**
 * A coarse protocol-specific central-anatomy envelope, in patient-local cm.
 * These bounds intentionally represent key teaching landmarks, not the entire
 * patient or an assertion that a clinical examination has adequate coverage.
 * Projecting its corners catches centering/angulation issues which a field-size
 * threshold alone cannot detect.
 */
export interface ProjectedLandmark {
  id: string;
  label: string;
  detectorXcm: number;
  detectorYcm: number;
  inField: boolean;
}

export interface ProjectionCoverage {
  projection: 'PA' | 'AP' | 'LAT';
  /** A sampled analytic reference envelope, not a clinical coverage score. */
  envelopeCoveragePercent: number;
  landmarkCoveragePercent: number;
  /** Smallest distance from a sampled envelope point to a collimator edge. Negative = outside. */
  minimumMarginCm: number;
  bounds: { leftCm: number; rightCm: number; bottomCm: number; topCm: number };
  landmarks: ProjectedLandmark[];
}

const REFERENCE_LANDMARKS = {
  chest: [
    ['right-apex', 'Right lung apex', -7.8, 141, 0],
    ['left-apex', 'Left lung apex', 7.8, 141, 0],
    ['right-angle', 'Right costophrenic region', -12, 110, 0],
    ['left-angle', 'Left costophrenic region', 12, 110, 0],
    ['carina', 'Carina region', 0, 132, 1],
    ['heart', 'Heart center', 3.2, 119, 4.3],
  ],
  abdomen: [
    ['right-diaphragm', 'Right hemidiaphragm region', -8, 110, 0],
    ['left-diaphragm', 'Left hemidiaphragm region', 8, 110, 0],
    ['right-flank', 'Right flank region', -13, 95, 0],
    ['left-flank', 'Left flank region', 13, 95, 0],
    ['pubic', 'Pubic symphysis region', 0, 81, 4],
  ],
  pelvis: [
    ['right-crest', 'Right iliac crest', -13, 86, -1],
    ['left-crest', 'Left iliac crest', 13, 86, -1],
    ['pubic', 'Pubic symphysis', 0, 71, 4],
    ['right-hip', 'Right femoral head', -9, 73, 0],
    ['left-hip', 'Left femoral head', 9, 73, 0],
  ],
} as const;

/** Projection of protocol landmarks and a sampled reference volume onto the true receptor plane. */
export function analyzeProjectionCoverage(state: SimulatorState): ProjectionCoverage {
  const protocol = getProtocol(state.protocol);
  const valid = [state.sid, state.tubeAngle, state.patientSize, state.patientRotation, state.patientOffsetX,
    state.patientOffsetY, state.collimationWidth, state.collimationHeight].every(Number.isFinite) && state.sid > 0;
  const lateral = protocol.projection === 'LAT';
  const bounds = protocol.region === 'chest'
    ? { halfX: protocol.position === 'supine' ? 12 : 14.5, halfZ: lateral ? 8.8 : 7, lowY: 109, highY: 142 }
    : protocol.region === 'abdomen'
      ? { halfX: 13, halfZ: 7, lowY: 82, highY: 111 }
      : { halfX: 12.5, halfZ: 7, lowY: 69, highY: 88 };
  const b: Vec3 = protocol.projection === 'PA' ? [0, 0, 1] : lateral ? [1, 0, 0] : [0, 0, -1];
  const u: Vec3 = lateral ? [0, 0, -1] : [1, 0, 0];
  const angle = state.tubeAngle * Math.PI / 180;
  const axialSid = state.sid * Math.cos(angle);
  const oid = objectDetectorDistance(state);
  const detector: Vec3 = [b[0] * oid, protocol.centerY, b[2] * oid];
  const source: Vec3 = [detector[0] - b[0] * axialSid, detector[1] + Math.sin(angle) * state.sid, detector[2] - b[2] * axialSid];
  const yaw = rotationMatrix([0, state.patientRotation * Math.PI / 180, 0]);
  const project = (x: number, y: number, z: number) => {
    const local = rotate([x * state.patientSize, y, z * state.patientSize], yaw);
    const point: Vec3 = [
      local[0] + u[0] * state.patientOffsetX,
      local[1] + state.patientOffsetY,
      local[2] + u[2] * state.patientOffsetX,
    ];
    const delta: Vec3 = [point[0] - source[0], point[1] - source[1], point[2] - source[2]];
    const forward = delta[0] * b[0] + delta[2] * b[2];
    if (forward <= 0 || !valid) return { x: NaN, y: NaN, margin: -Infinity };
    const t = axialSid / forward;
    const px = t * (delta[0] * u[0] + delta[2] * u[2]);
    const py = source[1] + t * delta[1] - detector[1];
    return { x: px, y: py, margin: Math.min(state.collimationWidth / 2 - Math.abs(px), state.collimationHeight / 2 - Math.abs(py)) };
  };
  let inside = 0, total = 0, minimumMarginCm = Infinity;
  const all = [] as ReturnType<typeof project>[];
  // Sampling intermediate points permits progressive feedback during partial cutoff.
  for (const x of [-bounds.halfX, 0, bounds.halfX]) for (const y of [bounds.lowY, (bounds.lowY + bounds.highY) / 2, bounds.highY]) for (const z of [-bounds.halfZ, 0, bounds.halfZ]) {
    const p = project(x, y, z);
    all.push(p); total++;
    if (p.margin >= -1e-9) inside++;
    minimumMarginCm = Math.min(minimumMarginCm, p.margin);
  }
  const landmarks = REFERENCE_LANDMARKS[protocol.region].map(([id, label, x, y, z]) => {
    const point = project(x, y, z);
    return { id, label, detectorXcm: point.x, detectorYcm: point.y, inField: point.margin >= 0 };
  });
  return {
    projection: protocol.projection,
    envelopeCoveragePercent: Math.round(100 * inside / total),
    landmarkCoveragePercent: Math.round(100 * landmarks.filter((item) => item.inField).length / landmarks.length),
    minimumMarginCm,
    bounds: {
      leftCm: Math.min(...all.map((p) => p.x)), rightCm: Math.max(...all.map((p) => p.x)),
      bottomCm: Math.min(...all.map((p) => p.y)), topCm: Math.max(...all.map((p) => p.y)),
    },
    landmarks,
  };
}

function referenceAnatomyCovered(state: SimulatorState): boolean {
  return analyzeProjectionCoverage(state).envelopeCoveragePercent === 100;
}

export function getReadinessChecks(state: SimulatorState): ReadinessCheck[] {
  const protocol = getProtocol(state.protocol);
  const ranges: Array<[number, number, number]> = [
    [state.kvp, 40, 150], [state.ma, 1, 1000], [state.exposureMs, 1, 2000], [state.sid, 70, 220],
    [state.focalSpot, 0.1, 2], [state.patientSize, 0.65, 1.65], [state.tubeAngle, -35, 35],
    [state.patientRotation, -45, 45], [state.patientOffsetX, -30, 30], [state.patientOffsetY, -30, 30],
    [state.collimationWidth, 5, 35], [state.collimationHeight, 5, 43],
  ];
  return [
    { id: 'operator', label: 'Operator protected', passed: state.shielded === true, blocking: true, detail: 'The simulated operator must be behind the protective barrier before exposure.' },
    { id: 'detector', label: 'Detector armed', passed: state.detectorReady === true, blocking: true, detail: 'Arm the detector before the simulated exposure.' },
    { id: 'parameters', label: 'Valid equipment settings', passed: PROTOCOLS.some((p) => p.id === state.protocol) && ranges.every(([value, low, high]) => Number.isFinite(value) && value >= low && value <= high), blocking: true, detail: 'Settings must be finite and within this simulated equipment’s supported operating ranges.' },
    { id: 'centering', label: 'Patient centered', passed: Math.abs(state.patientOffsetX) <= 1.5 && Math.abs(state.patientOffsetY) <= 1.5, blocking: false, detail: 'Patient displacement changes coverage. Confirm the requested anatomy is inside the field.' },
    { id: 'rotation', label: 'Projection aligned', passed: Math.abs(state.patientRotation) <= 3 && Math.abs(state.tubeAngle) <= 3, blocking: false, detail: 'Rotation and tube angulation alter projected anatomy; deliberate variants remain available.' },
    { id: 'coverage', label: 'Reference anatomy in field', passed: referenceAnatomyCovered(state), blocking: false, detail: 'A simplified anatomy envelope is projected through the current geometry. Inspect actual anatomy at image edges; this estimate cannot establish clinically adequate coverage.' },
    { id: 'arms', label: 'Arms clear of anatomy', passed: protocol.projection !== 'LAT' || state.arms === 'raised', blocking: false, detail: 'Raise the arms for a lateral chest to reduce superimposition.' },
    { id: 'breath', label: 'Respiration suspended', passed: state.breathHeld, blocking: false, detail: protocol.region === 'chest' ? 'Hold after inspiration for routine chest projections; the teaching phantom expands the lungs and reduces modeled motion.' : protocol.region === 'abdomen' ? 'Hold after expiration for this abdomen projection; free breathing adds approximate longitudinal motion blur.' : 'Suspended respiration reduces the approximate longitudinal motion blur.' },
  ];
}

function rotationMatrix([x, y, z]: Vec3): number[] {
  const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
  // Row-major Rx Ry Rz, matching THREE.Euler XYZ.
  return [c * e, -c * f, d, a * f + b * d * e, a * e - b * d * f, -b * c, b * f - a * d * e, b * e + a * d * f, a * c];
}
function inverseRotate(vector: Vec3, matrix: number[]): Vec3 {
  return [matrix[0] * vector[0] + matrix[3] * vector[1] + matrix[6] * vector[2], matrix[1] * vector[0] + matrix[4] * vector[1] + matrix[7] * vector[2], matrix[2] * vector[0] + matrix[5] * vector[1] + matrix[8] * vector[2]];
}
function rotate(vector: Vec3, matrix: number[]): Vec3 {
  return [matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2], matrix[3] * vector[0] + matrix[4] * vector[1] + matrix[5] * vector[2], matrix[6] * vector[0] + matrix[7] * vector[1] + matrix[8] * vector[2]];
}

/** Exact finite-ray/ellipsoid chord endpoints, expressed in cm along a unit ray. */
export function intersectEllipsoid(origin: Vec3, unitDirection: Vec3, primitive: Pick<PhantomPrimitive, 'center' | 'radii' | 'rotation'>, maxDistance = Infinity): [number, number] | null {
  const matrix = rotationMatrix(primitive.rotation ?? [0, 0, 0]);
  const o = inverseRotate([origin[0] - primitive.center[0], origin[1] - primitive.center[1], origin[2] - primitive.center[2]], matrix);
  const d = inverseRotate(unitDirection, matrix);
  return solveEllipsoid(o, d, primitive.radii, maxDistance);
}
function solveEllipsoid(o: Vec3, d: Vec3, radii: Vec3, maxDistance: number): [number, number] | null {
  const ox = o[0] / radii[0], oy = o[1] / radii[1], oz = o[2] / radii[2];
  const dx = d[0] / radii[0], dy = d[1] / radii[1], dz = d[2] / radii[2];
  const a = dx * dx + dy * dy + dz * dz, b = ox * dx + oy * dy + oz * dz, c = ox * ox + oy * oy + oz * oz - 1;
  const discriminant = b * b - a * c;
  if (discriminant <= 0 || a === 0) return null;
  const root = Math.sqrt(discriminant), start = Math.max(0, (-b - root) / a), end = Math.min(maxDistance, (-b + root) / a);
  return end > start ? [start, end] : null;
}

export interface SpectrumBin { energyKeV: number; weight: number; tissueMu: number; boneMu: number }
/** Approximate filtered Kramers-shaped spectrum, not a measured/validated tube spectrum. */
export function approximateSpectrum(kvp: number): SpectrumBin[] {
  if (!Number.isFinite(kvp) || kvp < 40 || kvp > 150) throw new RangeError('Spectrum supports 40–150 kVp.');
  const bins: SpectrumBin[] = [], low = 15;
  let total = 0;
  for (let i = 0; i < 12; i++) {
    const energyKeV = low + (kvp - low) * (i + 0.5) / 12;
    const weight = (kvp - energyKeV) / energyKeV * Math.exp(-2.7 * (30 / energyKeV) ** 3);
    total += weight;
    bins.push({ energyKeV, weight, tissueMu: massAttenuation('tissue', energyKeV), boneMu: massAttenuation('bone', energyKeV) });
  }
  bins.forEach((bin) => { bin.weight /= total; });
  return bins;
}

export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let n = value;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
/** Exact Poisson for small means; bounded normal approximation for means >=30. */
export function sampleQuantumCounts(mean: number, random: () => number): number {
  if (mean <= 0) return 0;
  if (mean < 30) {
    const threshold = Math.exp(-mean);
    let product = 1, count = 0;
    do { product *= Math.max(Number.EPSILON, random()); count++; } while (product > threshold);
    return count - 1;
  }
  const gaussian = Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, random()))) * Math.cos(2 * Math.PI * random());
  return Math.max(0, Math.round(mean + Math.sqrt(mean) * gaussian));
}

interface CompiledPrimitive {
  primitive: PhantomPrimitive;
  rotation: number[];
  source: Vec3;
  priority: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
// Gas cavities replace organ tissue; bone retains precedence at skeletal overlaps.
const MATERIAL_PRIORITY = { 'soft-tissue': 1, lung: 2, heart: 3, air: 4, bone: 5 };
interface RayEvent { distance: number; index: number; enter: boolean }

/** Detector flat panel =35×43 cm. Pixel values encode log attenuation, white=attenuated. */
export function generateRadiograph(state: SimulatorState, seed = 1, width = 384): { pixels: Uint16Array; width: number; height: number } {
  const blockers = getReadinessChecks(state).filter((check) => check.blocking && !check.passed);
  if (blockers.length) throw new Error(`Exposure blocked: ${blockers.map((check) => check.label).join(', ')}.`);
  if (!Number.isInteger(width) || width < 32 || width > 1024) throw new RangeError('Image width must be an integer from 32 to 1024.');
  const height = Math.round(width * 43 / 35), pixels = new Uint16Array(width * height);
  const protocol = getProtocol(state.protocol), oid = objectDetectorDistance(state);
  const b: Vec3 = protocol.projection === 'PA' ? [0, 0, 1] : protocol.projection === 'LAT' ? [1, 0, 0] : [0, 0, -1];
  const u: Vec3 = protocol.projection === 'LAT' ? [0, 0, -1] : [1, 0, 0];
  const angle = state.tubeAngle * Math.PI / 180, yaw = rotationMatrix([0, state.patientRotation * Math.PI / 180, 0]);
  const detector: Vec3 = [b[0] * oid, protocol.centerY, b[2] * oid];
  const axialSid = state.sid * Math.cos(angle);
  const sourceWorld: Vec3 = [detector[0] - b[0] * axialSid, protocol.centerY + Math.sin(angle) * state.sid, detector[2] - b[2] * axialSid];
  const displacement: Vec3 = [u[0] * state.patientOffsetX, state.patientOffsetY, u[2] * state.patientOffsetX];
  const source = inverseRotate([sourceWorld[0] - displacement[0], sourceWorld[1] - displacement[1], sourceWorld[2] - displacement[2]], yaw);
  const compiled: CompiledPrimitive[] = [];
  const rows: number[][] = Array.from({ length: height }, () => []);
  const dot = (a: Vec3, c: Vec3) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
  for (const primitive of getPhantom(state)) {
    const rotation = rotationMatrix(primitive.rotation ?? [0, 0, 0]);
    const centerRotated = rotate(primitive.center, yaw);
    const center: Vec3 = [centerRotated[0] + displacement[0], centerRotated[1] + displacement[1], centerRotated[2] + displacement[2]];
    // Rotated local AABB is conservative; project all corners through the actual source.
    const extents: Vec3 = [0, 0, 0];
    const axes = [rotate(rotate([primitive.radii[0], 0, 0], rotation), yaw), rotate(rotate([0, primitive.radii[1], 0], rotation), yaw), rotate(rotate([0, 0, primitive.radii[2]], rotation), yaw)];
    for (let k = 0; k < 3; k++) extents[k] = Math.sqrt(axes.reduce((sum, axis) => sum + axis[k] ** 2, 0));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
      const v: Vec3 = [center[0] + x * extents[0] - sourceWorld[0], center[1] + y * extents[1] - sourceWorld[1], center[2] + z * extents[2] - sourceWorld[2]];
      const t = axialSid / dot(v, b);
      const projected: Vec3 = [sourceWorld[0] + v[0] * t - detector[0], sourceWorld[1] + v[1] * t - detector[1], sourceWorld[2] + v[2] * t - detector[2]];
      const px = (dot(projected, u) / 35 + 0.5) * width, py = (0.5 - projected[1] / 43) * height;
      minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
    if (maxX < 0 || minX >= width || maxY < 0 || minY >= height) continue;
    const localSource = inverseRotate([source[0] - primitive.center[0], source[1] - primitive.center[1], source[2] - primitive.center[2]], rotation);
    const item: CompiledPrimitive = { primitive, rotation, source: localSource, priority: MATERIAL_PRIORITY[primitive.material], minX: Math.floor(minX), maxX: Math.ceil(maxX), minY: Math.max(0, Math.floor(minY)), maxY: Math.min(height - 1, Math.ceil(maxY)) };
    const index = compiled.push(item) - 1;
    for (let row = item.minY; row <= item.maxY; row++) rows[row].push(index);
  }
  const bins = approximateSpectrum(state.kvp), metrics = calculateMetrics(state), random = seededRandom(seed);
  // Arbitrary count calibration for visible teaching noise, scaled to physical pixel area.
  const referenceCounts = 60000 * metrics.relativeExposure * (384 / width) ** 2;
  const fieldFraction = state.collimationWidth * state.collimationHeight / (35 * 43);
  const scatterFraction = (state.grid ? 0.035 : 0.23) * fieldFraction * state.patientSize;
  const events: RayEvent[] = [];
  const active = new Set<number>();
  for (let row = 0; row < height; row++) {
    const detectorY = (0.5 - (row + 0.5) / height) * 43;
    if (Math.abs(detectorY) > state.collimationHeight / 2) continue;
    for (let column = 0; column < width; column++) {
      const detectorX = ((column + 0.5) / width - 0.5) * 35;
      if (Math.abs(detectorX) > state.collimationWidth / 2) continue;
      const delta: Vec3 = [detector[0] + u[0] * detectorX - sourceWorld[0], detector[1] + detectorY - sourceWorld[1], detector[2] + u[2] * detectorX - sourceWorld[2]];
      const rayLength = Math.hypot(...delta), worldDirection: Vec3 = [delta[0] / rayLength, delta[1] / rayLength, delta[2] / rayLength];
      const direction = inverseRotate(worldDirection, yaw);
      events.length = 0;
      for (const index of rows[row]) {
        const item = compiled[index];
        if (column < item.minX || column > item.maxX) continue;
        const d = inverseRotate(direction, item.rotation);
        const outer = solveEllipsoid(item.source, d, item.primitive.radii, rayLength);
        if (!outer) continue;
        const push = (start: number, end: number) => {
          if (end > start) { events.push({ distance: start, index, enter: true }, { distance: end, index, enter: false }); }
        };
        if (item.primitive.shell) {
          const innerRadii = item.primitive.radii.map((radius) => Math.max(0.01, radius - item.primitive.shell!)) as Vec3;
          const inner = solveEllipsoid(item.source, d, innerRadii, rayLength);
          if (inner) { push(outer[0], inner[0]); push(inner[1], outer[1]); }
          else push(...outer);
        } else push(...outer);
      }
      events.sort((a, c) => a.distance - c.distance);
      active.clear();
      let previous = events[0]?.distance ?? 0, tissueMass = 0, boneMass = 0;
      for (const event of events) {
        let strongest: CompiledPrimitive | undefined;
        for (const index of active) {
          const candidate = compiled[index];
          if (!strongest || candidate.priority > strongest.priority || candidate.priority === strongest.priority && candidate.primitive.density > strongest.primitive.density) strongest = candidate;
        }
        if (strongest && event.distance > previous) {
          const mass = (event.distance - previous) * strongest.primitive.density;
          if (strongest.primitive.material === 'bone') boneMass += mass;
          else if (strongest.primitive.material !== 'air') tissueMass += mass;
        }
        previous = event.distance;
        if (event.enter) active.add(event.index); else active.delete(event.index);
      }
      let primary = 0;
      for (const bin of bins) primary += bin.weight * Math.exp(-bin.tissueMu * tissueMass - bin.boneMu * boneMass);
      // Explicit scatter heuristic: broad positive veil, attenuated by optional grid.
      const transmitted = Math.min(1, primary + scatterFraction * (1 - primary) * Math.exp(-0.09 * (tissueMass + boneMass)));
      const airCounts = referenceCounts * state.sid ** 2 / rayLength ** 2;
      const counts = sampleQuantumCounts(airCounts * transmitted, random);
      // Transparent flat-panel teaching approximation: small independent
      // electronics/readout noise is added before air-normalized log conversion.
      // Relative detector counts are arbitrary; these are not real detector data.
      const electronicNoise = Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, random()))) * Math.cos(2 * Math.PI * random()) * 3.5;
      const attenuation = -Math.log(Math.max(0.5, counts + electronicNoise) / airCounts);
      pixels[row * width + column] = Math.round(Math.max(0, Math.min(1, attenuation / 8.5)) * 65535);
    }
  }
  // Focal spot geometric unsharpness in mm; detector PSF and free breathing are approximations.
  const mmPerPixel = 350 / width;
  const sigmaX = Math.hypot(metrics.unsharpness / 2.355, 0.2) / mmPerPixel;
  const motionMm = state.breathHeld ? 0 : Math.min(12, 0.012 * state.exposureMs);
  const sigmaY = Math.hypot(metrics.unsharpness / 2.355, 0.2, motionMm / 2.355) / mmPerPixel;
  const blurred = gaussianBlur(pixels, width, height, sigmaX, sigmaY);
  // Never expose or blur across the collimator's closed field.
  for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
    if (Math.abs((0.5 - (row + 0.5) / height) * 43) > state.collimationHeight / 2 || Math.abs(((column + 0.5) / width - 0.5) * 35) > state.collimationWidth / 2) blurred[row * width + column] = 0;
  }
  return { pixels: blurred, width, height };
}

function gaussianBlur(input: Uint16Array, width: number, height: number, sigmaX: number, sigmaY: number): Uint16Array {
  const pass = (source: Uint16Array, sigma: number, horizontal: boolean): Uint16Array => {
    if (sigma < 0.25) return source;
    const radius = Math.min(30, Math.ceil(sigma * 3));
    const kernel = Array.from({ length: radius * 2 + 1 }, (_, i) => Math.exp(-0.5 * ((i - radius) / sigma) ** 2));
    const sum = kernel.reduce((a, b) => a + b, 0);
    const result = new Uint16Array(source.length);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let value = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = horizontal ? Math.max(0, Math.min(width - 1, x + k)) : x;
        const yy = horizontal ? y : Math.max(0, Math.min(height - 1, y + k));
        value += source[yy * width + xx] * kernel[k + radius];
      }
      result[y * width + x] = Math.round(value / sum);
    }
    return result;
  };
  return pass(pass(input, sigmaX, true), sigmaY, false);
}

export interface ImageQualityFinding {
  id: string;
  label: string;
  status: 'review' | 'observed';
  evidence: string;
  correctiveAction: string;
}

export interface RadiographQualityReport {
  /** Calculated from simulated geometry, not automatic clinical image acceptance. */
  coverage: ProjectionCoverage;
  fieldAreaPercent: number;
  p10: number;
  p50: number;
  p90: number;
  tonalSpanPercent: number;
  nearWhitePercent: number;
  /** Local sampled gradient, includes anatomical edges and quantum noise. */
  textureIndex: number;
  /** Inverse-square count proxy relative to default chest PA; not a dose/EI. */
  relativeDetectorFluence: number;
  findings: ImageQualityFinding[];
  projectionExplanation: string;
  inspect: string[];
}

/**
 * Deterministic critique for a teaching radiograph. Reports explicitly separate
 * sample statistics, analytic positioning geometry and heuristics. It does not
 * infer pathology, radiation dose, diagnostic adequacy, or the need to repeat.
 */
export function analyzeRadiographQuality(state: SimulatorState, pixels: Uint16Array, width: number, height: number): RadiographQualityReport {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || pixels.length !== width * height) {
    throw new RangeError('Image dimensions and pixel buffer must match.');
  }
  const coverage = analyzeProjectionCoverage(state);
  const protocol = getProtocol(state.protocol);
  const histogram = new Uint32Array(256);
  let total = 0, nearWhite = 0, gradient = 0, gradientN = 0;
  // Sample a fixed budget for consistent large-image review cost.
  const stride = Math.max(1, Math.ceil(Math.sqrt(width * height / 35000)));
  for (let y = Math.floor(stride / 2); y < height; y += stride) {
    const dy = Math.abs((0.5 - (y + 0.5) / height) * 43);
    if (dy > state.collimationHeight / 2) continue;
    for (let x = Math.floor(stride / 2); x < width; x += stride) {
      const dx = Math.abs(((x + 0.5) / width - 0.5) * 35);
      if (dx > state.collimationWidth / 2) continue;
      const index = y * width + x, value = pixels[index];
      histogram[Math.min(255, value >>> 8)]++;
      total++;
      if (value >= 0.98 * 65535) nearWhite++;
      if (x + stride < width && dx + stride * 35 / width <= state.collimationWidth / 2) {
        gradient += Math.abs(value - pixels[index + stride]);
        gradientN++;
      }
    }
  }
  const percentile = (fraction: number) => {
    if (!total) return 0;
    const target = total * fraction;
    let sum = 0;
    for (let i = 0; i < histogram.length; i++) {
      sum += histogram[i];
      if (sum >= target) return (i + 0.5) / 256;
    }
    return 1;
  };
  const p10 = percentile(0.1), p50 = percentile(0.5), p90 = percentile(0.9);
  const relativeDetectorFluence = calculateMetrics(state).relativeExposure;
  const findings: ImageQualityFinding[] = [];
  const add = (id: string, label: string, review: boolean, evidence: string, correctiveAction: string) => findings.push({ id, label, status: review ? 'review' : 'observed', evidence, correctiveAction });
  add('field', 'Reference anatomy / field', coverage.envelopeCoveragePercent < 100 || coverage.landmarkCoveragePercent < 100,
    `${coverage.envelopeCoveragePercent}% of sampled reference envelope and ${coverage.landmarkCoveragePercent}% of named landmarks project inside the chosen field; nearest edge margin ${Number.isFinite(coverage.minimumMarginCm) ? coverage.minimumMarginCm.toFixed(1) : '—'} cm.`,
    'Re-center the patient or receptor, then adjust collimation only enough to include the required anatomy. Verify the acquired image edges.');
  const rotation = Math.abs(state.patientRotation), angulation = Math.abs(state.tubeAngle);
  add('alignment', 'Projection alignment', rotation > 3 || angulation > 3,
    `Patient rotation ${state.patientRotation}°; tube angle ${state.tubeAngle}°. Deliberate angulation requires its own protocol.`,
    'For a routine orthogonal projection, align the patient and central ray; judge symmetry or superimposition appropriate to the requested view.');
  if (protocol.projection === 'LAT') add('arms', 'Lateral arm clearance', state.arms !== 'raised',
    state.arms === 'raised' ? 'Arms are raised in the synthetic pose.' : 'Arm shadows may overlap the projected thorax.',
    'Raise both arms comfortably clear of the thorax when possible and recheck alignment.');
  add('breathing', 'Breath instruction', !state.breathHeld,
    state.breathHeld ? protocol.region === 'abdomen' ? 'Simulated end-expiration suspension.' : 'Simulated suspended inspiration/respiration.' : `Free-breathing motion heuristic included over ${state.exposureMs} ms.`,
    protocol.region === 'chest' ? 'Coach and time suspended inspiration if the patient can cooperate.' : 'Coach the protocol-specific breath hold if feasible; adapt to patient condition.');
  add('fluence', 'Detector signal / noise', relativeDetectorFluence < 0.45,
    `Relative detector air-fluence proxy ${Number.isFinite(relativeDetectorFluence) ? relativeDetectorFluence.toFixed(2) : '—'}×; measured P10–P90 span ${((p90 - p10) * 100).toFixed(1)}% of the synthetic 16-bit scale.`,
    'Compare fine-structure visibility and quantum noise with another simulated technique; never infer patient dose from this value.');
  if (nearWhite / Math.max(1, total) > 0.04) add('highlights', 'High-signal clipping', true,
    `${(100 * nearWhite / total).toFixed(1)}% of sampled in-field pixels approach full-scale attenuation encoding.`,
    'Inspect the raw image at different windows; determine whether apparent loss of detail is from the synthetic processing.');
  const projectionExplanation = protocol.projection === 'PA'
    ? 'PA chest: anterior anatomy, including the heart, lies nearer the image receptor than in AP. The modeled projected cardiac silhouette is consequently less magnified at matched SID.'
    : protocol.projection === 'LAT'
      ? 'Left lateral chest: the left side is receptor-adjacent. Both lungs and posterior ribs overlap in the projection; arm clearance and true lateral position are key teaching cues.'
      : protocol.region === 'chest'
        ? 'AP chest: the anterior heart lies farther from the receptor than in PA; its projected silhouette is more magnified at matched SID. Supine orientation also changes superimposed anatomy.'
        : `AP ${protocol.region}: posterior structures are nearer the receptor. Check the image for the requested superior/inferior landmarks, centering and symmetric positioning.`;
  const inspect = protocol.projection === 'LAT'
    ? ['Posterior rib superimposition and sternum visibility', 'Both lung apices and posterior costophrenic regions', 'Arms and humeri projected out of the chest', 'Thoracic vertebral and diaphragmatic boundaries']
    : protocol.region === 'chest'
      ? ['Both apices and costophrenic regions', 'Clavicle symmetry and spine alignment', 'Cardiomediastinal outline versus chosen PA/AP projection', 'Vascular markings, diaphragm edges and visible quantum texture']
      : protocol.region === 'abdomen'
        ? ['Diaphragmatic region and inferior pelvic extent', 'Lateral flank margins and midline', 'Psoas/lumbar and gas-pattern landmarks as phantom permits', 'Motion and quantum texture']
        : ['Bilateral iliac crests and proximal femora', 'Pubic symphysis and obturator ring symmetry', 'Femoral heads and hip alignment', 'Field edges and detector texture'];
  return {
    coverage, fieldAreaPercent: 100 * state.collimationWidth * state.collimationHeight / (35 * 43),
    p10, p50, p90, tonalSpanPercent: (p90 - p10) * 100,
    nearWhitePercent: 100 * nearWhite / Math.max(total, 1),
    textureIndex: gradientN ? 100 * gradient / gradientN / 65535 : 0,
    relativeDetectorFluence, findings, projectionExplanation, inspect,
  };
}

export function renderPixelsToCanvas(pixels: Uint16Array, width: number, height: number, canvas: HTMLCanvasElement, windowCenter = 0.46, windowWidth = 0.86, inverted = false): void {
  if (pixels.length !== width * height || !Number.isFinite(windowCenter) || !Number.isFinite(windowWidth) || windowWidth <= 0) throw new RangeError('Invalid image dimensions or display window.');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D rendering is unavailable.');
  const image = context.createImageData(width, height), low = windowCenter - windowWidth / 2;
  for (let i = 0; i < pixels.length; i++) {
    // Zero is the engine's closed-field sentinel. Keep it visibly unexposed
    // even when the learner chooses an unusual low display window.
    let value = pixels[i] === 0 ? 0 : Math.max(0, Math.min(1, (pixels[i] / 65535 - low) / windowWidth));
    // A fixed and restrained presentation curve approximates a processed
    // radiographic display; it does not modify the acquired 16-bit buffer.
    value = value ** 0.87;
    // Mild unsharp masking adds visible edge definition at the 384 px teaching
    // resolution. Do not sharpen against a black collimator boundary.
    if (pixels[i] > 0 && value > 0 && i >= width && i < pixels.length - width) {
      const x = i % width;
      if (x > 0 && x < width - 1 && pixels[i - 1] > 0 && pixels[i + 1] > 0 && pixels[i - width] > 0 && pixels[i + width] > 0) {
        const average = (pixels[i - 1] + pixels[i + 1] + pixels[i - width] + pixels[i + width]) / (4 * 65535);
        value = Math.max(0, Math.min(1, value + 0.16 * (pixels[i] / 65535 - average) / windowWidth));
      }
    }
    if (inverted && pixels[i] !== 0) value = 1 - value;
    const grey = Math.round(value * 255), index = i * 4;
    image.data[index] = grey; image.data[index + 1] = grey; image.data[index + 2] = grey; image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}
