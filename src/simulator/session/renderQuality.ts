/** Graphics profiles never alter detector resolution, settings, seed or scoring. */
export type RenderQuality = 'low' | 'balanced' | 'high';
export const RENDER_PROFILES = {
  low: { dpr: 1, shadowSize: 512, shadows: false, antialias: false, triangles: 150000, draws: 140, frameMs: 40 },
  balanced: { dpr: 1.25, shadowSize: 1024, shadows: true, antialias: true, triangles: 350000, draws: 220, frameMs: 22 },
  high: { dpr: 1.75, shadowSize: 2048, shadows: true, antialias: true, triangles: 600000, draws: 350, frameMs: 22 },
} as const;
