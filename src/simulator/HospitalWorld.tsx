import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { CanvasTexture, Color, DoubleSide, Group, InstancedMesh, Object3D, Shape, SRGBColorSpace, type Texture } from 'three';
import { Label } from './SceneAssets';
import type { Point3 } from './sceneGeometry';
import { useSurfaceTexture } from './SceneMaterials';
import { GamePatientActor } from './GamePatientActor';
import type { SimulatorState } from './types';

const WALL = '#e4e4dd';
const FRAME = '#657974';

function Solid({ at, size, color = WALL, metal = false, texture }: { at: Point3; size: Point3; color?: string; metal?: boolean; texture?: Texture }) {
  // Structural partitions and exterior walls never cast a hard sun silhouette
  // across an artificially enclosed clinical room.
  return <mesh position={at} castShadow={size[1] < 2.5} receiveShadow><boxGeometry args={size} /><meshStandardMaterial map={texture} bumpMap={texture} bumpScale={texture ? 0.003 : 0} color={color} roughness={metal ? 0.35 : 0.82} metalness={metal ? 0.6 : 0} /></mesh>;
}

function Surface({ at, size, ceiling = false, color = '#bcbfb9', finish }: { at: Point3; size: [number, number]; ceiling?: boolean; color?: string; finish?: 'vinyl' | 'soil' | 'rubber' }) {
  const material = finish ?? (ceiling ? 'ceiling' : 'vinyl');
  const texture = useSurfaceTexture(material);
  return <mesh position={at} rotation={[ceiling ? Math.PI / 2 : -Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={size} /><meshStandardMaterial map={texture} color={color} bumpMap={texture} bumpScale={ceiling ? 0.002 : material === 'soil' ? 0.013 : 0.004} roughness={ceiling || material === 'soil' ? 0.94 : 0.65} metalness={0.015} /></mesh>;
}

function Glazing({ x, z, width, rotation = 0 }: { x: number; z: number; width: number; rotation?: number }) {
  return <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
    <Solid at={[0, 0.23, 0]} size={[width, 0.46, 0.08]} />
    <mesh position={[0, 1.67, 0]}><planeGeometry args={[width, 2.44]} /><meshPhysicalMaterial color="#abc5bd" transparent opacity={0.18} roughness={0.18} metalness={0.25} side={DoubleSide} depthWrite={false} /></mesh>
    <Solid at={[0, 2.91, 0]} size={[width, 0.055, 0.075]} color={FRAME} metal />
    {[-1, 1].map((side) => <Solid key={side} at={[side * width / 2, 1.7, 0]} size={[0.045, 2.45, 0.075]} color={FRAME} metal />)}
    <Solid at={[0, 1.05, 0]} size={[width, 0.027, 0.04]} color="#cad4cd" />
  </group>;
}

function CeilingLight({ x, z, length = 1.8, illuminate = false }: { x: number; z: number; length?: number; illuminate?: boolean }) {
  return <group position={[x, 3.14, z]}>
    <mesh position={[0, -0.002, 0]}><boxGeometry args={[length, 0.055, 0.45]} /><meshStandardMaterial color="#bdc8c2" metalness={0.28} roughness={0.36} /></mesh>
    <mesh position={[0, -0.033, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[length - 0.055, 0.365]} /><meshStandardMaterial color="#e8ede7" emissive="#fff9e9" emissiveIntensity={0.6} toneMapped={false} roughness={0.51} /></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[0, -0.035, side * 0.16]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[length - 0.11, 0.035]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>)}
    {illuminate && <pointLight position={[0, -0.38, 0]} color="#f9faec" intensity={2.8} distance={4.8} decay={2} />}
  </group>;
}

function CeilingCassetteGrid() {
  return <group>
    {[-2.10, -0.40, 1.30, 3.0, 4.70, 6.40, 8.12].map(x => <Solid key={x} at={[x, 3.139, 4.75]} size={[0.010, 0.012, 2.90]} color="#c1c7be" />)}
    {[3.42, 4.72, 6.09].map(z => <Solid key={z} at={[2.50, 3.14, z]} size={[11.55, 0.014, 0.011]} color="#c1c7be" />)}
  </group>;
}

function SlidingDoor({ closed, open, shut, children }: { closed: boolean; open: Point3; shut: Point3; children: React.ReactNode }) {
  const group = useRef<Group>(null);
  const { invalidate } = useThree();
  const initial = useRef(false);
  useFrame((_, delta) => {
    const mesh = group.current;
    if (!mesh) return;
    const point = closed ? shut : open;
    if (!initial.current) { mesh.position.set(...point); initial.current = true; return; }
    const difference = Math.hypot(mesh.position.x - point[0], mesh.position.y - point[1], mesh.position.z - point[2]);
    if (difference < 0.001) return;
    const alpha = 1 - Math.exp(-9 * Math.min(delta, 0.1));
    mesh.position.set(mesh.position.x + (point[0] - mesh.position.x) * alpha, mesh.position.y + (point[1] - mesh.position.y) * alpha, mesh.position.z + (point[2] - mesh.position.z) * alpha);
    if (Math.hypot(mesh.position.x - point[0], mesh.position.z - point[2]) < 0.003) mesh.position.set(...point);
    invalidate();
  });
  useEffect(() => { invalidate(); }, [closed, invalidate]);
  return <group ref={group} position={closed ? shut : open}>{children}</group>;
}

function Bench({ x, z, length = 1.35, wood = false }: { x: number; z: number; length?: number; wood?: boolean }) {
  return <group position={[x, 0, z]}>
    <Solid at={[0, 0.47, 0]} size={[0.5, 0.11, length]} color={wood ? '#99836b' : '#7a948c'} />
    <Solid at={[-0.22, 0.76, 0]} size={[0.07, 0.53, length]} color={wood ? '#99836b' : '#7a948c'} />
    {[-1, 1].map((side) => <Solid key={side} at={[0, 0.235, side * (length / 2 - 0.14)]} size={[0.37, 0.4, 0.055]} color="#6e7974" metal />)}
    {wood && Array.from({ length: 10 }, (_, i) => <Solid key={i} at={[0, 0.527, (i - 4.5) * length / 10]} size={[0.5, 0.008, 0.012]} color="#685d50" />)}
  </group>;
}

/** Wall fixtures stay above walking height or within existing furniture footprints. */
function WallVent({ at, rotation = 0 }: { at: Point3; rotation?: number }) {
  return <group position={at} rotation={[0, rotation, 0]}>
    <Solid at={[0, 0, 0]} size={[0.63, 0.32, 0.026]} color="#e0e6e0" metal />
    <Solid at={[0, 0, 0.016]} size={[0.55, 0.245, 0.009]} color="#687d77" />
    {Array.from({ length: 7 }, (_, i) => <Solid key={i} at={[0, -0.105 + i * 0.035, 0.032]} size={[0.50, 0.018, 0.008]} color="#b6c9c0" metal />)}
  </group>;
}

function WallClock({ at, rotation = 0 }: { at: Point3; rotation?: number }) {
  return <group position={at} rotation={[0, rotation, 0]}>
    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.185, 0.185, 0.038, 32]} /><meshStandardMaterial color="#607971" metalness={0.35} roughness={0.4} /></mesh>
    <mesh position={[0, 0, 0.027]}><circleGeometry args={[0.169, 32]} /><meshStandardMaterial color="#f4f1e7" roughness={0.75} /></mesh>
    {[0, 1, 2, 3].map((index) => <Solid key={index} at={[Math.sin(index * Math.PI / 2) * 0.131, Math.cos(index * Math.PI / 2) * 0.131, 0.036]} size={[0.013, 0.024, 0.003]} color="#4c6860" />)}
    <Solid at={[0.034, 0.028, 0.039]} size={[0.011, 0.10, 0.005]} color="#334b46" />
    <Solid at={[-0.025, -0.005, 0.042]} size={[0.075, 0.008, 0.006]} color="#334b46" />
    <mesh position={[0, 0, 0.045]}><sphereGeometry args={[0.012, 10, 8]} /><meshStandardMaterial color="#506e63" /></mesh>
  </group>;
}

/** A draped, washable hospital gown on a hook, with visible neck opening and sleeve shape. */
function HangingGown() {
  const shape = useMemo(() => new Shape()
    .moveTo(-0.125, 0.405).lineTo(-0.265, 0.27).lineTo(-0.365, 0.085)
    .lineTo(-0.245, 0.022).lineTo(-0.203, 0.158).lineTo(-0.30, -0.48)
    .lineTo(0.30, -0.48).lineTo(0.203, 0.158).lineTo(0.245, 0.022)
    .lineTo(0.365, 0.085).lineTo(0.265, 0.27).lineTo(0.125, 0.405)
    .lineTo(0.070, 0.335).lineTo(-0.070, 0.335).closePath(), []);
  return <group position={[-5.95, 1.43, 3.345]}>
    <Solid at={[0, 0.52, -0.035]} size={[0.045, 0.19, 0.05]} color="#82968d" metal />
    <Solid at={[0, 0.43, 0]} size={[0.57, 0.015, 0.035]} color="#a2b3ad" metal />
    <mesh castShadow receiveShadow><extrudeGeometry args={[shape, { depth: 0.02, steps: 1, bevelEnabled: true, bevelSegments: 1, bevelThickness: 0.008, bevelSize: 0.006 }]} /><meshStandardMaterial color="#b0cec6" roughness={0.95} /></mesh>
    <Solid at={[0, -0.052, 0.031]} size={[0.008, 0.57, 0.005]} color="#d9e7de" />
    {[-0.16, 0.16].map((x) => <Solid key={x} at={[x, -0.26, 0.029]} size={[0.009, 0.33, 0.004]} color="#9cbab1" />)}
    <Solid at={[0, -0.482, 0.036]} size={[0.59, 0.013, 0.006]} color="#e2ebe4" />
  </group>;
}

// Teaching references: IAEA Diagnostic Radiology Physics, ch. 6, sections 6.2.3 and 6.3.5.1.
// https://www-pub.iaea.org/MTCD/Publications/PDF/Pub1564webNew-74666420.pdf
// Blur is expressed at the detector plane; the demagnified object-plane blur is divided by m.
function LearningBoard({ topic, at, rotation = 0 }: { topic: 'distance' | 'sharpness' | 'field'; at: Point3; rotation?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1440; canvas.height = 900;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#e8eae2'; ctx.fillRect(0, 0, 1440, 900);
      ctx.fillStyle = '#506a61'; ctx.font = '500 24px Arial';
      ctx.fillText('RADIOGRAPHY  /  DISCOVERY GALLERY', 74, 76);
      ctx.fillStyle = '#253e36'; ctx.font = '500 66px Arial';
      const titles = { distance: 'Distance changes intensity.', sharpness: 'Geometry shapes detail.', field: 'Keep the field purposeful.' };
      ctx.fillText(titles[topic], 74, 176);
      ctx.font = '30px Arial'; ctx.fillStyle = '#52645b';
      const subtitles = { distance: 'The inverse-square law for an ideal point source.', sharpness: 'A smaller focal spot and lower OID reduce geometric blur.', field: 'Collimate to the anatomy required by your projection.' };
      ctx.fillText(subtitles[topic], 76, 245);
      ctx.lineWidth = 4;
      if (topic === 'distance') {
        const x = 160, y = 490;
        ctx.strokeStyle = '#74988b';
        [170, 350, 540].forEach((r) => { ctx.beginPath(); ctx.arc(x, y, r, -0.40, 0.40); ctx.stroke(); });
        ctx.fillStyle = '#345b4c'; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
        [380, 750, 1120].forEach((cx, i) => {
          ctx.fillStyle = ['#426d59', '#95b3a4', '#c3d3c6'][i]; ctx.fillRect(cx - 68, 402, 136, 176);
          ctx.fillStyle = '#2e493c'; ctx.font = '500 44px Arial'; ctx.fillText(['100%', '25%', '11%'][i], cx - 62, 655);
          ctx.font = '28px Arial'; ctx.fillText(`${i + 1} m`, cx - 23, 703);
        });
        ctx.font = '34px Arial'; ctx.fillStyle = '#345547'; ctx.fillText('I₂ / I₁ = (r₁ / r₂)²', 74, 816);
      } else if (topic === 'sharpness') {
        ctx.fillStyle = '#365749'; ctx.fillRect(124, 423, 22, 96);
        ctx.fillStyle = '#96a79b'; ctx.fillRect(635, 395, 34, 152);
        ctx.fillStyle = '#d0d9cf'; ctx.fillRect(1100, 330, 18, 280);
        ctx.strokeStyle = '#729981';
        [[423, 395, 370], [519, 547, 575], [423, 547, 650], [519, 395, 280]].forEach(([sy, oy, ey]) => {
          ctx.beginPath(); ctx.moveTo(146, sy); ctx.lineTo(652, oy); ctx.lineTo(1100, ey); ctx.stroke();
        });
        ctx.fillStyle = '#43604f'; ctx.font = '28px Arial';
        ctx.fillText('FOCAL SPOT', 80, 720); ctx.fillText('OBJECT', 595, 720); ctx.fillText('DETECTOR', 1050, 720);
        ctx.font = '34px Arial'; ctx.fillText('Detector-plane blur = focal spot × OID / SOD', 74, 793);
        ctx.font = '24px Arial'; ctx.fillText('OID: object-to-detector distance  ·  SOD: source-to-object distance', 74, 835);
      } else {
        [[390, 390, 320], [920, 402, 174]].forEach(([cx, top, extent]) => {
          ctx.fillStyle = '#becfc1'; ctx.fillRect(cx - 190, 360, 380, 350);
          ctx.fillStyle = '#e2dbbd'; ctx.fillRect(cx - extent / 2, top, extent, 274);
          ctx.strokeStyle = '#466b54'; ctx.lineWidth = 4; ctx.strokeRect(cx - extent / 2, top, extent, 274);
          ctx.fillStyle = '#82998c'; ctx.beginPath(); ctx.ellipse(cx, 540, 55, 118, 0, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#345547'; ctx.font = '30px Arial';
        ctx.fillText('WIDE FIELD', 270, 765); ctx.fillText('MATCHED FIELD', 785, 765);
        ctx.font = '27px Arial'; ctx.fillText('A smaller irradiated field generally reduces scatter production.', 74, 840);
      }
      ctx.fillStyle = '#62756a'; ctx.font = '18px Arial'; ctx.fillText('Reference: IAEA · Diagnostic Radiology Physics · Chapter 6', 74, 879);
    }
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace;
    return map;
  }, [topic]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group position={at} rotation={[0, rotation, 0]}>
    <Solid at={[0, 0, -0.025]} size={[2.86, 1.81, 0.045]} color="#64756a" />
    <mesh><planeGeometry args={[2.8, 1.75]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
  </group>;
}

function GardenTree({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0.30, z]}>
    <mesh position={[0, 0.85, 0]} castShadow><cylinderGeometry args={[0.06, 0.09, 1.7, 9]} /><meshStandardMaterial color="#786855" roughness={1} /></mesh>
    {[[0, 2.0, 0, 0.68], [0.45, 1.75, 0.07, 0.50], [-0.4, 1.82, 0.13, 0.55], [0.05, 1.95, -0.40, 0.50], [0.1, 2.52, 0.07, 0.42]].map(([cx, cy, cz, scale], i) => <mesh key={i} position={[cx, cy, cz]} scale={[scale, scale * 1.12, scale]} castShadow><icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color={i % 2 ? '#728975' : '#8b9d78'} roughness={0.98} /></mesh>)}
  </group>;
}

/** Low groundcover is batched into one draw call and stays inside the planted bed. */
function GardenGroundcover() {
  const mesh = useRef<InstancedMesh>(null);
  const { invalidate } = useThree();
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const instance = new Object3D();
    const colors = ['#718c70', '#889a74', '#58785f', '#9ca887', '#637e6a'];
    for (let index = 0; index < 72; index++) {
      const col = index % 12, row = Math.floor(index / 12);
      const noise = Math.sin((index + 1) * 79.23) * 1043.13;
      const variation = noise - Math.floor(noise);
      instance.position.set(3.32 + col * 0.25 + variation * 0.04, 0.355, 9.39 + row * 0.188 + (variation - 0.5) * 0.055);
      instance.scale.set(0.065 + variation * 0.065, 0.075 + variation * 0.09, 0.08 + variation * 0.07);
      instance.rotation.set(0, variation * Math.PI, 0);
      instance.updateMatrix();
      mesh.current.setMatrixAt(index, instance.matrix);
      mesh.current.setColorAt(index, new Color(colors[index % colors.length]));
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    invalidate();
  }, [invalidate]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, 72]} receiveShadow frustumCulled={false}>
    <icosahedronGeometry args={[1, 1]} />
    <meshStandardMaterial color="#dce4d2" roughness={0.95} />
  </instancedMesh>;
}

/** Bespoke wall joinery for the registration bay. All geometry is recessed at the
 * existing east wall: this changes what a visitor sees, not where they can walk. */
function ReceptionBackdrop() {
  const oak = useSurfaceTexture('oak');
  const acoustic = useSurfaceTexture('acoustic');
  return <group position={[8.365, 0, 4.81]} rotation={[0, -Math.PI / 2, 0]}>
    <RoundedBox position={[0, 1.57, 0.024]} args={[2.56, 2.96, 0.037]} radius={0.015} smoothness={2} receiveShadow>
      <meshStandardMaterial map={oak} color="#d6cfc2" roughness={0.76} bumpMap={oak} bumpScale={0.003} />
    </RoundedBox>
    {/* Dark acoustic header carries the complete wayfinding system. */}
    <RoundedBox position={[0, 2.60, 0.070]} args={[2.40, 0.54, 0.052]} radius={0.016} smoothness={2}>
      <meshStandardMaterial map={acoustic} color="#456258" roughness={0.94} bumpMap={acoustic} bumpScale={0.003} />
    </RoundedBox>
    <Solid at={[-1.06, 2.60, 0.107]} size={[0.038, 0.32, 0.008]} color="#f1ddbb" />
    <Label title="RADIOLOGY   /   RECEPTION" detail="PATIENT SERVICES                                 CHECK-IN  01" position={[0.055, 2.63, 0.109]} width={2.15} height={0.29} dark />
    <Solid at={[0, 2.286, 0.089]} size={[2.36, 0.018, 0.014]} color="#f3d9aa" />
    <mesh position={[0, 2.264, 0.093]}><planeGeometry args={[2.30, 0.029]} /><meshBasicMaterial color="#ffe1aa" toneMapped={false} transparent opacity={0.5} /></mesh>
    {/* Narrow real-oak battens and a matte upholstered acoustic insert. */}
    <RoundedBox args={[1.10, 1.02, 0.023]} position={[-0.53, 1.53, 0.06]} radius={0.015} smoothness={2}>
      <meshStandardMaterial map={acoustic} color="#b7c4b6" roughness={0.95} bumpMap={acoustic} bumpScale={0.004} />
    </RoundedBox>
    {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[-1.18 + i * 0.133, 1.5, 0.077]}>
      <boxGeometry args={[0.018, 1.79, 0.027]} />
      <meshStandardMaterial map={oak} color="#b8a18b" roughness={0.72} bumpMap={oak} bumpScale={0.002} />
    </mesh>)}
    <RoundedBox args={[0.90, 0.78, 0.021]} radius={0.012} smoothness={2} position={[0.69, 1.55, 0.073]}>
      <meshStandardMaterial color="#f3f1e9" roughness={0.91} />
    </RoundedBox>
    <Solid at={[0.69, 1.915, 0.094]} size={[0.85, 0.055, 0.006]} color="#65887b" />
    <Label title="YOUR VISIT" detail="REGISTRATION   →   PREPARATION   →   IMAGING" position={[0.72, 1.715, 0.092]} width={0.78} height={0.26} />
    <Label title="Please have your appointment details ready" position={[0.72, 1.355, 0.092]} width={0.74} height={0.10} small />
    <Solid at={[0, 0.875, 0.084]} size={[2.32, 0.045, 0.07]} color="#947a62" />
    <Solid at={[0, 0.30, 0.080]} size={[2.34, 0.10, 0.043]} color="#a9b4a9" />
    <Solid at={[0, 0.095, 0.067]} size={[2.34, 0.16, 0.042]} color="#81978a" />
  </group>;
}

function ReceptionDeskSlats() {
  const oak = useSurfaceTexture('oak');
  const mesh = useRef<InstancedMesh>(null);
  const { invalidate } = useThree();
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const slat = new Object3D();
    for (let i = 0; i < 20; i++) {
      slat.position.set(7.289, 0.51, 3.88 + i * 0.093);
      slat.updateMatrix();
      mesh.current.setMatrixAt(i, slat.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [invalidate]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, 20]} receiveShadow>
    <boxGeometry args={[0.028, 0.80, 0.059]} />
    <meshStandardMaterial map={oak} color="#bbaf9d" roughness={0.82} bumpMap={oak} bumpScale={0.002} />
  </instancedMesh>;
}

/** Adult receptionist with subtle face construction, a real scrub silhouette,
 * and arms resting at the station. Kept inside the existing staffed desk. */
function ReceptionStaff() {
  const skinTexture = useSurfaceTexture('skin');
  const hairTexture = useSurfaceTexture('hair');
  const shadowSkin = '#97725d';
  const scrub = '#496d68';
  return <group position={[8.08, 0, 5.09]} rotation={[0, -Math.PI / 2, 0]}>
    {/* Lower body is screened naturally by the counter; legs and shoes survive other viewpoints. */}
    {[-0.094, 0.094].map((x) => <group key={x}>
      <mesh position={[x, 0.55, -0.015]} scale={[0.084, 0.37, 0.091]} castShadow><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#364b50" roughness={0.92} /></mesh>
      <mesh position={[x, 0.11, 0.085]} scale={[0.098, 0.090, 0.160]} castShadow><sphereGeometry args={[1, 16, 10]} /><meshStandardMaterial color="#303637" roughness={0.64} /></mesh>
    </group>)}
    {/* Curved shoulders, natural neck transition and a tailored scrub tunic. */}
    <mesh position={[0, 1.18, 0]} scale={[0.193, 0.318, 0.139]} castShadow receiveShadow><sphereGeometry args={[1, 32, 24]} /><meshStandardMaterial color={scrub} roughness={0.9} /></mesh>
    <mesh position={[0, 0.93, 0.006]} scale={[0.151, 0.123, 0.123]} castShadow><sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial color={scrub} roughness={0.92} /></mesh>
    <mesh position={[0, 1.452, 0.005]} castShadow><cylinderGeometry args={[0.052, 0.062, 0.137, 18]} /><meshStandardMaterial map={skinTexture} roughness={0.86} /></mesh>
    {[-1, 1].map((side) => <group key={side}>
      <mesh position={[side * 0.178, 1.313, -0.002]} scale={[0.075, 0.111, 0.113]} castShadow><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color={scrub} roughness={0.9} /></mesh>
      <mesh position={[side * 0.214, 1.198, 0.084]} rotation={[-0.49, 0, side * 0.18]} castShadow>
        <capsuleGeometry args={[0.058, 0.19, 8, 16]} />
        <meshStandardMaterial color={scrub} roughness={0.88} />
      </mesh>
      <mesh position={[side * 0.224, 1.080, 0.160]} rotation={[-0.68, 0, side * 0.12]} castShadow>
        <capsuleGeometry args={[0.043, 0.175, 8, 16]} />
        <meshStandardMaterial map={skinTexture} roughness={0.89} />
      </mesh>
      <mesh position={[side * 0.229, 1.007, 0.252]} scale={[0.060, 0.023, 0.079]} castShadow><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial map={skinTexture} roughness={0.90} /></mesh>
      {/* Natural ear volume with a recess rather than protruding round knobs. */}
      <mesh position={[side * 0.101, 1.566, 0.002]} scale={[0.020, 0.042, 0.020]} castShadow><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial map={skinTexture} roughness={0.91} /></mesh>
      <mesh position={[side * 0.111, 1.562, 0.017]} scale={[0.006, 0.018, 0.005]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color={shadowSkin} roughness={1} /></mesh>
    </group>)}
    {/* Smaller, proportionate head with subtle cheek, jaw and cranial mass. */}
    <mesh position={[0, 1.584, 0]} scale={[0.097, 0.127, 0.088]} castShadow receiveShadow><sphereGeometry args={[1, 36, 24]} /><meshStandardMaterial map={skinTexture} bumpMap={skinTexture} bumpScale={0.00045} roughness={0.87} /></mesh>
    <mesh position={[0, 1.517, -0.003]} scale={[0.071, 0.043, 0.064]} castShadow><sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial map={skinTexture} roughness={0.89} /></mesh>
    {/* Face uses small anatomical planes and low-contrast eyes to avoid mascot styling. */}
    {[-1, 1].map((side) => <group key={`features-${side}`}>
      <mesh position={[side * 0.041, 1.583, 0.081]} scale={[0.020, 0.007, 0.005]}><sphereGeometry args={[1, 20, 12]} /><meshStandardMaterial color="#8b7869" roughness={0.85} /></mesh>
      <mesh position={[side * 0.040, 1.585, 0.085]} scale={[0.006, 0.006, 0.003]}><sphereGeometry args={[1, 16, 10]} /><meshStandardMaterial color="#323833" roughness={0.43} /></mesh>
      <mesh position={[side * 0.040, 1.608, 0.082]} rotation={[0, 0, side * 0.06]} scale={[0.024, 0.0025, 0.004]}><sphereGeometry args={[1, 14, 8]} /><meshStandardMaterial color="#51483f" roughness={1} /></mesh>
      <mesh position={[side * 0.044, 1.542, 0.071]} scale={[0.025, 0.009, 0.007]}><sphereGeometry args={[1, 14, 8]} /><meshStandardMaterial color="#b18972" roughness={1} /></mesh>
    </group>)}
    <mesh position={[0, 1.555, 0.093]} scale={[0.013, 0.030, 0.019]} castShadow><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color="#aa7e66" roughness={0.89} /></mesh>
    <mesh position={[0, 1.532, 0.102]} scale={[0.019, 0.007, 0.009]}><sphereGeometry args={[1, 18, 10]} /><meshStandardMaterial map={skinTexture} roughness={0.90} /></mesh>
    <mesh position={[0, 1.499, 0.084]} scale={[0.024, 0.002, 0.003]}><sphereGeometry args={[1, 16, 8]} /><meshStandardMaterial color="#956b61" roughness={0.95} /></mesh>
    {/* Layered hairline, temples and slightly asymmetric top, no sphere helmet. */}
    <mesh position={[0, 1.686, -0.013]} scale={[0.104, 0.046, 0.093]} castShadow><sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial map={hairTexture} roughness={0.91} /></mesh>
    <mesh position={[-0.035, 1.668, 0.040]} rotation={[0, 0, -0.14]} scale={[0.064, 0.024, 0.058]}><sphereGeometry args={[1, 24, 12]} /><meshStandardMaterial map={hairTexture} roughness={0.91} /></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[side * 0.081, 1.638, -0.015]} scale={[0.026, 0.078, 0.078]} castShadow><sphereGeometry args={[1, 18, 12]} /><meshStandardMaterial map={hairTexture} roughness={0.93} /></mesh>)}
    {/* V neckline, layered cuffs, seams and name badge anchor the clothing scale. */}
    <mesh position={[0, 1.405, 0.116]} rotation={[0, 0, Math.PI]}><coneGeometry args={[0.068, 0.091, 3]} /><meshStandardMaterial color="#d1ad92" roughness={0.93} /></mesh>
    <Solid at={[0, 1.12, 0.140]} size={[0.003, 0.28, 0.003]} color="#89a39b" />
    <Solid at={[-0.094, 1.065, 0.128]} size={[0.10, 0.010, 0.008]} color="#9ab0a8" />
    <Solid at={[0.110, 1.317, 0.112]} size={[0.086, 0.058, 0.010]} color="#d6ded5" />
    <Solid at={[0.11, 1.316, 0.121]} size={[0.057, 0.009, 0.003]} color="#62796f" />
    <Solid at={[0.11, 1.302, 0.121]} size={[0.052, 0.006, 0.003]} color="#a1b9ab" />
    <mesh position={[-0.145, 1.32, 0.133]}><circleGeometry args={[0.021, 20]} /><meshStandardMaterial color="#cdd9d2" metalness={0.4} roughness={0.4} /></mesh>
  </group>;
}

/** Printed clinical orientation panel with a deliberate editorial hierarchy.
 * This is a decorative information display and never changes study data. */
function ClinicalOrientationPoster() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 1072;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f6f5f0'; ctx.fillRect(0, 0, 768, 1072);
      ctx.fillStyle = '#234e46'; ctx.fillRect(0, 0, 768, 114);
      ctx.fillStyle = '#e6f1e9'; ctx.font = '600 27px Arial'; ctx.fillText('RADIOLOGY   /   01', 47, 68);
      ctx.fillStyle = '#1f3834'; ctx.font = '600 59px Arial'; ctx.fillText('Your examination', 48, 201);
      ctx.font = '29px Arial'; ctx.fillStyle = '#74847a'; ctx.fillText('A calm, clear pathway through imaging.', 49, 248);
      ctx.fillStyle = '#e0e9df'; ctx.fillRect(47, 291, 674, 354);
      // Geometric patient / receptor / tube illustration, deliberately educational.
      ctx.strokeStyle = '#71968b'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(365, 386, 49, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(293, 477); ctx.quadraticCurveTo(364, 426, 441, 477); ctx.lineTo(474, 610); ctx.lineTo(260, 610); ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = '#b7cec4'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(364, 478); ctx.lineTo(364, 591); ctx.stroke();
      ctx.strokeRect(526, 370, 82, 192); ctx.strokeRect(134, 347, 72, 116);
      ctx.beginPath(); ctx.moveTo(206, 409); ctx.lineTo(291, 454); ctx.moveTo(439, 454); ctx.lineTo(526, 461); ctx.stroke();
      ctx.font = '600 27px Arial'; ctx.fillStyle = '#2e534a';
      [['01', 'Check in at reception'], ['02', 'Prepare for your examination'], ['03', 'Follow your radiographer']].forEach(([step, copy], index) => {
        const y = 720 + index * 100;
        ctx.strokeStyle = '#d1d9d0'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(48, y + 61); ctx.lineTo(717, y + 61); ctx.stroke();
        ctx.fillStyle = '#709889'; ctx.fillText(step, 51, y);
        ctx.fillStyle = '#304842'; ctx.font = '28px Arial'; ctx.fillText(copy, 124, y);
      });
      ctx.fillStyle = '#8b968b'; ctx.font = '20px Arial';
      ctx.fillText('UNIVERSITY TEACHING HOSPITAL   •   EDUCATIONAL MODEL', 50, 1030);
    }
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group position={[6.72, 1.54, 3.285]}>
    <RoundedBox args={[1.29, 1.83, 0.052]} radius={0.018} smoothness={3} castShadow>
      <meshStandardMaterial color="#7f948c" roughness={0.33} metalness={0.3} />
    </RoundedBox>
    <mesh position={[0, 0, 0.03]}><planeGeometry args={[1.22, 1.74]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
    <Solid at={[0, -0.93, 0.033]} size={[1.20, 0.015, 0.032]} color="#b2c1b6" metal />
  </group>;
}

function PatientChangingRoom({ doorClosed, registered, gownHanded, patientPrepared }: { doorClosed: boolean; registered: boolean; gownHanded: boolean; patientPrepared: boolean }) {
  const plaster = useSurfaceTexture('plaster');
  return <group>
    <Surface at={[-5.0, -0.015, 4.75]} size={[3.2, 3]} color="#c4d0c9" />
    <Surface at={[-5.0, 3.20, 4.75]} size={[3.2, 3]} ceiling color="#f4f2e9" />
    <Solid at={[-6.60, 1.6, 4.75]} size={[0.12, 3.2, 3]} texture={plaster} />
    <Solid at={[-5.0, 1.6, 3.25]} size={[3.2, 3.2, 0.12]} texture={plaster} />
    <Solid at={[-5.0, 1.6, 6.25]} size={[3.2, 3.2, 0.12]} texture={plaster} />
    <Solid at={[-3.44, 1.6, 3.745]} size={[0.12, 3.2, 0.99]} texture={plaster} />
    <Solid at={[-3.44, 1.6, 5.855]} size={[0.12, 3.2, 0.79]} texture={plaster} />
    <Solid at={[-3.44, 2.68, 4.85]} size={[0.12, 1.04, 1.22]} texture={plaster} />
    <Solid at={[-3.415, 1.09, 4.245]} size={[0.08, 2.18, 0.048]} color="#758e84" metal />
    <Solid at={[-3.415, 1.09, 5.455]} size={[0.08, 2.18, 0.048]} color="#758e84" metal />
    <Solid at={[-3.415, 2.17, 4.85]} size={[0.08, 0.065, 1.25]} color="#758e84" metal />
    <Solid at={[-3.43, -0.003, 4.85]} size={[0.19, 0.008, 1.19]} color="#a2aea7" metal />
    <Solid at={[-5.0, 0.10, 3.34]} size={[3.02, 0.17, 0.032]} color="#98aaa0" />
    <Solid at={[-5.0, 0.10, 6.16]} size={[3.02, 0.17, 0.032]} color="#98aaa0" />
    <Solid at={[-6.52, 0.10, 4.75]} size={[0.03, 0.17, 2.88]} color="#98aaa0" />
    <Solid at={[-6.515, 1.08, 4.10]} size={[0.035, 0.09, 1.6]} color="#b9c9be" />
    <Solid at={[-6.515, 1.08, 5.70]} size={[0.035, 0.09, 0.84]} color="#b9c9be" />
    <CeilingLight x={-4.9} z={4.62} length={1.45} illuminate />
    <WallVent at={[-4.65, 2.91, 3.322]} />
    <SlidingDoor closed={doorClosed} open={[-3.46, 0, 3.71]} shut={[-3.46, 0, 4.85]}>
      <Solid at={[0, 1.08, 0]} size={[0.068, 2.16, 1.16]} color="#a6b8ac" />
      <Solid at={[-0.045, 0.5, 0.33]} size={[0.018, 0.14, 0.026]} color="#526c68" metal />
      <Solid at={[-0.045, 1.72, 0]} size={[0.024, 0.21, 0.80]} color="#dfe6dc" />
    </SlidingDoor>
    <Label title="PATIENT CHANGING" detail="PRIVATE / PREPARE FOR EXAMINATION" position={[-3.32, 2.85, 4.87]} rotation={[0, Math.PI / 2, 0]} width={1.15} height={0.24} />
    {[-4.05, -4.55, -5.05].map((x, index) => <group key={x}>
      <Solid at={[x, 1.03, 3.67]} size={[0.45, 2.06, 0.43]} color={index % 2 ? '#8a9e94' : '#9db4a6'} metal />
      <Solid at={[x, 0.115, 3.904]} size={[0.40, 0.075, 0.018]} color="#607c72" metal />
      {Array.from({ length: 4 }, (_, slot) => <Solid key={slot} at={[x, 0.38 + slot * 0.048, 3.899]} size={[0.25, 0.014, 0.011]} color="#cbded0" metal />)}
      <Solid at={[x, 1.14, 3.912]} size={[0.19, 0.075, 0.026]} color="#c4d4ca" metal />
      <Solid at={[x, 1.9, 3.913]} size={[0.34, 0.055, 0.025]} color="#617a6d" metal />
      <Label title={`0${index + 1}`} position={[x - 0.04, 1.74, 3.915]} width={0.19} height={0.075} small />
    </group>)}
    <Solid at={[-5.95, 2.04, 3.37]} size={[0.86, 0.035, 0.15]} color="#94aaa0" metal />
    <Label title="CLEAN GOWNS" detail="REMOVE METAL OBJECTS / KEEP BELONGINGS SECURE" position={[-5.98, 2.27, 3.38]} width={0.96} height={0.23} />
    {!gownHanded && <HangingGown />}
    <Solid at={[-5.00, 0.40, 5.70]} size={[0.91, 0.12, 0.36]} color="#8fa39c" />
    {[-5.34, -4.66].map(x => <Solid key={x} at={[x, 0.20, 5.70]} size={[0.07, 0.38, 0.26]} color="#657b72" metal />)}
    <Solid at={[-5.93, 0.82, 5.62]} size={[0.57, 0.15, 0.52]} color="#e4e8e3" />
    <Solid at={[-5.93, 0.75, 5.61]} size={[0.38, 0.02, 0.30]} color="#a8bcb3" metal />
    <Solid at={[-5.93, 1.06, 5.90]} size={[0.035, 0.38, 0.04]} color="#7a928a" metal />
    <Solid at={[-5.93, 1.24, 5.80]} size={[0.22, 0.035, 0.04]} color="#7a928a" metal />
    <group position={[-6.517, 1.84, 5.77]} rotation={[0, Math.PI / 2, 0]}>
      <Solid at={[0, 0, 0]} size={[0.73, 0.79, 0.042]} color="#cdd9d1" />
      <Solid at={[0, 0, 0.026]} size={[0.64, 0.7, 0.005]} color="#789997" metal />
      <Solid at={[0, -0.43, 0.065]} size={[0.74, 0.042, 0.16]} color="#edf0e8" />
    </group>
    <Solid at={[-5.92, 0.99, 5.42]} size={[0.22, 0.024, 0.14]} color="#a7b7ac" metal />
    <mesh position={[-5.94, 0.995, 5.41]}><cylinderGeometry args={[0.058, 0.058, 0.075, 16]} /><meshStandardMaterial color="#e1e6dd" roughness={0.85} /></mesh>
    <Solid at={[-6.55, 1.39, 5.13]} size={[0.095, 0.33, 0.27]} color="#e7ebe3" />
    <Solid at={[-6.495, 1.25, 5.13]} size={[0.018, 0.075, 0.125]} color="#94a99c" metal />
    <Solid at={[-4.02, 1.26, 6.14]} size={[0.19, 0.38, 0.12]} color="#d7e6df" />
    <Solid at={[-4.02, 1.41, 6.075]} size={[0.13, 0.042, 0.01]} color="#82a998" />
    <Solid at={[-4.02, 1.12, 6.07]} size={[0.11, 0.025, 0.026]} color="#748e82" metal />
    <Label title="HAND SANITIZER" position={[-4.14, 1.63, 6.17]} rotation={[0, Math.PI, 0]} width={0.69} height={0.12} small />
    <mesh position={[-5.55, 1.75, 5.53]}><planeGeometry args={[0.20, 0.38]} /><meshStandardMaterial color="#97ada2" emissive="#789e96" emissiveIntensity={0.18} /></mesh>
    {/* Opaque privacy screen with a partial opening, rather than a see-through booth. */}
    <Solid at={[-5.95, 2.39, 4.57]} size={[1.24, 0.047, 0.06]} color="#7b958e" metal />
    {Array.from({ length: 15 }, (_, index) => <mesh key={index} position={[-6.48 + index * 0.077, 1.18, 4.57 + (index % 2 ? 0.037 : -0.037)]} castShadow receiveShadow>
      <boxGeometry args={[0.078, 2.36, 0.026]} /><meshStandardMaterial color={index % 2 ? '#d3dfd7' : '#e1e7dd'} roughness={0.99} side={DoubleSide} />
    </mesh>)}
    <Solid at={[-5.95, 0.11, 4.57]} size={[1.19, 0.04, 0.07]} color="#adb9b1" />
    <Solid at={[-5.0, 0.004, 5.72]} size={[0.85, 0.01, 0.31]} color="#607d73" />
    {Array.from({ length: 5 }, (_, i) => <Solid key={i} at={[-5.31 + i * 0.15, 0.011, 5.72]} size={[0.012, 0.003, 0.27]} color="#b8cdc0" />)}
    {registered && patientPrepared ? <group>
      <Solid at={[-4.43, 0.50, 5.71]} size={[0.47, 0.06, 0.28]} color="#e5e3d7" />
      <Label title="GOWN READY" detail="PATIENT TO IMAGING 01" position={[-3.51, 1.47, 5.94]} rotation={[0, -Math.PI / 2, 0]} width={0.8} height={0.21} />
    </group> : null}
    <Label title={patientPrepared ? '01 / PATIENT PREPARED' : '01 / PRIVACY + GOWN'} detail={patientPrepared ? 'RETURN TO THE IMAGING ROOM' : 'AIM AT GOWN STATION AND PRESS E'} position={[-4.65, 1.87, 6.175]} rotation={[0, Math.PI, 0]} width={1.9} height={0.34} />
  </group>;
}

function Reception({ registered }: { registered: boolean }) {
  const quartz = useSurfaceTexture('quartz');
  return <group>
    <ReceptionBackdrop />
    <Solid at={[8.37, 0.10, 4.85]} size={[0.035, 0.18, 2.58]} color="#91a399" />
    <RoundedBox args={[0.65, 0.94, 1.89]} radius={0.045} smoothness={3} position={[7.63, 0.52, 4.77]} castShadow receiveShadow><meshStandardMaterial color="#557166" roughness={0.83} /></RoundedBox>
    <RoundedBox args={[0.91, 0.07, 2.05]} radius={0.025} smoothness={3} position={[7.36, 1.01, 4.77]} castShadow><meshStandardMaterial map={quartz} bumpMap={quartz} bumpScale={0.0015} color="#ffffff" roughness={0.33} metalness={0.015} /></RoundedBox>
    <Solid at={[7.24, 0.89, 4.77]} size={[0.055, 0.28, 1.83]} color="#bdcfc5" />
    <Solid at={[7.60, 0.1, 4.77]} size={[0.6, 0.18, 1.86]} color="#3b5b51" />
    <Solid at={[7.317, 0.51, 4.77]} size={[0.022, 0.80, 1.87]} color="#596a5e" />
    <ReceptionDeskSlats />
    <Solid at={[7.26, 0.89, 4.77]} size={[0.008, 0.012, 1.82]} color="#d2c9b8" />
    {/* Counter-mounted privacy glazing stays either side of the speaking opening. */}
    {[4.02, 5.55].map(z => <group key={z} position={[7.42, 1.45, z]} rotation={[0, Math.PI / 2, 0]}>
      {/* Frameless cleanable privacy glass: clear patient-facing worktop sightline. */}
      <mesh position={[0, 0.16, 0.005]}><planeGeometry args={[0.325, 0.70]} /><meshPhysicalMaterial color="#c7dfd9" transparent opacity={0.14} roughness={0.1} metalness={0.02} side={DoubleSide} depthWrite={false} /></mesh>
      {[-0.171, 0.171].map(x => <Solid key={x} at={[x, 0.16, 0.008]} size={[0.008, 0.74, 0.013]} color="#97a8a5" metal />)}
      <Solid at={[0, -0.214, 0.015]} size={[0.354, 0.014, 0.030]} color="#aabbb5" metal />
      <Solid at={[0, 0.53, 0.015]} size={[0.354, 0.009, 0.014]} color="#ccd8d1" metal />
    </group>)}
    <Solid at={[7.22, 1.081, 3.99]} size={[0.36, 0.027, 0.27]} color="#718b7f" />
    {[0, 1, 2].map(i => <Solid key={i} at={[7.22, 1.103 + i * 0.007, 3.99 + i * 0.012]} size={[0.28, 0.005, 0.195]} color={i === 2 ? '#f5f2e9' : '#d6e0d5'} />)}
    <Solid at={[7.18, 1.093, 5.57]} size={[0.26, 0.045, 0.20]} color="#e8e9e2" />
    <Solid at={[7.18, 1.123, 5.57]} size={[0.16, 0.012, 0.13]} color="#88a79b" />
    <Solid at={[7.22, 1.111, 4.40]} size={[0.16, 0.022, 0.21]} color="#b8c9bf" />
    <Label title={registered ? 'CHECK IN COMPLETE' : 'CHECK IN HERE'} position={[7.14, 1.13, 4.40]} rotation={[-Math.PI / 2, 0, 0]} width={0.19} height={0.075} small />
    <group position={[7.83, 1.55, 4.55]} rotation={[0, -Math.PI / 2, 0]}>
      <RoundedBox args={[0.73, 0.48, 0.065]} radius={0.023} smoothness={3} castShadow><meshStandardMaterial color="#354b4c" roughness={0.44} metalness={0.12} /></RoundedBox>
      <Solid at={[0, 0, -0.041]} size={[0.66, 0.4, 0.006]} color="#0e3e43" />
      <Label title="PATIENT CHECK-IN" detail="QUEUE · DIGITAL RADIOGRAPHY" position={[0, 0, -0.052]} rotation={[0, Math.PI, 0]} dark width={0.54} height={0.23} />
      <Solid at={[0, -0.3, 0]} size={[0.055, 0.15, 0.06]} color="#617775" metal />
      <Solid at={[0, 0.170, 0.037]} size={[0.22, 0.013, 0.002]} color="#708d84" />
      <Solid at={[0, -0.205, 0.038]} size={[0.14, 0.009, 0.002]} color="#869c95" />
      {[-0.18, 0, 0.18].map(x => <Solid key={x} at={[x, -0.14, 0.036]} size={[0.092, 0.004, 0.002]} color="#657e78" />)}
      <mesh position={[0.30, -0.209, 0.038]}><circleGeometry args={[0.009, 16]} /><meshStandardMaterial color="#8ac6a6" emissive="#5b9875" emissiveIntensity={0.4} /></mesh>
    </group>
    {/* Registration surface: cleaning supplies, patient leaflets, pen and ticket scanner. */}
    <group position={[7.20, 1.12, 5.67]}>
      <RoundedBox args={[0.073, 0.17, 0.073]} radius={0.015} smoothness={2} castShadow><meshStandardMaterial color="#e2edeb" roughness={0.38} /></RoundedBox>
      <Solid at={[0, 0.098, 0]} size={[0.038, 0.021, 0.044]} color="#d0d8d2" metal />
      <Solid at={[0.018, 0.116, 0]} size={[0.062, 0.010, 0.018]} color="#6b8280" metal />
      <Label title="HAND GEL" position={[0, -0.025, 0.039]} width={0.063} height={0.033} small />
    </group>
    <group position={[7.18, 1.10, 4.10]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.28, 0.20]} /><meshStandardMaterial color="#f2f0e8" roughness={0.77} /></mesh>
      {[-0.04, 0, 0.04].map((x, i) => <Solid key={x} at={[x, 0.008 + i * 0.002, -0.016]} size={[0.004, 0.002, 0.15]} color="#66867e" />)}
      <mesh position={[0.09, 0.02, -0.048]} rotation={[0, 0.39, Math.PI / 2]}><cylinderGeometry args={[0.006, 0.006, 0.18, 12]} /><meshStandardMaterial color="#2a4d4a" roughness={0.45} /></mesh>
    </group>
    <group position={[7.16, 1.132, 5.22]}>
      <RoundedBox args={[0.18, 0.065, 0.22]} radius={0.015} smoothness={3}><meshStandardMaterial color="#e2e8e3" roughness={0.42} /></RoundedBox>
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.135, 0.145]} /><meshStandardMaterial color="#263f3e" roughness={0.4} /></mesh>
      <mesh position={[0, 0.037, 0.01]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.095, 0.04]} /><meshBasicMaterial color="#78bca3" /></mesh>
    </group>
    <RoundedBox args={[0.34, 0.025, 0.28]} radius={0.01} smoothness={2} position={[7.23, 1.06, 5.18]}><meshStandardMaterial color="#d3d8d2" roughness={0.45} metalness={0.08} /></RoundedBox>
    <mesh position={[7.26, 1.076, 5.29]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.014, 16]} /><meshStandardMaterial color={registered ? '#9acbad' : '#e9bf78'} emissive={registered ? '#6baa88' : '#c9974b'} emissiveIntensity={0.8} /></mesh>
    {Array.from({ length: 7 }, (_, index) => <mesh key={index} position={[7.18 + index * 0.032, 1.075, 5.18]}><boxGeometry args={[0.015, 0.005, 0.19]} /><meshStandardMaterial color="#6b7d7a" roughness={0.6} /></mesh>)}
    <Label title="WELCOME" detail="PLEASE CHECK IN BEFORE IMAGING" position={[6.58, 2.46, 6.135]} rotation={[0, Math.PI, 0]} width={1.35} height={0.27} />
    <WallClock at={[8.329, 2.72, 3.45]} rotation={-Math.PI / 2} />
    <Solid at={[6.75, -0.001, 4.39]} size={[0.48, 0.003, 0.016]} color="#769888" />
    <Solid at={[6.75, -0.001, 5.14]} size={[0.48, 0.003, 0.016]} color="#769888" />
    <Solid at={[6.52, -0.001, 4.77]} size={[0.012, 0.003, 0.77]} color="#769888" />
    <ReceptionStaff />
  </group>;
}

function RadiographerControlRoom({ doorClosed, exposing }: { doorClosed: boolean; exposing: boolean }) {
  const plaster = useSurfaceTexture('plaster');
  return <group>
    <Surface at={[5.1, -0.015, 0]} size={[3.4, 6.5]} color="#a5b4ad" />
    <Surface at={[5.1, 3.2, 0]} size={[3.4, 6.5]} ceiling color="#e9ebe5" />
    <Solid at={[6.8, 1.6, 0]} size={[0.12, 3.2, 6.5]} texture={plaster} />
    <Solid at={[5.1, 1.6, -3.25]} size={[3.4, 3.2, 0.12]} texture={plaster} />
    <Solid at={[3.95, 1.6, 3.20]} size={[1.1, 3.2, 0.12]} texture={plaster} />
    <Solid at={[7.1, 1.6, 3.20]} size={[2.6, 3.2, 0.12]} texture={plaster} />
    <Solid at={[5.15, 2.69, 3.20]} size={[1.3, 1.02, 0.12]} texture={plaster} />
    <Solid at={[6.71, 0.10, -0.10]} size={[0.03, 0.18, 6.10]} color="#8ba298" />
    <Solid at={[5.10, 0.10, -3.15]} size={[3.21, 0.18, 0.03]} color="#8ba298" />
    <Solid at={[3.94, 0.1, 3.11]} size={[0.92, 0.17, 0.03]} color="#8ba298" />
    <Solid at={[6.28, 0.1, 3.11]} size={[0.90, 0.17, 0.03]} color="#8ba298" />
    <Solid at={[4.51, 1.1, 3.155]} size={[0.065, 2.2, 0.09]} color="#738a82" metal />
    <Solid at={[5.79, 1.1, 3.155]} size={[0.065, 2.2, 0.09]} color="#738a82" metal />
    <Solid at={[5.15, 2.19, 3.155]} size={[1.34, 0.08, 0.09]} color="#738a82" metal />
    <CeilingLight x={5.15} z={-2.08} length={1.7} illuminate />
    <CeilingLight x={5.15} z={1.65} length={1.7} />
    <WallVent at={[5.58, 2.90, -3.165]} />
    <Solid at={[5.9, 3.115, 0.88]} size={[0.48, 0.035, 0.48]} color="#a9bbb2" />
    {Array.from({ length: 6 }, (_, i) => <Solid key={i} at={[5.68 + i * 0.087, 3.085, 0.88]} size={[0.028, 0.012, 0.41]} color="#61776d" />)}
    <Solid at={[5.06, -0.003, -1.1]} size={[1.39, 0.007, 0.68]} color="#687e74" />
    {Array.from({ length: 5 }, (_, i) => <Solid key={i} at={[4.52 + i * 0.27, 0.002, -1.08]} size={[0.012, 0.003, 0.52]} color="#91a89b" />)}
    <SlidingDoor closed={doorClosed} open={[4.18, 0, 3.16]} shut={[5.15, 0, 3.16]}>
      <Solid at={[0, 1.08, 0]} size={[1.25, 2.15, 0.075]} color="#8eaaa0" metal />
      <Solid at={[0, 1.62, -0.05]} size={[0.74, 0.42, 0.025]} color="#b2bfc1" />
      <Solid at={[0.42, 1.07, -0.06]} size={[0.025, 0.15, 0.035]} color="#dfe8d9" metal />
      <Solid at={[0, 0.16, -0.046]} size={[1.13, 0.28, 0.012]} color="#667d74" metal />
    </SlidingDoor>
    <ClinicalOrientationPoster />
    <Solid at={[6.72, 2.74, 3.267]} size={[1.55, 0.31, 0.055]} color="#355a50" />
    <Label title="RADIOGRAPHY CONTROL" detail="STAFF ACCESS  /  SHIELDED OBSERVATION" position={[6.72, 2.74, 3.305]} width={1.34} height={0.22} dark />
    <Label title={doorClosed ? 'CONTROL DOOR · CLOSED' : 'CONTROL DOOR · OPEN'} detail="INTERACT TO OPERATE" position={[5.12, 2.78, 3.27]} width={0.98} height={0.17} />
    <Solid at={[6.14, 2.15, 3.14]} size={[0.62, 0.46, 0.055]} color="#e8ece4" />
    <Label title="X-RAY CONTROLLED AREA" detail="STAFF ACCESS ONLY" position={[6.12, 2.19, 3.181]} width={0.54} height={0.21} small />
    <Solid at={[6.10, 1.89, 3.14]} size={[0.27, 0.075, 0.045]} color="#4b6259" metal />
    {[5.995, 6.10, 6.205].map((x, i) => <mesh key={x} position={[x, 1.892, 3.166]}><sphereGeometry args={[0.023, 12, 10]} /><meshStandardMaterial color={i === 2 && exposing ? '#ffbd62' : '#83a994'} emissive={i === 2 && exposing ? '#f1a23e' : '#527b62'} emissiveIntensity={i === 2 && exposing ? 1.1 : 0.28} /></mesh>)}
    <group position={[6.687, 1.43, 2.65]} rotation={[0, -Math.PI / 2, 0]}>
      <Solid at={[0, 0, 0]} size={[0.22, 0.34, 0.056]} color="#dfe8e1" />
      <Solid at={[0, 0.095, 0.039]} size={[0.14, 0.08, 0.008]} color="#648c7b" />
      {[-0.035, 0, 0.035].map(x => <Solid key={x} at={[x, -0.08, 0.037]} size={[0.018, 0.048, 0.01]} color="#7c9589" />)}
    </group>
    <Solid at={[6.30, 0.96, -2.13]} size={[0.61, 1.9, 0.43]} color="#9bac9f" metal />
    {[0, 1, 2, 3].map(index => <Solid key={index} at={[6.03, 0.42 + index * 0.33, -2.13]} size={[0.035, 0.05, 0.31]} color="#d5ded3" metal />)}
    {[0, 1, 2, 3].map(index => <group key={index}>
      <Solid at={[5.991, 0.43 + index * 0.33, -2.13]} size={[0.017, 0.25, 0.355]} color={index % 2 ? '#c6d2c9' : '#dce3d9'} metal />
      <Solid at={[5.977, 0.43 + index * 0.33, -2.29]} size={[0.006, 0.13, 0.012]} color="#698479" metal />
    </group>)}
    <Label title="DETECTOR / PPE STORE" detail="SERVICE EQUIPMENT" position={[5.967, 1.77, -2.13]} rotation={[0, -Math.PI / 2, 0]} width={0.35} height={0.13} small />
    <Solid at={[6.53, 2.15, -2.43]} size={[0.23, 0.04, 0.70]} color="#96aaa0" metal />
    <Solid at={[6.66, 1.63, -0.55]} size={[0.073, 0.68, 0.85]} color="#d3ded6" />
    <Label title="PRE-EXPOSURE" detail="VERIFY PATIENT / CLOSE DOOR / STAND BEHIND SHIELD" position={[6.601, 1.69, -0.55]} rotation={[0, -Math.PI / 2, 0]} width={0.78} height={0.28} />
    <Solid at={[6.64, 0.46, -0.55]} size={[0.10, 0.20, 0.26]} color="#eff0e9" />
    {[-0.065, 0.065].map(z => <Solid key={z} at={[6.585, 0.49, -0.55 + z]} size={[0.008, 0.055, 0.04]} color="#788f83" metal />)}
    <Solid at={[4.12, 0.12, -2.11]} size={[0.34, 0.24, 0.37]} color="#84988d" />
    <Solid at={[4.12, 1.53, -2.11]} size={[0.045, 2.76, 0.045]} color="#9cad9f" metal />
    <mesh position={[4.12, 2.77, -2.11]}><sphereGeometry args={[0.11, 16, 12]} /><meshStandardMaterial color={exposing ? '#e8a349' : '#91ba9b'} emissive={exposing ? '#e9a349' : '#8bb79c'} emissiveIntensity={0.6} /></mesh>
    <Label title="SHIELDING ZONE" detail="CLOSE DOOR BEFORE EXPOSURE" position={[6.70, 2.29, -0.4]} rotation={[0, -Math.PI / 2, 0]} width={1.5} height={0.27} />
  </group>;
}

/** Connected clinical wing. Every solid obstacle has a matching footprint in RoomMovement. */
export const HospitalWorld = memo(function HospitalWorld({ barrierClosed = false, changingDoorClosed = false, registered = true, gownHanded = false, patientPrepared = false, patientInRoom = true, gameActive = false, exposing = false, patientState }: { barrierClosed?: boolean; changingDoorClosed?: boolean; registered?: boolean; gownHanded?: boolean; patientPrepared?: boolean; patientInRoom?: boolean; gameActive?: boolean; exposing?: boolean; patientState: SimulatorState }) {
  const plaster = useSurfaceTexture('plaster');
  return <group>
    <Surface at={[2.5, -0.015, 4.75]} size={[11.8, 3]} />
    <Surface at={[-1.2, -0.015, 8.375]} size={[4.4, 4.25]} color="#cecfc3" />
    <Surface at={[4.7, -0.017, 9.25]} size={[7.4, 6]} color="#babaae" />
    <Surface at={[2.5, 3.2, 4.75]} size={[11.8, 3]} ceiling color="#e4e6e3" />
    <Surface at={[-1.2, 3.2, 8.375]} size={[4.4, 4.25]} ceiling color="#e4e6e3" />
    <CeilingCassetteGrid />
    <Solid at={[-3.46, 1.6, 3.745]} size={[0.12, 3.2, 0.99]} texture={plaster} />
    <Solid at={[-3.46, 1.6, 7.98]} size={[0.12, 3.2, 5.04]} texture={plaster} />
    <Solid at={[8.46, 1.6, 7.75]} size={[0.12, 3.2, 9]} texture={plaster} />
    <RadiographerControlRoom doorClosed={barrierClosed} exposing={exposing} />
    <PatientChangingRoom doorClosed={changingDoorClosed} registered={registered} gownHanded={gownHanded} patientPrepared={patientPrepared} />
    <Reception registered={registered} />
    {gameActive && <GamePatientActor state={patientState} registered={registered} gownHanded={gownHanded} patientPrepared={patientPrepared} patientInRoom={patientInRoom} changingDoorClosed={changingDoorClosed} />}
    <Solid at={[-1.2, 1.6, 10.56]} size={[4.4, 3.2, 0.12]} texture={plaster} />
    <Solid at={[0.94, 1.6, 11.375]} size={[0.12, 3.2, 1.75]} texture={plaster} />
    <Solid at={[4.7, 1.5, 12.31]} size={[7.4, 3, 0.12]} texture={plaster} />
    {/* Wall bump rails, skirtings and inset wayfinding stay against existing collision planes. */}
    <Solid at={[-3.35, 1.02, 8.0]} size={[0.035, 0.12, 4.64]} color="#9daf9f" />
    <Solid at={[-3.35, 0.11, 8.0]} size={[0.035, 0.19, 4.64]} color="#80988b" />
    <Solid at={[8.37, 1.02, 7.73]} size={[0.035, 0.12, 8.54]} color="#9daf9f" />
    <Solid at={[8.37, 0.10, 7.73]} size={[0.035, 0.18, 8.54]} color="#81998c" />
    <Solid at={[-1.2, 0.11, 10.465]} size={[4.13, 0.18, 0.033]} color="#8a9c90" />
    <Solid at={[4.7, 0.11, 12.225]} size={[7.15, 0.18, 0.035]} color="#8a9c90" />
    <Glazing x={-3.025} z={6.25} width={0.75} />
    <Glazing x={1.75} z={6.25} width={5.8} />
    <Glazing x={7.375} z={6.25} width={2.05} />
    <Glazing x={1} z={7.025} width={1.55} rotation={Math.PI / 2} />
    <Glazing x={1} z={9.85} width={1.3} rotation={Math.PI / 2} />
    <Solid at={[-1.9, 3.03, 6.25]} size={[1.5, 0.34, 0.1]} />
    <Solid at={[5.5, 3.03, 6.25]} size={[1.7, 0.34, 0.1]} />
    <Solid at={[1, 3.03, 8.5]} size={[0.1, 0.34, 1.4]} />
    {[-1.85, 2.1, 6].map((x) => <CeilingLight key={x} x={x} z={4.65} illuminate={x===2.1} />)}
    <CeilingLight x={7.10} z={4.83} length={1.45} illuminate />
    <CeilingLight x={-1.2} z={7.5} length={2.6} />
    <CeilingLight x={-1.2} z={9.4} length={2.6} />
    <group position={[2.38, 2.65, 5.74]}>
      <Solid at={[0, 0, 0]} size={[2.74, 0.45, 0.056]} color="#425e57" />
      <Solid at={[-1.20, 0.31, 0]} size={[0.035, 0.17, 0.035]} color="#8ea59a" metal />
      <Solid at={[1.20, 0.31, 0]} size={[0.035, 0.17, 0.035]} color="#8ea59a" metal />
      <Label title="01  RADIOGRAPHY  ←        02  LEARNING  →" detail="IMAGING SUITE  /  PHYSICS GALLERY  /  COURTYARD" position={[0, 0.015, 0.033]} width={2.48} height={0.32} dark />
    </group>
    <Solid at={[2.3, -0.008, 4.48]} size={[9.6, 0.006, 0.045]} color="#668777" />
    <Solid at={[2.1, -0.007, 3.87]} size={[0.045, 0.007, 1.24]} color="#668777" />
    <Label title="02  /  DISCOVERY GALLERY" detail="EXPLORE THE PHYSICS BEHIND THE IMAGE" position={[-1.7, 2.55, 6.17]} rotation={[0, Math.PI, 0]} width={2.4} height={0.32} />
    <Label title="03  /  COURTYARD" detail="DAYLIGHT / REFLECTION / A MOMENT TO RESET" position={[5.5, 2.55, 6.17]} rotation={[0, Math.PI, 0]} width={2.7} height={0.35} />
    <Label title="01  /  RADIOGRAPHY" detail="RETURN TO THE IMAGING ROOM" position={[2.1, 2.7, 3.29]} width={2.2} height={0.32} />
    <Bench x={-2.8} z={5.6} length={0.9} />
    <LearningBoard topic="distance" at={[-1.2, 1.73, 10.478]} rotation={Math.PI} />
    <LearningBoard topic="sharpness" at={[-3.378, 1.75, 8.30]} rotation={Math.PI / 2} />
    <LearningBoard topic="field" at={[3.5, 1.73, 12.22]} rotation={Math.PI} />
    <Solid at={[-0.06, 0.45, 7.675]} size={[0.68, 0.9, 1.15]} color="#c2cabf" />
    <Solid at={[-0.06, 0.93, 7.675]} size={[0.70, 0.06, 1.17]} color="#eef0e7" />
    {[0, 1, 2].map((i) => <Solid key={i} at={[-0.06 + i * 0.06, 1.10 + i * 0.08, 7.64 + i * 0.07]} size={[0.36, 0.018, 0.46]} color={['#364d47', '#a3b9a8', '#8da2a5'][i]} />)}
    <Label title="DIGITAL DETECTOR" detail="COVER / SCINTILLATOR / SENSOR" position={[-0.407, 0.74, 7.68]} rotation={[0, -Math.PI / 2, 0]} width={0.98} height={0.25} small />
    <Solid at={[4.7, 0.14, 9.9]} size={[3.1, 0.28, 1.4]} color="#aaa998" />
    <Surface at={[4.7, 0.285, 9.9]} size={[2.88, 1.18]} finish="soil" color="#d1d0c4" />
    <GardenGroundcover />
    <GardenTree x={3.95} z={9.90} /><GardenTree x={5.45} z={9.93} />
    <Bench x={2.7} z={9.9} length={1.9} wood /><Bench x={6.8} z={9.9} length={1.9} wood />
    {[7.5, 8.4, 11.1, 11.8].map((z) => <Solid key={z} at={[4.7, -0.01, z]} size={[6.7, 0.008, 0.017]} color="#8f9489" />)}
    <Label title="LOOK. THINK. RETURN." detail="TRY ONE CHANGE AT A TIME IN THE IMAGING ROOM." position={[6.72, 1.8, 12.22]} rotation={[0, Math.PI, 0]} width={2.6} height={0.42} />
  </group>;
});
