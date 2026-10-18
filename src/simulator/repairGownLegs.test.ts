import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three';
import { describe, expect, it } from 'vitest';
import { repairGownLegs } from './repairGownLegs';

function mockLeg(top: number) {
  const mesh = new BufferGeometry();
  mesh.setAttribute('position', new Float32BufferAttribute([
    -.15, .48, -.08, -.01, .48, -.08, -.15, top, -.08, -.01, top, -.08,
  ], 3));
  mesh.setAttribute('skinWeight', new Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
  mesh.setIndex(new Uint16BufferAttribute([0, 1, 2, 1, 3, 2], 1));
  return mesh;
}

describe('gown upper-thigh coverage', () => {
  it('repairs an older mid-thigh cutoff without changing the source mesh and caches the result', () => {
    const old = mockLeg(.64);
    const repaired = repairGownLegs(old);
    expect(repaired).not.toBe(old);
    expect((repaired.getAttribute('position') as Float32BufferAttribute).getY(2)).toBeCloseTo(.84);
    expect((old.getAttribute('position') as Float32BufferAttribute).getY(2)).toBeCloseTo(.64);
    expect(repairGownLegs(old)).toBe(repaired);
  });
  it('leaves already rebuilt gowns alone when their thigh coverage reaches under the hem', () => {
    const modern = mockLeg(.91);
    expect(repairGownLegs(modern)).toBe(modern);
  });
});
