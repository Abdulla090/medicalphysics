import { memo, useEffect, useLayoutEffect, useMemo, useRef, type DependencyList } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getArmJoints, getPhantom, type PhantomPrimitive } from './phantom';
import { createPatientMaterials, type PatientMaterials } from './patientTextures';
import { samplePatientPose } from './patientMotion';
import type { SimulatorState } from './types';

type Point = [number, number, number];
type Ring = [y: number, radiusX: number, radiusZ: number, centerZ?: number];
type GeometryPart = { id: string; geometry: THREE.BufferGeometry };

const BONE = '#e8dfc9';
const HEAD_RINGS: Ring[] = [
  [1.477, 0.019, 0.023, 0.015], [1.489, 0.032, 0.038, 0.014],
  [1.515, 0.052, 0.054, 0.012], [1.548, 0.067, 0.073, 0.003],
  [1.581, 0.076, 0.084], [1.614, 0.081, 0.089],
  [1.645, 0.079, 0.084, -0.002], [1.676, 0.071, 0.071, -0.004],
  [1.700, 0.050, 0.054, -0.003], [1.718, 0.020, 0.025, -0.003],
  [1.725, 0.001, 0.001, -0.003],
];

/** A connected, elliptical loft, with a smooth silhouette rather than intersecting spheres. */
function sculpt(rings: Ring[], segments = 56, steps = 64, contour?: (x: number, y: number, z: number, theta: number) => Point) {
  const profile = new THREE.CatmullRomCurve3(rings.map(([y, rx, rz]) => new THREE.Vector3(rx, y, rz)), false, 'centripetal');
  const centerProfile = new THREE.CatmullRomCurve3(rings.map(([y, , , z = 0]) => new THREE.Vector3(z, y, 0)), false, 'centripetal');
  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  for (let row = 0; row <= steps; row++) {
    const p = profile.getPoint(row / steps);
    const centerZ = centerProfile.getPoint(row / steps).x;
    for (let column = 0; column <= segments; column++) {
      const theta = column / segments * Math.PI * 2;
      const x = Math.sin(theta) * Math.max(0.0001, p.x);
      const z = Math.cos(theta) * Math.max(0.0001, p.z) + centerZ;
      const vertex = contour ? contour(x, p.y, z, theta) : [x, p.y, z];
      vertices.push(...vertex);
      uvs.push(column / segments * Math.PI * (p.x + p.z), p.y);
      if (row < steps && column < segments) {
        const a = row * (segments + 1) + column;
        const b = a + segments + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Variable-radius, elliptical swept surface for muscles and articulated extremities. */
function sweep(points: Point[], radii: [number, number][], segments = 32, steps = 44) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  const radiusCurve = new THREE.CatmullRomCurve3(radii.map((r, i) => new THREE.Vector3(r[0], i / (radii.length - 1), r[1])), false, 'centripetal');
  const length = curve.getLength();
  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  for (let row = 0; row <= steps; row++) {
    const progress = row / steps;
    const center = curve.getPoint(progress);
    const tangent = curve.getTangent(progress).normalize();
    const reference = Math.abs(tangent.z) > 0.96 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const side = new THREE.Vector3().crossVectors(tangent, reference).normalize();
    const front = new THREE.Vector3().crossVectors(side, tangent).normalize();
    const radius = radiusCurve.getPoint(progress);
    for (let column = 0; column <= segments; column++) {
      const angle = column / segments * Math.PI * 2;
      const point = center.clone()
        .addScaledVector(side, Math.cos(angle) * Math.max(0.0001, radius.x))
        .addScaledVector(front, Math.sin(angle) * Math.max(0.0001, radius.z));
      vertices.push(point.x, point.y, point.z);
      uvs.push(column / segments * Math.PI * (radius.x + radius.z), progress * length);
      if (row < steps && column < segments) {
        const a = row * (segments + 1) + column;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function line(points: Point[], radius: number, segments = 32) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), segments, radius, 8, false);
}

/** Each leg joins half the hip perimeter and the same U-shaped crotch/seat seam. */
function shortsLeg(side: number) {
  const segments = 64, rows = 40;
  const vertices: number[] = [], indices: number[] = [], uvs: number[] = [];
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    for (let column = 0; column <= segments; column++) {
      const angle = column / segments * Math.PI * 2;
      const sine = Math.sin(angle), cosine = Math.cos(angle);
      const inner = sine < 0;
      const endX = inner ? 0 : side * sine * 0.177;
      const endY = inner ? 0.79 + sine * 0.103 : 0.79;
      const x = THREE.MathUtils.lerp(side * (0.082 + sine * 0.083), endX, t);
      const y = THREE.MathUtils.lerp(0.636, endY, t);
      const z = cosine * THREE.MathUtils.lerp(0.081, 0.117, t);
      vertices.push(x, y, z);
      uvs.push(column / segments * Math.PI * 0.164, y);
      if (row < rows && column < segments) {
        const a = row * (segments + 1) + column, b = a + segments + 1;
        if (side === 1) indices.push(a, a + 1, b, a + 1, b + 1, b);
        else indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function useGeometryParts(factory: () => GeometryPart[], dependencies: DependencyList) {
  // Geometry factories are deliberately keyed by anatomy/pose, never by exposure settings.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const parts = useMemo(factory, dependencies);
  useEffect(() => () => parts.forEach(part => part.geometry.dispose()), [parts]);
  return parts;
}

const FixedSurface = memo(function FixedSurface({ ghost, materials, walkingRig = false, headRef }: { ghost: boolean; materials: PatientMaterials; walkingRig?: boolean; headRef: { current: THREE.Group | null } }) {
  const parts = useGeometryParts(() => {
    const torso = sculpt([
      [0.706, 0.028, 0.045], [0.745, 0.127, 0.084], [0.79, 0.169, 0.108],
      [0.86, 0.165, 0.109], [0.96, 0.145, 0.1], [1.035, 0.147, 0.103],
      [1.115, 0.161, 0.108], [1.205, 0.173, 0.109], [1.285, 0.175, 0.108],
      [1.35, 0.187, 0.092], [1.385, 0.181, 0.072], [1.415, 0.09, 0.057],
      [1.445, 0.047, 0.047], [1.493, 0.043, 0.045],
    ], 64, 100, (x, y, z, theta) => {
      const anterior = Math.max(0, Math.cos(theta));
      const pec = Math.exp(-(((Math.abs(x) - 0.087) / 0.064) ** 2) - ((y - 1.29) / 0.071) ** 2);
      const sternum = Math.exp(-((x / 0.015) ** 2) - ((y - 1.275) / 0.12) ** 2);
      const abdomen = Math.exp(-((x / 0.11) ** 2) - ((y - 1.04) / 0.13) ** 2);
      const clavicleNotch = Math.exp(-((x / 0.018) ** 2) - (((y - 1.406) / 0.018) ** 2));
      const neckTendon = Math.exp(-(((Math.abs(x) - 0.027) / 0.008) ** 2) - (((y - 1.451) / 0.045) ** 2));
      const lowerPec = Math.exp(-(((y - 1.241) / 0.009) ** 2) - (((Math.abs(x) - 0.08) / 0.06) ** 2));
      const midline = Math.exp(-((x / 0.006) ** 2) - (((y - 1.095) / 0.093) ** 2));
      return [x, y, z + anterior * (pec * 0.009 - sternum * 0.004 + abdomen * 0.003 - clavicleNotch * 0.003 + neckTendon * 0.0018 - lowerPec * 0.0015 - midline * 0.0013)];
    });
    const head = sculpt(HEAD_RINGS, 72, 88, (x, y, z, theta) => {
      const front = Math.max(0, Math.cos(theta));
      const brow = Math.exp(-(((y - 1.646) / 0.012) ** 2));
      const eyeSocket = Math.exp(-(((Math.abs(x) - 0.033) / 0.022) ** 2) - ((y - 1.623) / 0.013) ** 2);
      const cheek = Math.exp(-(((Math.abs(x) - 0.049) / 0.028) ** 2) - ((y - 1.586) / 0.025) ** 2);
      const philtrum = Math.exp(-((x / 0.003) ** 2) - (((y - 1.58) / 0.013) ** 2));
      const muzzle = Math.exp(-((x / 0.028) ** 2) - (((y - 1.563) / 0.019) ** 2));
      const nasolabial = Math.exp(-(((Math.abs(x) - (0.012 + (1.593 - y) * 0.39)) / 0.003) ** 2) - (((y - 1.582) / 0.018) ** 2));
      const jaw = Math.exp(-(((Math.abs(x) - 0.056) / 0.026) ** 2) - (((y - 1.532) / 0.047) ** 2));
      return [x, y, z + front ** 4 * (brow * 0.005 - eyeSocket * 0.006 + cheek * 0.004 - jaw * 0.002 - philtrum * 0.0012 + muzzle * 0.003 - nasolabial * 0.0011)];
    });
    const fixed: GeometryPart[] = [{ id: 'torso', geometry: torso }, { id: 'head', geometry: head }];
    for (const side of [-1, 1]) {
      const leg = sculpt([
        [0.097, 0.03, 0.032], [0.14, 0.034, 0.035], [0.22, 0.045, 0.042],
        [0.31, 0.049, 0.047], [0.385, 0.043, 0.041], [0.445, 0.052, 0.049],
        [0.525, 0.06, 0.055], [0.63, 0.074, 0.071], [0.735, 0.083, 0.083],
        [0.802, 0.079, 0.077],
      ], 44, 80, (x, y, z) => {
        const knee = Math.exp(-(((y - 0.445) / 0.026) ** 2)) * Math.exp(-((x / 0.025) ** 2));
        return [x + side * (0.078 + Math.sin(y * 4) * 0.005), y, z + Math.max(0, z) * knee * 0.08];
      });
      const foot = sculpt([
        [0.005, 0.029, 0.083, 0.045], [0.015, 0.041, 0.11, 0.055],
        [0.034, 0.045, 0.111, 0.052], [0.06, 0.04, 0.093, 0.041],
        [0.085, 0.033, 0.06, 0.018], [0.13, 0.03, 0.035, 0.003],
      ], 40, 36);
      foot.translate(side * 0.082, 0, 0);
      fixed.push({ id: `leg-${side}`, geometry: leg }, { id: `foot-${side}`, geometry: foot });
      for (let toe = 0; toe < 5; toe++) {
        const toeX = side * 0.082 - side * (0.025 - toe * 0.012);
        const length = 0.037 - toe * 0.003;
        const toeGeometry = sweep([
          [toeX, 0.032, 0.127], [toeX, 0.027, 0.147], [toeX, 0.024, 0.147 + length],
        ], [[0.01 - toe * 0.0008, 0.014 - toe * 0.001], [0.009 - toe * 0.0009, 0.011], [0.001, 0.002]], 16, 15);
        fixed.push({ id: `toe-${side}-${toe}`, geometry: toeGeometry });
      }
      const ear = sculpt([
        [1.579, 0.002, 0.005], [1.593, 0.012, 0.014], [1.621, 0.012, 0.014],
        [1.636, 0.008, 0.01], [1.64, 0.001, 0.002],
      ], 24, 28);
      ear.translate(side * 0.081, 0, -0.004);
      fixed.push({ id: `ear-${side}`, geometry: ear });
    }
    const nose = sculpt([
      [1.582, 0.011, 0.006, 0.09], [1.596, 0.017, 0.020, 0.092],
      [1.606, 0.010, 0.021, 0.089], [1.630, 0.008, 0.012, 0.086],
      [1.648, 0.003, 0.003, 0.085],
    ], 32, 36);
    fixed.push({ id: 'nose', geometry: nose });
    return fixed;
  }, []);

  const facePart = (id: string) => id === 'head' || id === 'nose' || id.startsWith('ear-');
  return <group>
    {parts.filter(part => !facePart(part.id) && (!walkingRig || !part.id.startsWith('leg-') && !part.id.startsWith('foot-') && !part.id.startsWith('toe-'))).map(part => <mesh key={part.id} geometry={part.geometry} material={ghost ? materials.ghost : materials.skin} castShadow={!ghost} receiveShadow renderOrder={ghost ? 8 : 0} />)}
    <group ref={headRef} position={[0, 1.48, 0]}>
      <group position={[0, -1.48, 0]}>
        {parts.filter(part => facePart(part.id)).map(part => <mesh key={part.id} geometry={part.geometry} material={ghost ? materials.ghost : materials.skin} castShadow={!ghost} receiveShadow renderOrder={ghost ? 8 : 0} />)}
        {!ghost && <SurfaceDetail materials={materials} />}
      </group>
    </group>
  </group>;
});

const SurfaceDetail = memo(function SurfaceDetail({ materials }: { materials: PatientMaterials }) {
  const details = useGeometryParts(() => {
    const result: GeometryPart[] = [];
    for (const side of [-1, 1]) {
      result.push({ id: `clavicle-${side}`, geometry: line([[side * 0.012, 1.393, 0.064], [side * 0.065, 1.389, 0.071], [side * 0.123, 1.377, 0.075], [side * 0.17, 1.365, 0.069]], 0.0021) });
      result.push({ id: `ear-ridge-${side}`, geometry: line([[side * 0.078, 1.59, 0.011], [side * 0.084, 1.602, 0.012], [side * 0.084, 1.626, 0.011], [side * 0.08, 1.633, 0.004]], 0.0018) });
      result.push({ id: `eyelid-${side}`, geometry: line([[side * 0.012, 1.628, 0.081], [side * 0.029, 1.635, 0.085], [side * 0.048, 1.628, 0.078]], 0.0019) });
      result.push({ id: `lower-eyelid-${side}`, geometry: line([[side * 0.012, 1.625, 0.081], [side * 0.029, 1.619, 0.084], [side * 0.048, 1.625, 0.078]], 0.0012) });
      result.push({ id: `antihelix-${side}`, geometry: line([[side * 0.082, 1.597, 0.009], [side * 0.078, 1.605, 0.01], [side * 0.078, 1.618, 0.008], [side * 0.081, 1.629, 0.009]], 0.0012) });
    }
    return result;
  }, []);
  const mouth = useGeometryParts(() => [{ id: 'mouth', geometry: line([[-0.024, 1.563, 0.077], [-0.010, 1.567, 0.082], [0, 1.565, 0.084], [0.010, 1.567, 0.082], [0.024, 1.563, 0.077]], 0.0012) }], []);
  const lips = useGeometryParts(() => [
    { id: 'upper-lip', geometry: sweep([[-0.024, 1.564, 0.078], [-0.008, 1.568, 0.082], [0, 1.567, 0.084], [0.008, 1.568, 0.082], [0.024, 1.564, 0.078]], [[0.0005, 0.0007], [0.002, 0.0017], [0.0016, 0.0018], [0.002, 0.0017], [0.0005, 0.0007]], 12, 40) },
    { id: 'lower-lip', geometry: sweep([[-0.023, 1.562, 0.078], [0, 1.557, 0.083], [0.023, 1.562, 0.078]], [[0.0005, 0.0006], [0.0028, 0.0024], [0.0005, 0.0006]], 12, 30) },
  ], []);
  const brows = useGeometryParts(() => [-1, 1].map(side => ({ id: `brow-${side}`, geometry: sweep([[side * 0.011, 1.649, 0.083], [side * 0.029, 1.651, 0.084], [side * 0.048, 1.646, 0.079]], [[0.002, 0.001], [0.003, 0.0014], [0.0004, 0.0005]], 12, 30) })), []);
  const hair = useGeometryParts(() => {
    const profile = new THREE.CatmullRomCurve3(HEAD_RINGS.map(([y, rx, rz]) => new THREE.Vector3(rx, y, rz)), false, 'centripetal');
    const centerProfile = new THREE.CatmullRomCurve3(HEAD_RINGS.map(([y, , , z = 0]) => new THREE.Vector3(z, y, 0)), false, 'centripetal');
    const geometry = sculpt([[1.59, 0.080, 0.088], [1.726, 0.0001, 0.0001]], 72, 44, (_x, y, _z, theta) => {
      const front = Math.max(0, Math.cos(theta));
      const side = Math.abs(Math.sin(theta));
      const start = 1.588 + front * (0.078 + 0.008 * Math.sin(theta * 3)) + side * 0.035;
      const height = start + (1.726 - start) * (y - 1.59) / 0.136;
      let lo = 0, hi = 1;
      for (let i = 0; i < 16; i++) {
        const middle = (lo + hi) * 0.5;
        if (profile.getPoint(middle).y < Math.min(height, 1.724)) lo = middle;
        else hi = middle;
      }
      const sample = (lo + hi) * 0.5;
      const head = profile.getPoint(sample), centerZ = centerProfile.getPoint(sample).x;
      const closure = Math.max(0, Math.min(1, (1.726 - height) / 0.001));
      const rx = (head.x + 0.0016) * closure, rz = (head.z + 0.0016) * closure;
      return [Math.sin(theta) * Math.max(0.00005, rx), height, Math.cos(theta) * Math.max(0.00005, rz) + centerZ];
    });
    return [
      { id: 'cropped-hair', geometry },
      { id: 'swept-fringe-left', geometry: sweep([[-0.054, 1.679, 0.043], [-0.040, 1.688, 0.060], [-0.021, 1.680, 0.072]], [[0.022, 0.014], [0.018, 0.011], [0.002, 0.003]], 14, 18) },
      { id: 'swept-fringe-right', geometry: sweep([[0.062, 1.682, 0.037], [0.037, 1.692, 0.058], [0.009, 1.680, 0.074]], [[0.019, 0.013], [0.014, 0.011], [0.002, 0.003]], 14, 18) },
    ];
  }, []);

  return <group>
    {details.map(part => <mesh key={part.id} geometry={part.geometry} material={materials.skin} />)}
    {mouth.map(part => <mesh key={part.id} geometry={part.geometry}><meshStandardMaterial color="#977766" roughness={1} /></mesh>)}
    {lips.map(part => <mesh key={part.id} geometry={part.geometry}><meshPhysicalMaterial color="#b78a7d" roughness={0.64} clearcoat={0.08} clearcoatRoughness={0.56} /></mesh>)}
    {[...brows, ...hair].map(part => <mesh key={part.id} geometry={part.geometry} material={materials.hair} castShadow />)}
    {[-1, 1].map(side => <group key={`face-${side}`}>
      <mesh position={[side * 0.031, 1.626, 0.078]} scale={[0.0175, 0.0064, 0.006]}>
        <sphereGeometry args={[1, 32, 20]} /><meshPhysicalMaterial color="#ddd8cc" roughness={0.32} clearcoat={0.2} clearcoatRoughness={0.25} />
      </mesh>
      <mesh position={[side * 0.031, 1.626, 0.0841]} material={materials.iris}>
        <circleGeometry args={[0.0062, 32]} />
      </mesh>
      <mesh position={[side * 0.031, 1.626, 0.0843]} scale={[0.0063, 0.0063, 0.0011]}>
        <sphereGeometry args={[1, 24, 16]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.12} depthWrite={false} roughness={0.08} clearcoat={0.9} clearcoatRoughness={0.08} />
      </mesh>
      <mesh position={[side * 0.079, 1.609, 0.005]} scale={[0.003, 0.0101, 0.0053]}>
        <sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial color="#ba947f" roughness={0.84} />
      </mesh>
      <mesh position={[side * 0.008, 1.591, 0.088]} scale={[0.004, 0.0016, 0.0016]}>
        <sphereGeometry args={[1, 16, 8]} /><meshStandardMaterial color="#987662" roughness={1} />
      </mesh>
    </group>)}
  </group>;
});

const HospitalGarment = memo(function HospitalGarment({ materials, walkingRig = false }: { materials: PatientMaterials; walkingRig?: boolean }) {
  const parts = useGeometryParts(() => {
    const gown = sculpt([
      [0.64, 0.228, 0.153], [0.675, 0.231, 0.154], [0.77, 0.226, 0.150],
      [0.91, 0.187, 0.125], [1.04, 0.170, 0.121], [1.16, 0.186, 0.129],
      [1.28, 0.202, 0.127], [1.345, 0.201, 0.112], [1.393, 0.128, 0.087],
      [1.420, 0.059, 0.058],
    ], 64, 85, (x, y, z, theta) => {
      const folds = Math.sin(theta * 12 + y * 6) * (0.002 + 0.006 * Math.max(0, (1.05 - y) / 0.42));
      const hem = Math.cos(theta * 18) * Math.exp(-(((y - 0.655) / 0.025) ** 2)) * 0.002;
      return [x + Math.sin(theta) * (folds + hem), y, z + Math.cos(theta) * (folds + hem)];
    });
    const result: GeometryPart[] = [{ id: 'radiography-gown', geometry: gown }, { id: 'shorts-hips', geometry: sculpt([[0.79, 0.177, 0.117], [0.845, 0.174, 0.117], [0.883, 0.159, 0.111], [0.892, 0.157, 0.109]], 64, 48, (x, y, z, theta) => {
      const pleat = Math.sin(theta * 18) * 0.0015 * Math.exp(-(((y - 0.863) / 0.035) ** 2));
      return [x + Math.sin(theta) * pleat, y, z + Math.cos(theta) * pleat];
    }) }];
    for (const side of [-1, 1]) {
      result.push({ id: `short-leg-${side}`, geometry: shortsLeg(side) });
    }
    return result;
  }, []);
  const seams = useGeometryParts(() => {
    const result = [
      { id: 'gown-hem', geometry: line(Array.from({ length: 65 }, (_, i): Point => [Math.sin(i / 64 * Math.PI * 2) * 0.230, 0.656, Math.cos(i / 64 * Math.PI * 2) * 0.154]), 0.0013, 64) },
      { id: 'gown-neckline', geometry: line(Array.from({ length: 65 }, (_, i): Point => [Math.sin(i / 64 * Math.PI * 2) * 0.061, 1.420, Math.cos(i / 64 * Math.PI * 2) * 0.060]), 0.0015, 64) },
      { id: 'gown-front-stitch', geometry: line([[0.0, 1.41, 0.065], [0.006, 1.32, 0.131], [0.010, 1.17, 0.136], [0.004, 1.02, 0.124], [-0.004, 0.86, 0.133], [0.002, 0.67, 0.159]], 0.00085, 40) },
      { id: 'waistband', geometry: line(Array.from({ length: 65 }, (_, i): Point => [Math.sin(i / 64 * Math.PI * 2) * 0.159, 0.887, Math.cos(i / 64 * Math.PI * 2) * 0.111]), 0.0013, 64) },
    ];
    for (const side of [-1, 1]) {
      result.push({ id: `hem-${side}`, geometry: line(Array.from({ length: 49 }, (_, i): Point => [side * 0.082 + Math.sin(i / 48 * Math.PI * 2) * 0.0834, 0.639, Math.cos(i / 48 * Math.PI * 2) * 0.0814]), 0.0012, 48) });
      result.push({ id: `side-seam-${side}`, geometry: line([[side * 0.166, 0.65, 0.003], [side * 0.171, 0.72, 0.003], [side * 0.1775, 0.79, 0.003], [side * 0.167, 0.868, 0.003]], 0.0007, 30) });
      result.push({ id: `pocket-${side}`, geometry: line([[side * 0.143, 0.861, 0.063], [side * 0.135, 0.82, 0.079], [side * 0.115, 0.777, 0.092]], 0.0006, 30) });
    }
    for (const front of [-1, 1]) result.push({ id: `center-seam-${front}`, geometry: line([[0, 0.687, 0], [0, 0.715, front * 0.08], [0, 0.755, front * 0.11], [0, 0.79, front * 0.1175], [0, 0.852, front * 0.1175], [0, 0.885, front * 0.1115]], 0.00055, 44) });
    return result;
  }, []);
  return <group>
    {parts.filter(part => !walkingRig || !part.id.startsWith('short-leg')).map(part => <mesh key={part.id} geometry={part.geometry} material={materials.fabric} castShadow receiveShadow />)}
    {seams.map(part => <mesh key={part.id} geometry={part.geometry}><meshStandardMaterial color="#72a5a3" roughness={0.93} /></mesh>)}
    <mesh position={[0.10, 1.235, 0.137]} rotation={[0, 0, -0.12]}><planeGeometry args={[0.046, 0.058]} /><meshStandardMaterial color="#d3e4df" roughness={0.9} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0.10, 1.235, 0.138]} rotation={[0, 0, -0.12]}><planeGeometry args={[0.032, 0.004]} /><meshStandardMaterial color="#6f9b94" roughness={0.95} side={THREE.DoubleSide} /></mesh>
  </group>;
});

const OutpatientGarment = memo(function OutpatientGarment({ materials, walkingRig = false }: { materials: PatientMaterials; walkingRig?: boolean }) {
  const garment = useGeometryParts(() => {
    const shirt = sculpt([
      [0.861, 0.184, 0.120], [0.890, 0.177, 0.125], [0.985, 0.166, 0.119],
      [1.095, 0.170, 0.119], [1.185, 0.187, 0.126], [1.315, 0.202, 0.129],
      [1.362, 0.211, 0.111], [1.409, 0.108, 0.065], [1.426, 0.055, 0.050],
    ], 56, 80, (x, y, z, theta) => {
      const hem = Math.exp(-(((y - 0.884) / 0.038) ** 2));
      const diagonal = Math.sin(13 * theta + 9 * y + Math.sin(theta * 4) * 0.8);
      const fold = (0.0013 + 0.0035 * hem) * diagonal;
      return [x + Math.sin(theta) * fold, y, z + Math.cos(theta) * fold];
    });
    const pants = [-1, 1].map(side => {
      const part = sculpt([
        [0.085, 0.041, 0.045], [0.18, 0.052, 0.055], [0.37, 0.051, 0.054],
        [0.48, 0.056, 0.065], [0.64, 0.084, 0.086], [0.79, 0.106, 0.088],
        [0.89, 0.110, 0.095],
      ], 32, 68, (x, y, z, theta) => [x + side * 0.084 + Math.sin(theta * 17) * 0.0015, y, z]);
      return { id: `pants-${side}`, geometry: part };
    });
    return [{ id: 'outpatient-shirt', geometry: shirt }, ...pants];
  }, []);
  const trim = useGeometryParts(() => [
    { id: 'collar', geometry: line([[-0.065, 1.415, 0.041], [-0.030, 1.427, 0.055], [0, 1.419, 0.060], [0.030, 1.427, 0.055], [0.065, 1.415, 0.041]], 0.0038, 34) },
    { id: 'button-placket', geometry: line([[0, 1.414, 0.063], [0.002, 1.350, 0.117], [0.002, 1.280, 0.134]], 0.0017, 20) },
    { id: 'hem', geometry: line(Array.from({ length: 49 }, (_, i): Point => [Math.sin(i / 48 * Math.PI * 2) * 0.181, 0.875, Math.cos(i / 48 * Math.PI * 2) * 0.125]), 0.0018, 48) },
    ...[-1, 1].map(side => ({ id: `shoulder-${side}`, geometry: line([[side * 0.055, 1.418, 0.038], [side * 0.117, 1.399, 0.064], [side * 0.207, 1.351, 0.040]], 0.0012, 24) })),
  ], []);
  return <group>
    {garment.filter(part => !walkingRig || part.id === 'outpatient-shirt').map(part => <mesh key={part.id} geometry={part.geometry} material={part.id === 'outpatient-shirt' ? materials.casualShirt : materials.trousers} castShadow receiveShadow />)}
    {trim.map(part => <mesh key={part.id} geometry={part.geometry} material={materials.piping} />)}
    {!walkingRig && [-1, 1].map(side => <group key={side}>
      <mesh position={[side * 0.083, 0.072, 0.105]} scale={[0.070, 0.067, 0.145]} castShadow material={materials.footwear}><sphereGeometry args={[1, 24, 16]} /></mesh>
      <mesh position={[side * 0.165, 1.31, 0]} rotation={[0, 0, side * -0.24]} scale={[0.067, 0.15, 0.069]} castShadow material={materials.casualShirt}><sphereGeometry args={[1, 24, 18]} /></mesh>
    </group>)}
    {[1.380, 1.350, 1.319].map(y => <mesh key={y} position={[0.0035, y, 0.124]}><sphereGeometry args={[0.0032, 10, 8]} /><meshStandardMaterial color="#b9c7be" roughness={0.65} /></mesh>)}
    <mesh position={[-0.095, 1.272, 0.129]} rotation={[0.02, -0.15, -0.04]}><planeGeometry args={[0.057, 0.055]} /><meshStandardMaterial color="#5b7a79" roughness={0.94} side={THREE.DoubleSide} /></mesh>
    <mesh position={[-0.095, 1.300, 0.130]} material={materials.piping}><planeGeometry args={[0.050, 0.003]} /></mesh>
  </group>;
});

const Hand = memo(function Hand({ wrist, elbow, side, ghost, materials }: { wrist: Point; elbow: Point; side: number; ghost: boolean; materials: PatientMaterials }) {
  const parts = useGeometryParts(() => {
    const result: GeometryPart[] = [{ id: 'palm', geometry: sculpt([[0, 0.023, 0.021], [0.023, 0.031, 0.022], [0.052, 0.033, 0.018], [0.073, 0.028, 0.014]], 28, 30) }];
    const lengths = [0.061, 0.071, 0.064, 0.048];
    for (let finger = 0; finger < 4; finger++) {
      const x = side * (0.026 - finger * 0.017);
      const end = 0.07 + lengths[finger];
      result.push({ id: `finger-${finger}`, geometry: sweep([[x, 0.064, 0], [x + side * 0.001, 0.081, -0.001], [x + side * 0.002, 0.092, -0.002], [x + side * 0.003, end - 0.016, -0.007], [x + side * 0.003, end - 0.006, -0.011], [x + side * 0.003, end, -0.013]], [[0.008, 0.009], [0.0071, 0.008], [0.0081, 0.008], [0.0067, 0.0067], [0.0055, 0.0057], [0.001, 0.001]], 22, 30) });
    }
    result.push({ id: 'thumb', geometry: sweep([[side * 0.025, 0.015, 0.005], [side * 0.045, 0.035, 0.004], [side * 0.053, 0.062, 0.001], [side * 0.049, 0.079, -0.005]], [[0.014, 0.013], [0.011, 0.011], [0.008, 0.008], [0.001, 0.001]], 22, 24) });
    return result;
  }, [side]);
  const creases = useGeometryParts(() => {
    const result: GeometryPart[] = [];
    for (let finger = 0; finger < 4; finger++) {
      const x = side * (0.027 - finger * 0.017);
      for (let joint = 0; joint < 2; joint++) {
        const y = joint === 0 ? 0.091 : 0.062 + [0.061, 0.071, 0.064, 0.048][finger] * 0.72;
        const z = joint === 0 ? -0.0095 : -0.012;
        result.push({ id: `crease-${finger}-${joint}`, geometry: line([[x - 0.005, y, z], [x, y - 0.0006, z - 0.0007], [x + 0.005, y, z]], 0.00023, 16) });
      }
    }
    return result;
  }, [side]);
  const direction = new THREE.Vector3(...wrist).sub(new THREE.Vector3(...elbow)).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  return <group position={wrist} quaternion={quaternion}>
    {parts.map(part => <mesh key={part.id} geometry={part.geometry} material={ghost ? materials.ghost : materials.skin} castShadow={!ghost} renderOrder={ghost ? 8 : 0} />)}
    {!ghost && creases.map(part => <mesh key={part.id} geometry={part.geometry}><meshStandardMaterial color="#b38d78" roughness={0.88} transparent opacity={0.55} /></mesh>)}
    {!ghost && [0, 1, 2, 3].map(finger => <mesh key={`nail-${finger}`} position={[side * (0.029 - finger * 0.017), 0.059 + [0.061, 0.071, 0.064, 0.048][finger], -0.0154]} rotation={[-0.12, 0, 0]} scale={[0.0049, 0.008, 0.0009]}>
      <sphereGeometry args={[1, 16, 8]} /><meshStandardMaterial color="#dfc0aa" roughness={0.66} />
    </mesh>)}
    {!ghost && <mesh position={[side * 0.051, 0.068, -0.0092]} rotation={[0, 0, -side * 0.15]} scale={[0.006, 0.008, 0.0009]}>
      <sphereGeometry args={[1, 16, 8]} /><meshStandardMaterial color="#dfc0aa" roughness={0.66} />
    </mesh>}
  </group>;
});

const ArticulatedArms = memo(function ArticulatedArms({ pose, ghost, materials }: { pose: SimulatorState['arms']; ghost: boolean; materials: PatientMaterials }) {
  const joints = useMemo(() => getArmJoints({ arms: pose, patientSize: 1 }), [pose]);
  const parts = useGeometryParts(() => {
    const result: GeometryPart[] = [];
    for (const [name, limb] of Object.entries(joints)) {
      const shoulder = new THREE.Vector3(...limb.shoulder).multiplyScalar(0.01);
      const elbow = new THREE.Vector3(...limb.elbow).multiplyScalar(0.01);
      const wrist = new THREE.Vector3(...limb.wrist).multiplyScalar(0.01);
      const upper = shoulder.clone().lerp(elbow, 0.45);
      const lower = elbow.clone().lerp(wrist, 0.44);
      const root = shoulder.clone().add(new THREE.Vector3(name === 'left' ? -0.015 : 0.015, -0.012, 0));
      result.push({ id: `arm-${name}`, geometry: sweep([root.toArray() as Point, shoulder.toArray() as Point, upper.toArray() as Point, elbow.toArray() as Point, lower.toArray() as Point, wrist.toArray() as Point], [[0.043, 0.041], [0.049, 0.045], [0.039, 0.037], [0.031, 0.03], [0.032, 0.029], [0.024, 0.022]], 36, 64) });
    }
    return result;
  }, [joints]);
  return <group>
    {parts.map(part => <mesh key={part.id} geometry={part.geometry} material={ghost ? materials.ghost : materials.skin} castShadow={!ghost} receiveShadow renderOrder={ghost ? 8 : 0} />)}
    {Object.entries(joints).map(([name, limb]) => <Hand key={name} materials={materials} side={name === 'left' ? 1 : -1} ghost={ghost} wrist={limb.wrist.map(v => v / 100) as Point} elbow={limb.elbow.map(v => v / 100) as Point} />)}
  </group>;
});

function organColor(primitive: PhantomPrimitive) {
  const id = `${primitive.id} ${primitive.label}`.toLowerCase();
  if (primitive.material === 'bone') return BONE;
  if (primitive.material === 'lung') return '#758e9f';
  if (id.includes('liver')) return '#875750';
  if (id.includes('kidney')) return '#a87670';
  if (id.includes('stomach')) return '#b99789';
  if (id.includes('trachea')) return '#b1aaa0';
  if (primitive.material === 'air') return '#a8b9b2';
  if (primitive.material === 'heart') return '#a96761';
  return '#b4937f';
}

const AnatomyInstances = memo(function AnatomyInstances({ primitives, geometry, color, opacity }: { primitives: PhantomPrimitive[]; geometry: THREE.BufferGeometry; color: string; opacity: number }) {
  const instances = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!instances.current) return;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    for (let i = 0; i < primitives.length; i++) {
      const primitive = primitives[i];
      position.set(...primitive.center).multiplyScalar(0.01);
      scale.set(...primitive.radii).multiplyScalar(0.01);
      quaternion.setFromEuler(new THREE.Euler(...(primitive.rotation ?? [0, 0, 0])));
      instances.current.setMatrixAt(i, matrix.compose(position, quaternion, scale));
    }
    instances.current.instanceMatrix.needsUpdate = true;
    instances.current.computeBoundingSphere();
  }, [primitives]);
  return <instancedMesh ref={instances} args={[geometry, undefined, primitives.length]} castShadow={opacity === 1} renderOrder={opacity < 1 ? 4 : 0}>
    <meshStandardMaterial color={color} roughness={0.66} metalness={0} transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} />
  </instancedMesh>;
});

/** Diagnostic geometry and visualization consume the same primitive anatomy. */
const InternalAnatomy = memo(function InternalAnatomy({ arms, patientSize, breathHeld, anatomy }: Pick<SimulatorState, 'arms' | 'patientSize' | 'breathHeld' | 'anatomy'>) {
  const primitives = useMemo(() => getPhantom({ arms, patientSize, breathHeld } as SimulatorState), [arms, patientSize, breathHeld]);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 24, 16), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const batches = useMemo(() => {
    const groups = new Map<string, { color: string; opacity: number; primitives: PhantomPrimitive[] }>();
    for (const primitive of primitives) {
      if (primitive.layer !== 'skeleton' && !(anatomy === 'organs' && primitive.layer === 'organs')) continue;
      const color = organColor(primitive);
      const opacity = anatomy === 'organs' && primitive.layer === 'skeleton' ? 0.24 : primitive.material === 'air' ? 0.3 : 1;
      const key = `${color}-${opacity}`;
      const group = groups.get(key);
      if (group) group.primitives.push(primitive);
      else groups.set(key, { color, opacity, primitives: [primitive] });
    }
    return [...groups.values()];
  }, [primitives, anatomy]);
  return <group>{batches.map(batch => <AnatomyInstances key={`${batch.color}-${batch.opacity}`} geometry={geometry} {...batch} />)}</group>;
});

type GaitRef = { current: { time: number; running: boolean } };

/**
 * A compact hip/knee/shoulder rig for the ambulatory patient. Its joints
 * animate the real rendered limbs: leg meshes no longer remain planted while
 * the character slides down the corridor.
 */
const PatientLocomotion = memo(function PatientLocomotion({ materials, garment, gait, bodyRef, headRef }: {
  materials: PatientMaterials; garment: 'gown' | 'outpatient'; gait: GaitRef; bodyRef?: { current: THREE.Group | null }; headRef: { current: THREE.Group | null };
}) {
  const leftThigh = useRef<THREE.Group>(null);
  const rightThigh = useRef<THREE.Group>(null);
  const leftShin = useRef<THREE.Group>(null);
  const rightShin = useRef<THREE.Group>(null);
  const leftFoot = useRef<THREE.Group>(null);
  const rightFoot = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftForearm = useRef<THREE.Group>(null);
  const rightForearm = useRef<THREE.Group>(null);
  const parts = useGeometryParts(() => [
    { id: 'thigh', geometry: sweep([[0, 0.018, 0], [0, -0.09, 0.005], [0, -0.24, 0.009], [0, -0.37, 0.017], [0, -0.405, 0.020]], [[0.08, 0.083], [0.086, 0.084], [0.072, 0.073], [0.052, 0.055], [0.049, 0.052]], 24, 36) },
    { id: 'shin', geometry: sweep([[0, 0.019, 0.018], [0, -0.065, -0.008], [0, -0.18, -0.018], [0, -0.31, 0], [0, -0.395, 0.018]], [[0.049, 0.053], [0.058, 0.061], [0.050, 0.050], [0.036, 0.040], [0.032, 0.038]], 24, 34) },
    { id: 'upper-arm', geometry: sweep([[0, 0.010, 0], [0, -0.075, 0.005], [0, -0.165, -0.003], [0, -0.259, 0]], [[0.065, 0.063], [0.059, 0.056], [0.045, 0.046], [0.036, 0.037]], 22, 30) },
    { id: 'forearm', geometry: sweep([[0, 0.016, 0], [0, -0.075, 0], [0, -0.15, 0.008], [0, -0.244, 0.018]], [[0.034, 0.036], [0.041, 0.041], [0.031, 0.031], [0.025, 0.025]], 20, 28) },
  ], []);
  const thighGeo = parts[0].geometry;
  const shinGeo = parts[1].geometry;
  const upperGeo = parts[2].geometry;
  const foreGeo = parts[3].geometry;
  const { invalidate } = useThree();
  useFrame(({ clock }, delta) => {
    const walking = gait.current.running;
    const time = walking ? gait.current.time : clock.elapsedTime;
    const pose = samplePatientPose(time, walking, garment === 'gown' ? 0.15 : 0);
    const spring = 1 - Math.exp(-Math.min(delta, 0.12) * 11);
    let settling = false;
    for (const [index, upper, shin, foot, arm, forearm] of [
      [0, leftThigh.current, leftShin.current, leftFoot.current, leftArm.current, leftForearm.current],
      [1, rightThigh.current, rightShin.current, rightFoot.current, rightArm.current, rightForearm.current],
    ] as const) {
      if (upper) { upper.rotation.x += (pose.thigh[index] - upper.rotation.x) * spring; settling ||= Math.abs(upper.rotation.x) > 0.005; }
      if (shin) { shin.rotation.x += (pose.knee[index] - shin.rotation.x) * spring; settling ||= Math.abs(shin.rotation.x) > 0.005; }
      if (foot) foot.rotation.x += (pose.ankle[index] - foot.rotation.x) * spring;
      if (arm) arm.rotation.x += (pose.shoulder[index] - arm.rotation.x) * spring;
      if (forearm) forearm.rotation.x += (pose.elbow[index] - forearm.rotation.x) * spring;
    }
    if (bodyRef?.current) {
      const breath = pose.breath * 0.0033;
      bodyRef.current.rotation.z = pose.torsoSway;
      bodyRef.current.rotation.x = pose.torsoPitch;
      bodyRef.current.scale.set(1 + breath, 1, 1 + breath * 0.55);
    }
    if (headRef.current) {
      headRef.current.rotation.y = pose.headTurn;
      headRef.current.rotation.z = pose.headTilt;
      headRef.current.rotation.x = pose.headPitch;
    }
    if (walking || settling) invalidate();
  });
  const pants = garment === 'gown' ? materials.skin : materials.trousers;
  const shirt = garment === 'gown' ? materials.fabric : materials.casualShirt;
  return <group>
    {[-1, 1].map(side => <group key={side}>
      <group ref={side < 0 ? leftThigh : rightThigh} position={[side * 0.092, 0.854, 0]}>
        <mesh geometry={thighGeo} material={pants} castShadow receiveShadow />
        <group ref={side < 0 ? leftShin : rightShin} position={[0, -0.405, 0.02]}>
          <mesh geometry={shinGeo} material={pants} castShadow receiveShadow />
          <group ref={side < 0 ? leftFoot : rightFoot} position={[0, -0.392, 0.016]}>
            <mesh position={[0, -0.003, 0.067]} scale={[0.074, 0.056, 0.14]} material={materials.footwear} castShadow receiveShadow><sphereGeometry args={[1, 20, 12]} /></mesh>
            <mesh position={[0, -0.046, 0.069]} scale={[0.078, 0.013, 0.146]} castShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#c4ccc5" roughness={0.78} /></mesh>
          </group>
        </group>
      </group>
      <group ref={side < 0 ? leftArm : rightArm} position={[side * 0.202, 1.358, 0.002]} rotation={[0, 0, side * 0.15]}>
        <mesh geometry={upperGeo} material={shirt} castShadow receiveShadow />
        <group ref={side < 0 ? leftForearm : rightForearm} position={[0, -0.258, 0]}>
          <mesh geometry={foreGeo} material={materials.skin} castShadow receiveShadow />
          <Hand materials={materials} ghost={false} side={side} wrist={[0, -0.225, 0.017]} elbow={[0, -0.025, 0]} />
        </group>
      </group>
    </group>)}
  </group>;
});

/** A patient standing at the detector remains alive at rest; a simulated
 * breath hold visibly arrests the breathing motion until released. */
function PatientStillness({ bodyRef, headRef, breathHeld }: {
  bodyRef: { current: THREE.Group | null }; headRef: { current: THREE.Group | null }; breathHeld: boolean;
}) {
  useFrame(({ clock }) => {
    const pose = samplePatientPose(clock.elapsedTime, false);
    if (bodyRef.current) {
      const expansion = breathHeld ? 0 : 0.003 * pose.breath;
      bodyRef.current.scale.set(1 + expansion, 1, 1 + expansion * 0.55);
      bodyRef.current.rotation.z = pose.torsoSway;
    }
    if (headRef.current) {
      headRef.current.rotation.y = pose.headTurn;
      headRef.current.rotation.z = pose.headTilt;
      headRef.current.rotation.x = pose.headPitch;
    }
  });
  return null;
}

/**
 * Adult procedural training phantom. Metres; soles y=0, head y=1.716, anterior +z,
 * anatomical left +x. Position/projection transforms belong to the room scene.
 */
export const PatientModel = memo(function PatientModel({ state, garment = 'gown', gait }: { state: SimulatorState; garment?: 'gown' | 'outpatient'; gait?: GaitRef }) {
  const ghost = state.anatomy !== 'surface';
  const materials = useMemo(createPatientMaterials, []);
  const movingTorso = useRef<THREE.Group>(null);
  const movingHead = useRef<THREE.Group>(null);
  useEffect(() => () => materials.dispose(), [materials]);
  return <group name="procedural-training-patient">
    <group scale={[state.patientSize, 1, state.patientSize]}>
      <group ref={movingTorso}>
        <FixedSurface ghost={ghost} materials={materials} walkingRig={!!gait && !ghost} headRef={movingHead} />
        {!ghost && (garment === 'gown' ? <HospitalGarment materials={materials} walkingRig={!!gait} /> : <OutpatientGarment materials={materials} walkingRig={!!gait} />)}
      </group>
      {gait && !ghost ? <PatientLocomotion materials={materials} garment={garment} gait={gait} bodyRef={movingTorso} headRef={movingHead} /> : <ArticulatedArms pose={state.arms} ghost={ghost} materials={materials} />}
      {!gait && !ghost && <PatientStillness bodyRef={movingTorso} headRef={movingHead} breathHeld={state.breathHeld} />}
    </group>
    {ghost && <InternalAnatomy arms={state.arms} patientSize={state.patientSize} breathHeld={state.breathHeld} anatomy={state.anatomy} />}
  </group>;
});

export default PatientModel;
