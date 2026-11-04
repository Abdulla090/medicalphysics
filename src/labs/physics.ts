/** SI units throughout. The animation integrates θ'' = −(g/L) sin θ. */
export const STANDARD_GRAVITY = 9.80665;
export type ExperimentId = 'simple-pendulum' | 'hookes-law' | 'ohms-law';
export type ReadingSource = 'simulation' | 'bench';
export interface Reading {
  id: string;
  x: number;
  elapsed: number;
  cycles: number;
  y: number;
  source: ReadingSource;
  angle?: number;
  mass?: number;
  createdAt: string;
}
export interface PendulumState { theta: number; omega: number; time: number }
export interface SpringState { extension: number; velocity: number }

/** Exact underdamped response to a constant load; ζ = 0.32, SI units. */
export function stepLoadedSpring(state: SpringState, dt: number, mass: number, stiffness: number): SpringState {
  const target = mass * STANDARD_GRAVITY / stiffness;
  const naturalSquared = stiffness / mass;
  const decay = 0.32 * Math.sqrt(naturalSquared);
  const frequency = Math.sqrt(naturalSquared - decay * decay);
  const displacement = state.extension - target;
  const c = Math.cos(frequency * dt);
  const s = Math.sin(frequency * dt);
  const envelope = Math.exp(-decay * dt);
  return {
    extension: target + envelope * (displacement * c + (state.velocity + decay * displacement) / frequency * s),
    velocity: envelope * (state.velocity * c - (decay * state.velocity + naturalSquared * displacement) / frequency * s),
  };
}

export function pendulumPeriod(length: number, gravity: number, amplitudeDegrees = 0): number {
  if (!(length > 0) || !(gravity > 0) || !Number.isFinite(length + gravity + amplitudeDegrees) || Math.abs(amplitudeDegrees) >= 180) return NaN;
  // Complete elliptic integral K(sin²(θ₀/2)) via the arithmetic–geometric mean.
  let a = 1;
  let b = Math.cos(amplitudeDegrees * Math.PI / 360);
  for (let i = 0; i < 20 && Math.abs(a - b) > 1e-14; i++) {
    const next = (a + b) / 2;
    b = Math.sqrt(a * b);
    a = next;
  }
  return 2 * Math.PI * Math.sqrt(length / gravity) / a;
}

export function advancePendulum(state: PendulumState, dt: number, length: number, gravity = STANDARD_GRAVITY): PendulumState {
  const acceleration = (theta: number) => -gravity / length * Math.sin(theta);
  const a1 = acceleration(state.theta);
  const v2 = state.omega + a1 * dt / 2;
  const a2 = acceleration(state.theta + state.omega * dt / 2);
  const v3 = state.omega + a2 * dt / 2;
  const a3 = acceleration(state.theta + v2 * dt / 2);
  const v4 = state.omega + a3 * dt;
  const a4 = acceleration(state.theta + v3 * dt);
  return {
    theta: state.theta + dt / 6 * (state.omega + 2 * v2 + 2 * v3 + v4),
    omega: state.omega + dt / 6 * (a1 + 2 * a2 + 2 * a3 + a4),
    time: state.time + dt,
  };
}

export interface Fit {
  slope: number; intercept: number; rSquared: number;
  slopeUncertainty: number | null; count: number;
}
export function linearFit(points: { x: number; y: number }[]): Fit | null {
  if (points.length < 2 || points.some(p => !Number.isFinite(p.x + p.y))) return null;
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  const sxx = points.reduce((s, p) => s + (p.x - meanX) ** 2, 0);
  if (sxx < 1e-12) return null;
  const slope = points.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0) / sxx;
  const intercept = meanY - slope * meanX;
  const residual = points.reduce((s, p) => s + (p.y - slope * p.x - intercept) ** 2, 0);
  const total = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  return {
    slope, intercept, count: n,
    rSquared: total < 1e-15 ? (residual < 1e-15 ? 1 : 0) : Math.max(0, 1 - residual / total),
    slopeUncertainty: n > 2 ? Math.sqrt(residual / (n - 2) / sxx) : null,
  };
}

/** Average repeated periods first, then square. Fit one point per distinct x. */
export function groupedReadings(readings: Reading[], experiment: ExperimentId) {
  const groups = new Map<number, Reading[]>();
  for (const r of readings) {
    const group = groups.get(r.x) ?? [];
    group.push(r);
    groups.set(r.x, group);
  }
  return [...groups].map(([x, group]) => {
    const values = group.map(r => experiment === 'simple-pendulum' ? r.elapsed / r.cycles : r.y);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sem = values.length > 1 ? Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1) / values.length) : null;
    return { x, y: experiment === 'simple-pendulum' ? mean ** 2 : mean, mean, repeats: values.length,
      uncertainty: sem === null ? null : experiment === 'simple-pendulum' ? 2 * mean * sem : sem };
  }).sort((a, b) => a.x - b.x);
}

export function derivedResult(experiment: ExperimentId, fit: Fit | null) {
  if (!fit || fit.slope <= 0) return null;
  const value = experiment === 'simple-pendulum' ? 4 * Math.PI ** 2 / fit.slope : fit.slope;
  return { value, uncertainty: fit.slopeUncertainty === null ? null : value * fit.slopeUncertainty / fit.slope };
}

export function validReading(value: unknown): value is Reading {
  if (!value || typeof value !== 'object') return false;
  const r = value as Reading;
  return typeof r.id === 'string' && typeof r.createdAt === 'string' && (r.source === 'simulation' || r.source === 'bench') &&
    [r.x, r.y, r.elapsed, r.cycles].every(Number.isFinite) && r.x > 0 && r.x <= 10000 && r.y >= 0 && r.y <= 1e9 &&
    r.elapsed > 0 && r.elapsed <= 86400 && Number.isInteger(r.cycles) && r.cycles > 0 && r.cycles <= 1000 &&
    (r.angle === undefined || (Number.isFinite(r.angle) && r.angle > 0 && r.angle < 180)) &&
    (r.mass === undefined || (Number.isFinite(r.mass) && r.mass > 0));
}

export function csvCell(value: string | number) {
  const str = String(value);
  return `"${str.replace(/^[=+@-]/, "'$&").replace(/"/g, '""')}"`;
}
export function readingsCSV(experiment: ExperimentId, readings: Reading[]) {
  const header = experiment === 'simple-pendulum'
    ? ['trial', 'source', 'length_m', 'oscillations', 'elapsed_s', 'period_s', 'period_squared_s2', 'release_angle_deg', 'bob_mass_kg', 'timestamp']
    : ['trial', 'source', experiment === 'hookes-law' ? 'extension_m' : 'current_A', experiment === 'hookes-law' ? 'force_N' : 'voltage_V', 'timestamp'];
  const rows = readings.map((r, i) => experiment === 'simple-pendulum'
    ? [i + 1, r.source, r.x, r.cycles, r.elapsed, r.elapsed / r.cycles, (r.elapsed / r.cycles) ** 2, r.angle ?? '', r.mass ?? '', r.createdAt]
    : [i + 1, r.source, r.x, r.y, r.createdAt]);
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}
