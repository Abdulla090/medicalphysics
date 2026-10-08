import { describe, expect, it, vi } from 'vitest';
import { ATTENUATION_TABLE, approximateSpectrum, beerLambert, calculateMetrics, generateRadiograph, getReadinessChecks, intersectEllipsoid, massAttenuation, sampleQuantumCounts, seededRandom } from './physics';
import { getArmJoints, getPhantom } from './phantom';
import * as phantomModule from './phantom';
import type { PhantomPrimitive } from './phantom';
import { applyProtocol, DEFAULT_STATE, PROTOCOLS } from './protocols';

describe('analytic attenuation and geometry', () => {
  it('reproduces the cited NIST table values and log interpolates between them', () => {
    ATTENUATION_TABLE.energy.forEach((energy, i) => {
      expect(massAttenuation('tissue', energy)).toBeCloseTo(ATTENUATION_TABLE.tissue[i], 10);
      expect(massAttenuation('bone', energy)).toBeCloseTo(ATTENUATION_TABLE.bone[i], 10);
    });
    expect(massAttenuation('bone', Math.sqrt(40 * 50))).toBeCloseTo(Math.sqrt(0.6655 * 0.4242), 10);
    expect(() => massAttenuation('tissue', 200)).toThrow();
  });
  it('matches Beer–Lambert for an analytic slab without extra opacity', () => {
    expect(beerLambert(Math.log(2) / 5, 5)).toBeCloseTo(0.5, 12);
    expect(beerLambert(0.2, 0)).toBe(1);
    expect(beerLambert(0.2, 10)).toBeCloseTo(Math.exp(-2), 12);
    expect(() => beerLambert(-1, 5)).toThrow();
  });
  it('computes exact ellipsoid chords and rejects missing rays', () => {
    const ellipsoid = { center: [0, 0, 0] as [number, number, number], radii: [2, 3, 4] as [number, number, number] };
    expect(intersectEllipsoid([0, 0, -10], [0, 0, 1], ellipsoid)).toEqual([6, 14]);
    expect(intersectEllipsoid([0, 0, -10], [0, 0, 1], ellipsoid, 12)).toEqual([6, 12]);
    expect(intersectEllipsoid([0, 0, 0], [0, 0, 1], ellipsoid)).toEqual([0, 4]);
    expect(intersectEllipsoid([3, 0, -10], [0, 0, 1], ellipsoid)).toBeNull();
    const rotated = { ...ellipsoid, rotation: [0, Math.PI / 2, 0] as [number, number, number] };
    const hit = intersectEllipsoid([0, 0, -10], [0, 0, 1], rotated)!;
    expect(hit[0]).toBeCloseTo(8, 10); expect(hit[1]).toBeCloseTo(12, 10);
  });
  it('applies mAs and inverse-square scaling without presenting dose', () => {
    const base = calculateMetrics(DEFAULT_STATE);
    expect(base.mas).toBe(2);
    expect(base.relativeExposure).toBeCloseTo(1, 12);
    expect(calculateMetrics({ ...DEFAULT_STATE, sid: 90 }).relativeExposure / base.relativeExposure).toBeCloseTo(4, 12);
    expect(calculateMetrics({ ...DEFAULT_STATE, exposureMs: 20 }).relativeExposure / base.relativeExposure).toBeCloseTo(2, 12);
    expect(base.magnification).toBeCloseTo(180 / 167.5, 12);
    expect(base.unsharpness).toBeCloseTo(0.6 * 12.5 / 167.5, 12);
    expect(calculateMetrics({ ...DEFAULT_STATE, sid: 0 }).magnification).toBeNaN();
    expect(Object.keys(base)).not.toContain('dose');
  });
  it('keeps the approximate spectrum finite, normalized and below tube potential', () => {
    for (const kvp of [40, 80, 110, 150]) {
      const bins = approximateSpectrum(kvp);
      expect(bins.reduce((sum, bin) => sum + bin.weight, 0)).toBeCloseTo(1, 12);
      expect(bins.every((bin) => bin.energyKeV < kvp && bin.energyKeV >= 15 && bin.weight > 0)).toBe(true);
    }
  });
});

describe('quantum noise', () => {
  it('has reproducible seeded counts and Poisson mean/variance', () => {
    const a = seededRandom(123), b = seededRandom(123);
    for (let i = 0; i < 50; i++) expect(sampleQuantumCounts(20, a)).toBe(sampleQuantumCounts(20, b));
    for (const mean of [5, 400]) {
      const random = seededRandom(439), counts = Array.from({ length: 20000 }, () => sampleQuantumCounts(mean, random));
      const average = counts.reduce((sum, value) => sum + value, 0) / counts.length;
      const variance = counts.reduce((sum, value) => sum + (value - average) ** 2, 0) / counts.length;
      expect(average / mean).toBeGreaterThan(0.97); expect(average / mean).toBeLessThan(1.03);
      expect(variance / mean).toBeGreaterThan(0.93); expect(variance / mean).toBeLessThan(1.07);
    }
  });
});

describe('shared anthropomorphic phantom', () => {
  it('uses positive x for the left lung/heart and valid dimensions', () => {
    const phantom = getPhantom(DEFAULT_STATE);
    expect(phantom.find((p) => p.id === 'left-lung')!.center[0]).toBeGreaterThan(0);
    expect(phantom.find((p) => p.id === 'heart')!.center[0]).toBeGreaterThan(0);
    expect(phantom.every((p) => p.radii.every((r) => Number.isFinite(r) && r > 0))).toBe(true);
    expect(phantom.filter((p) => p.label.startsWith('Rib')).length).toBeGreaterThan(100);
  });
  it('changes actual lung geometry/density and arm joints for the selected pose', () => {
    const held = getPhantom(DEFAULT_STATE).find((p) => p.id === 'left-lung')!;
    const breathing = getPhantom({ ...DEFAULT_STATE, breathHeld: false }).find((p) => p.id === 'left-lung')!;
    expect(breathing.radii[1]).toBeLessThan(held.radii[1]);
    expect(breathing.density).toBeGreaterThan(held.density);
    const down = getArmJoints({ arms: 'down', patientSize: 1 });
    const raised = getArmJoints({ arms: 'raised', patientSize: 1.2 });
    expect(raised.left.wrist[1]).toBeGreaterThan(raised.left.shoulder[1]);
    expect(down.left.wrist[1]).toBeLessThan(down.left.shoulder[1]);
    expect(raised.left.shoulder[0]).toBeCloseTo(down.left.shoulder[0] * 1.2, 12);
  });
});

describe('exposure interlocks and production radiographs', () => {
  it('replaces overlapping heart-like tissue with an air cavity independently of primitive order while preserving bone', () => {
    const tissue: PhantomPrimitive = {
      id: 'analytic-organ', label: 'Analytic organ', material: 'heart', layer: 'organs',
      center: [0, 126, 0], radii: [12, 14, 7], density: 1.06,
    };
    const cavity: PhantomPrimitive = {
      id: 'analytic-cavity', label: 'Analytic air cavity', material: 'air', layer: 'organs',
      center: [0, 126, 0], radii: [6, 8, 4], density: 0.0012,
    };
    const bone: PhantomPrimitive = {
      id: 'analytic-bone', label: 'Analytic bone', material: 'bone', layer: 'skeleton',
      center: [0, 126, 0], radii: [1.8, 7, 2.5], density: 1.92,
    };
    const phantom = vi.spyOn(phantomModule, 'getPhantom');
    // Use the production ray integrator, spectrum and display mapping, with the
    // same quantum seed. A small central patch lies inside every test cavity.
    const capture = (primitives: PhantomPrimitive[]) => {
      phantom.mockReturnValue(primitives);
      return generateRadiograph({ ...DEFAULT_STATE, exposureMs: 100 }, 417, 96);
    };
    const centerMean = (image: ReturnType<typeof generateRadiograph>) => {
      let total = 0, count = 0;
      for (let y = Math.floor(image.height / 2) - 2; y <= Math.floor(image.height / 2) + 2; y++) {
        for (let x = image.width / 2 - 2; x <= image.width / 2 + 2; x++) {
          total += image.pixels[y * image.width + x]; count++;
        }
      }
      return total / count;
    };
    try {
      const solid = capture([tissue]);
      const hollow = capture([tissue, cavity]);
      const reordered = capture([cavity, tissue]);
      expect(centerMean(solid) - centerMean(hollow)).toBeGreaterThan(8000);
      expect(reordered.pixels).toEqual(hollow.pixels);
      const hollowWithBone = capture([tissue, cavity, bone]);
      const reorderedWithBone = capture([bone, cavity, tissue]);
      expect(centerMean(hollowWithBone) - centerMean(hollow)).toBeGreaterThan(5000);
      expect(reorderedWithBone.pixels).toEqual(hollowWithBone.pixels);
    } finally {
      phantom.mockRestore();
    }
  });
  it('blocks unsafe simulated operator, unarmed detector and invalid numeric state', () => {
    expect(() => generateRadiograph({ ...DEFAULT_STATE, shielded: false }, 1, 32)).toThrow(/Operator protected/);
    expect(() => generateRadiograph({ ...DEFAULT_STATE, detectorReady: false }, 1, 32)).toThrow(/Detector armed/);
    expect(() => generateRadiograph({ ...DEFAULT_STATE, kvp: NaN }, 1, 32)).toThrow(/Valid equipment/);
    expect(() => generateRadiograph({ ...DEFAULT_STATE, collimationWidth: Infinity }, 1, 32)).toThrow();
    expect(getReadinessChecks({ ...DEFAULT_STATE, patientRotation: 10 }).find((check) => check.id === 'rotation')).toMatchObject({ passed: false, blocking: false });
  });
  it('produces finite, anatomically varied nonblank output for every protocol', () => {
    for (const protocol of PROTOCOLS) {
      const image = generateRadiograph(applyProtocol(DEFAULT_STATE, protocol.id), 9, 96);
      expect(image.pixels.length).toBe(image.width * image.height);
      let sum = 0, sumSquares = 0, max = 0;
      image.pixels.forEach((value) => { sum += value; sumSquares += value * value; max = Math.max(max, value); });
      const mean = sum / image.pixels.length;
      expect(max).toBeGreaterThan(10000);
      expect(mean).toBeGreaterThan(1000);
      expect(sumSquares / image.pixels.length - mean ** 2).toBeGreaterThan(1000000);
    }
  });
  it('leaves every pixel outside the actual collimation field unexposed', () => {
    const image = generateRadiograph({ ...DEFAULT_STATE, collimationWidth: 10, collimationHeight: 12, breathHeld: false, exposureMs: 100 }, 2, 96);
    let insideCount = 0;
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      const outside = Math.abs(((x + 0.5) / image.width - 0.5) * 35) > 5 || Math.abs((0.5 - (y + 0.5) / image.height) * 43) > 6;
      if (outside) expect(image.pixels[y * image.width + x]).toBe(0);
      else insideCount += Number(image.pixels[y * image.width + x] > 0);
    }
    expect(insideCount).toBeGreaterThan(100);
  });
  it('responds to rotation, displacement, tube angulation, arm superimposition and quantum seed', () => {
    const base = generateRadiograph(DEFAULT_STATE, 3, 64).pixels;
    const difference = (other: Uint16Array) => other.reduce((sum, value, i) => sum + Math.abs(value - base[i]), 0) / base.length;
    expect(difference(generateRadiograph({ ...DEFAULT_STATE, patientRotation: 15 }, 3, 64).pixels)).toBeGreaterThan(500);
    expect(difference(generateRadiograph({ ...DEFAULT_STATE, patientOffsetX: 4 }, 3, 64).pixels)).toBeGreaterThan(1000);
    expect(difference(generateRadiograph({ ...DEFAULT_STATE, tubeAngle: 12 }, 3, 64).pixels)).toBeGreaterThan(500);
    expect(difference(generateRadiograph(DEFAULT_STATE, 4, 64).pixels)).toBeGreaterThan(5);
    expect(generateRadiograph(DEFAULT_STATE, 3, 64).pixels).toEqual(base);
    const lateral = applyProtocol(DEFAULT_STATE, 'chest-lateral');
    const raised = generateRadiograph(lateral, 1, 64).pixels;
    const down = generateRadiograph({ ...lateral, arms: 'down' }, 1, 64).pixels;
    expect(down.reduce((sum, value, i) => sum + Math.abs(value - raised[i]), 0) / down.length).toBeGreaterThan(100);
  });
  it('completes a full default 384-pixel detector image within a practical worker budget', () => {
    const start = performance.now();
    const image = generateRadiograph(DEFAULT_STATE, 1, 384);
    expect(image.width).toBe(384); expect(image.height).toBe(472);
    expect(performance.now() - start).toBeLessThan(5000);
  });
});
