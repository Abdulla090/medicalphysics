import { BufferAttribute, BufferGeometry } from 'three';

const repairedMeshes = new WeakMap<BufferGeometry, BufferGeometry>();

/**
 * Bridges the missing upper-thigh surface in the existing compressed patient
 * assets. The source character generator now exports the complete thighs; this
 * compatibility repair keeps already-built festival assets wearable as well.
 *
 * The gown is roomy and covers the repaired section. We only extend the two
 * exposed skin boundary loops, retaining their original skinning and UVs.
 */
export function repairGownLegs(source: BufferGeometry): BufferGeometry {
  const cached = repairedMeshes.get(source);
  if (cached) return cached;
  const positions = source.getAttribute('position');
  const skinWeights = source.getAttribute('skinWeight');
  const indices = source.getIndex();
  if (!(positions instanceof BufferAttribute) || !skinWeights || !indices) return source;

  // UV/material seams often duplicate indexed vertices. Weld by the original
  // spatial positions for edge accounting so a vertical seam is not mistaken
  // for an open leg rim.
  const indicesByLocation = new Map<string, number[]>();
  const positionsByIndex: string[] = [];
  for (let i = 0; i < positions.count; i++) {
    const key = [positions.getX(i), positions.getY(i), positions.getZ(i)]
      .map(v => Math.round(v * 10000)).join(':');
    positionsByIndex.push(key);
    const list = indicesByLocation.get(key) ?? [];
    list.push(i);
    indicesByLocation.set(key, list);
  }
  const edges = new Map<string, { a: string; b: string; count: number }>();
  const edge = (i: number, j: number) => {
    const a = positionsByIndex[i], b = positionsByIndex[j];
    if (a === b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const existing = edges.get(key);
    if (existing) existing.count += 1;
    else edges.set(key, { a, b, count: 1 });
  };
  for (let i = 0; i < indices.count; i += 3) {
    const a = indices.getX(i), b = indices.getX(i + 1), c = indices.getX(i + 2);
    edge(a, b); edge(b, c); edge(c, a);
  }

  const hemSide = new Set<number>();
  for (const { a, b, count } of edges.values()) {
    if (count !== 1) continue;
    for (const location of [a, b]) for (const i of indicesByLocation.get(location) ?? []) {
      // Feet and neckline have independent open edges; repair only the two
      // thigh loops just below the roughly 0.7 m-high skirt.
      const y = positions.getY(i);
      if (y > 0.53 && y < 0.76 && Math.abs(positions.getX(i)) < 0.21) hemSide.add(i);
    }
  }
  if (!hemSide.size) { repairedMeshes.set(source, source); return source; }
  const geometry = source.clone();
  const restored = geometry.getAttribute('position') as BufferAttribute;
  for (const i of hemSide) {
    // The old cut ends mid-thigh. Extend the skinned surface under the gown,
    // where the rim is invisible and cannot appear as a floating leg cap.
    restored.setY(i, Math.max(restored.getY(i), 0.84));
  }
  restored.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  repairedMeshes.set(source, geometry);
  return geometry;
}
