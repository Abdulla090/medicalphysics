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
  if (![state.sid, state.kvp, state.focalSpot, mas].every(Number.isFinite) || sod <= 0 || state.kvp <= 0 || mas <= 0 || state.focalSpot <= 0) {
    return { mas, magnification: NaN, unsharpness: NaN, relativeExposure: NaN, noise: NaN };
  }
  // Relative detector air fluence only; no dosimetric calibration or exposure index.
  const relativeExposure = mas / 2 * (state.kvp / 110) ** 2 * (180 / state.sid) ** 2 * (state.grid ? 1 : 1 / 0.72);
  return { mas, magnification: state.sid / sod, unsharpness: state.focalSpot * oid / sod, relativeExposure, noise: 1 / Math.sqrt(1000 * relativeExposure) };
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
    { id: 'coverage', label: 'Anatomy coverage', passed: state.collimationWidth >= (protocol.projection === 'LAT' ? 25 : 30) * state.patientSize && state.collimationHeight >= (protocol.region === 'pelvis' ? 32 : 40), blocking: false, detail: 'Coverage is estimated from the analytic phantom. Inspect the image edges before accepting a capture.' },
    { id: 'arms', label: 'Arms clear of anatomy', passed: protocol.projection !== 'LAT' || state.arms === 'raised', blocking: false, detail: 'Raise the arms for a lateral chest to reduce superimposition.' },
    { id: 'breath', label: 'Respiration suspended', passed: state.breathHeld, blocking: false, detail: protocol.region === 'chest' ? 'The phantom uses inspiration when held; free breathing reduces lung volume and adds motion blur.' : 'Free breathing adds an approximate longitudinal motion blur.' },
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
      const attenuation = -Math.log(Math.max(0.5, counts) / airCounts);
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

export function renderPixelsToCanvas(pixels: Uint16Array, width: number, height: number, canvas: HTMLCanvasElement, windowCenter = 0.5, windowWidth = 1, inverted = false): void {
  if (pixels.length !== width * height || !Number.isFinite(windowCenter) || !Number.isFinite(windowWidth) || windowWidth <= 0) throw new RangeError('Invalid image dimensions or display window.');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D rendering is unavailable.');
  const image = context.createImageData(width, height), low = windowCenter - windowWidth / 2;
  for (let i = 0; i < pixels.length; i++) {
    let value = Math.max(0, Math.min(1, (pixels[i] / 65535 - low) / windowWidth));
    if (inverted) value = 1 - value;
    const grey = Math.round(value * 255), index = i * 4;
    image.data[index] = grey; image.data[index + 1] = grey; image.data[index + 2] = grey; image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}
