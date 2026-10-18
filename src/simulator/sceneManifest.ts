import type { RoomCollider } from './RoomMovement';
export const DEPARTMENT_BOUNDS = { minX: -6.60, maxX: 8.40, minZ: -3.25, maxZ: 12.25 };
export const DEPARTMENT_ANCHORS = {
  reception: [6.75, 1.34, 4.77], changingDoor: [-3.44, 1.24, 4.85],
  gown: [-5.05, 1.22, 4.63], imagingEntry: [2.20, 1.27, 3.28],
  controlDoor: [5.12, 1.25, 3.22], console: [5.05, 1.16, -1.1],
  hygiene: [-1.08, 1.32, -3.13], exit: [7.0, 0, 5.75],
} satisfies Record<string, [number, number, number]>;
export const ARCHITECTURE_COLLIDERS: RoomCollider[] = [
  { kind: 'box', minX: -3.40, maxX: 3.40, minZ: -3.25, maxZ: -3.25 },
  { kind: 'box', minX: -3.40, maxX: -3.40, minZ: -3.25, maxZ: 3.25 },
  // Two accessible rooms branch from the corridor: changing to the west,
  // and the shielded control room north of the observation suite.
  { kind: 'box', minX: -3.40, maxX: -3.40, minZ: 3.25, maxZ: 4.24 },
  { kind: 'box', minX: -3.40, maxX: -3.40, minZ: 5.46, maxZ: 10.50 },
  { kind: 'box', minX: -6.60, maxX: -6.60, minZ: 3.25, maxZ: 6.25 },
  { kind: 'box', minX: -6.60, maxX: -3.40, minZ: 3.25, maxZ: 3.25 },
  { kind: 'box', minX: -6.60, maxX: -3.40, minZ: 6.25, maxZ: 6.25 },
  { kind: 'box', minX: 3.40, maxX: 3.40, minZ: -3.25, maxZ: 3.25 },
  { kind: 'box', minX: 3.40, maxX: 6.80, minZ: -3.25, maxZ: -3.25 },
  { kind: 'box', minX: 6.80, maxX: 6.80, minZ: -3.25, maxZ: 3.25 },
  { kind: 'box', minX: -3.40, maxX: 1.30, minZ: 3.25, maxZ: 3.25 },
  { kind: 'box', minX: 2.90, maxX: 4.50, minZ: 3.25, maxZ: 3.25 },
  { kind: 'box', minX: 5.80, maxX: 8.40, minZ: 3.25, maxZ: 3.25 },
  { kind: 'box', minX: 8.40, maxX: 8.40, minZ: 3.25, maxZ: 12.25 },
  { kind: 'box', minX: -3.40, maxX: 1, minZ: 10.50, maxZ: 10.50 },
  { kind: 'box', minX: 1, maxX: 1, minZ: 10.50, maxZ: 12.25 },
  { kind: 'box', minX: 1, maxX: 8.40, minZ: 12.25, maxZ: 12.25 },
  // Learning gallery entrance (x = -2.65 .. -1.15).
  { kind: 'box', minX: -3.40, maxX: -2.65, minZ: 6.25, maxZ: 6.25 },
  { kind: 'box', minX: -1.15, maxX: 4.65, minZ: 6.25, maxZ: 6.25 },
  { kind: 'box', minX: 6.35, maxX: 8.40, minZ: 6.25, maxZ: 6.25 },
  // Gallery-to-garden portal (z = 7.80 .. 9.20).
  { kind: 'box', minX: 1, maxX: 1, minZ: 6.25, maxZ: 7.80 },
  { kind: 'box', minX: 1, maxX: 1, minZ: 9.20, maxZ: 10.50 },
];

/** Seat locations drive both the rendered hall and its navigation footprints. */
export const WAITING_SEATS = [
  ...[-2.60,-1.74,-.88,-.02].map((x,i)=>({x,z:9.92,yaw:Math.PI,person:i})),
  ...[7.10,8.03,8.96].map((z,i)=>({x:-2.92,z,yaw:Math.PI/2,person:i===1?null:i+4})),
  {x:.49,z:7.03,yaw:-Math.PI/2,person:6},
  {x:.49,z:9.54,yaw:-Math.PI/2,person:7},
];
export const ANNEX_FURNITURE: RoomCollider[] = [
  {kind:'box',minX:-3.16,maxX:-2.68,minZ:1.70,maxZ:2.40}, // authored clinical trolley
  {kind:'box',minX:6.98,maxX:8.12,minZ:6.61,maxZ:7.84}, // parked wheelchair and footplates
  ...WAITING_SEATS.map(s=>({kind:'box' as const,minX:s.x-.34,maxX:s.x+.34,minZ:s.z-.34,maxZ:s.z+.34})),
  // Privacy screens frame the registration alcove, leaving a clear front entrance.
  {kind:'box',minX:5.465,maxX:5.535,minZ:3.30,maxZ:4.02},
  {kind:'box',minX:5.465,maxX:5.535,minZ:5.79,maxZ:6.20},
  { kind: 'box', minX: -3.05, maxX: -2.55, minZ: 5.15, maxZ: 6.05 }, // waiting bench, clear of changing-room door
  { kind: 'box', minX: 6.295, maxX: 7.205, minZ: 3.88, maxZ: 5.66 }, // reception desk worktop footprint
  { kind: 'box', minX: -5.30, maxX: -3.80, minZ: 3.42, maxZ: 3.90 }, // gown lockers
  { kind: 'box', minX: -5.4, maxX: -4.55, minZ: 5.52, maxZ: 5.88 }, // changing bench
  { kind: 'box', minX: -6.25, maxX: -5.65, minZ: 5.30, maxZ: 5.95 }, // basin
  { kind: 'box', minX: -6.53, maxX: -5.37, minZ: 4.54, maxZ: 4.60 }, // changing privacy screen
  { kind: 'box', minX: 4.35, maxX: 5.77, minZ: -1.47, maxZ: -0.75 }, // operator console
  { kind: 'box', minX: 5.99, maxX: 6.62, minZ: -2.36, maxZ: -1.88 }, // equipment cabinet
  { kind: 'box', minX: 3.15, maxX: 6.25, minZ: 9.20, maxZ: 10.60 }, // planted courtyard bed
  { kind: 'box', minX: 2.45, maxX: 2.95, minZ: 8.95, maxZ: 10.85 }, // garden bench
  { kind: 'box', minX: 6.55, maxX: 7.05, minZ: 8.95, maxZ: 10.85 },
];


export interface SceneManifest {
  version: number;
  bounds: typeof DEPARTMENT_BOUNDS;
  walls: RoomCollider[];
  furniture: RoomCollider[];
  anchors: typeof DEPARTMENT_ANCHORS;
  navigation: { spacing: number; patientRadius: number };
  assets: { manifest: string; sources: string };
}
export const SCENE_MANIFEST: SceneManifest = {
  version: 1, bounds: DEPARTMENT_BOUNDS, walls: ARCHITECTURE_COLLIDERS,
  furniture: ANNEX_FURNITURE, anchors: DEPARTMENT_ANCHORS,
  navigation: { spacing: 0.25, patientRadius: 0.22 },
  assets: { manifest: '/radiography/manifest.json', sources: 'assets/radiography' },
};
