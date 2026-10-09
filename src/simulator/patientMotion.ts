export type GroundPosition = [x: number, z: number];

/** Stable joint angles in radians. A single phase drives feet, arms and trunk;
 * the same cadence is used when frame intervals fluctuate. */
export interface PatientPose {
  thigh: [number, number];
  knee: [number, number];
  ankle: [number, number];
  shoulder: [number, number];
  elbow: [number, number];
  pelvisRoll: number;
  torsoPitch: number;
  torsoSway: number;
  headTurn: number;
  headTilt: number;
  headPitch: number;
  breath: number;
  stepLift: number;
}

/** Subtle standing behaviour and an alternating heel-to-toe walk. This is a
 * deterministic animation rig, not an anatomically calibrated gait analysis. */
export function samplePatientPose(time: number, walking: boolean, discomfort = 0): PatientPose {
  const t = Number.isFinite(time) ? time : 0;
  const pace = t * 7.4;
  const stride = walking ? 1 : 0;
  const phases = [pace, pace + Math.PI];
  const swing = phases.map(phase => Math.sin(phase));
  const lift = phases.map(phase => Math.max(0, -Math.cos(phase)));
  const breath = Math.sin(t * 1.72);
  const gentleHeadTurn = Math.sin(t * 0.39) * 0.048 + Math.sin(t * 0.17) * 0.026;
  const guarding = Math.max(0, Math.min(1, discomfort));
  return {
    thigh: [swing[0] * 0.38 * stride, swing[1] * 0.38 * stride],
    knee: [lift[0] * 0.57 * stride, lift[1] * 0.57 * stride],
    ankle: [(-swing[0] * 0.18 - lift[0] * 0.13) * stride, (-swing[1] * 0.18 - lift[1] * 0.13) * stride],
    shoulder: [-swing[0] * (0.22 - guarding * 0.12) * stride, -swing[1] * (0.22 - guarding * 0.12) * stride],
    elbow: [0.14 + Math.max(0, swing[0]) * 0.13 * stride, 0.14 + Math.max(0, swing[1]) * 0.13 * stride],
    pelvisRoll: Math.sin(2 * pace) * 0.013 * stride,
    torsoPitch: (0.032 + guarding * 0.02) * stride + Math.sin(t * 0.31) * 0.004 * (1 - stride),
    torsoSway: Math.sin(pace) * 0.012 * stride + Math.sin(t * 0.43) * 0.004 * (1 - stride),
    headTurn: walking ? Math.sin(pace * 0.5) * 0.025 : gentleHeadTurn,
    headTilt: (walking ? -Math.sin(pace) * 0.018 : Math.sin(t * 0.55) * 0.012) + guarding * 0.015,
    headPitch: walking ? -0.014 + Math.sin(pace * 2) * 0.011 : 0.012 + Math.sin(t * 0.47) * 0.008,
    breath,
    stepLift: Math.max(...lift) * 0.009 * stride,
  };
}

/** Deterministic distance integration, independent of renderer frame rate.
 * Spends leftover movement on the next segment instead of cutting corners.
 */
export function advancePatientRoute(position: GroundPosition, path: GroundPosition[], metres: number) {
  const next: GroundPosition = [...position];
  let remaining = Number.isFinite(metres) ? Math.max(0, metres) : 0;
  while (remaining > 0 && path.length > 0) {
    const [x, z] = path[0];
    const dx = x - next[0], dz = z - next[1];
    const distance = Math.hypot(dx, dz);
    if (distance < 0.001) { path.shift(); continue; }
    const traveled = Math.min(remaining, distance);
    next[0] += dx / distance * traveled;
    next[1] += dz / distance * traveled;
    remaining -= traveled;
    if (distance - traveled < 0.001) {
      next[0] = x;
      next[1] = z;
      path.shift();
    }
  }
  return next;
}
