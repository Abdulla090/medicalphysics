/** Game progression is tied to physical actions in the 3D clinical department. */
export type GameStage = 'registration' | 'changing' | 'escort' | 'position' | 'exposure' | 'review';

export interface GameProgress {
  registered: boolean;
  changed: boolean;
  escorted: boolean;
  positioned: boolean;
  acquired: boolean;
}

export function getGameStage(progress: GameProgress): GameStage {
  if (!progress.registered) return 'registration';
  if (!progress.changed) return 'changing';
  if (!progress.escorted) return 'escort';
  if (!progress.positioned) return 'position';
  return progress.acquired ? 'review' : 'exposure';
}

export const GAME_OBJECTIVES: Record<GameStage, { title: string; detail: string; destination: string }> = {
  registration: { title: 'Register your patient', detail: 'Go to reception and check in the patient.', destination: 'RECEPTION' },
  changing: { title: 'Prepare for the examination', detail: 'Take the patient to the changing room, close the door and give them a gown.', destination: 'CHANGING ROOM' },
  escort: { title: 'Bring the patient to X-ray', detail: 'Reopen the privacy door, then return to Imaging 01 and call the patient through its entrance.', destination: 'IMAGING 01' },
  position: { title: 'Position the patient', detail: 'Complete hand hygiene, then manually center and position the patient.', destination: 'IMAGING 01' },
  exposure: { title: 'Take the X-ray', detail: 'Arm the digital detector, then enter the shielded control room, close its lead door and operate the console.', destination: 'CONTROL ROOM' },
  review: { title: 'Review the radiograph', detail: 'Inspect the captured image and finish the clinical case.', destination: 'IMAGE REVIEW' },
};

export const GAME_STAGE_ORDER: GameStage[] = ['registration', 'changing', 'escort', 'position', 'exposure', 'review'];

export const GAME_WAYPOINTS: Record<Exclude<GameStage, 'review'>, { x: number; z: number }> = {
  registration: { x: 7.37, z: 4.77 },
  changing: { x: -3.44, z: 4.85 },
  escort: { x: 2.20, z: 3.28 },
  position: { x: 1.15, z: -1.25 },
  exposure: { x: 5.12, z: 3.18 },
};

export function getWaypointGuide(stage: GameStage, player: { x: number; z: number; yaw: number }, protectedPosition = false, override?: { x: number; z: number }): { distance: number; angle: number } | null {
  if (stage === 'review') return null;
  // Walkable portals form a navigation graph. The hint first leads students
  // out of their current room before steering toward the next objective.
  const inImaging = player.z < 3.20 && player.x < 3.40;
  const inControl = player.z < 3.20 && player.x > 3.40;
  const inChanging = player.z > 3.20 && player.z < 6.25 && player.x < -3.40;
  const path: Array<{ x: number; z: number }> = [];
  if (inControl && stage !== 'exposure') path.push({ x: 5.13, z: 3.75 });
  if (inImaging && stage !== 'position') path.push({ x: 2.12, z: 3.78 });
  if (inChanging && stage !== 'changing') path.push({ x: -2.92, z: 4.85 });
  if (stage === 'position' && player.z > 3.20) path.push({ x: 2.12, z: 2.70 });
  if (stage === 'changing' && !inChanging) path.push({ x: -2.92, z: 4.85 });
  if (stage === 'exposure' && !inControl) path.push({ x: 5.12, z: 3.75 });
  const endpoint = override ?? (stage === 'exposure' && protectedPosition ? { x: 5.05, z: -1.1 } : GAME_WAYPOINTS[stage]);
  path.push(endpoint);
  let x = player.x, z = player.z, distance = 0, firstPoint = path[0];
  for (const point of path) {
    const leg = Math.hypot(point.x - x, point.z - z);
    if (leg < 0.65 && point !== endpoint) { x = point.x; z = point.z; firstPoint = path[path.indexOf(point) + 1] ?? point; continue; }
    distance += leg;
    x = point.x;
    z = point.z;
  }
  const dx = firstPoint.x - player.x, dz = firstPoint.z - player.z;
  const yawToTarget = Math.atan2(-dx, -dz);
  const angle = Math.atan2(Math.sin(yawToTarget - player.yaw), Math.cos(yawToTarget - player.yaw));
  return { distance, angle };
}
