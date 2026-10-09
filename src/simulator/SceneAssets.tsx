import { memo, useEffect, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import {
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  FrontSide,
  SRGBColorSpace,
  type Texture,
  Vector3,
} from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { Point3 } from './sceneGeometry';
import { useSurfaceTexture } from './SceneMaterials';

const PALETTE = {
  wall: '#e4e4dd',
  floor: '#bfc2bd',
  white: '#f1f2ed',
  sage: '#456861',
  paleSage: '#c5d1cb',
  graphite: '#263438',
  alloy: '#aab6b6',
  ink: '#334b49',
};

type BlockProps = {
  position?: Point3;
  rotation?: Point3;
  size: Point3;
  color?: string;
  radius?: number;
  metalness?: number;
  roughness?: number;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
};

export function Block({ position, rotation, size, color = PALETTE.white, radius = 0.012, metalness = 0, roughness = 0.5, onClick }: BlockProps) {
  return (
    <RoundedBox position={position} rotation={rotation} args={size} radius={Math.min(radius, Math.min(...size) / 2)} smoothness={2} castShadow receiveShadow onClick={onClick}>
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </RoundedBox>
  );
}

type LabelProps = {
  title: string;
  detail?: string;
  position: Point3;
  rotation?: Point3;
  width?: number;
  height?: number;
  dark?: boolean;
  small?: boolean;
};

/** Local canvas signage avoids font downloads and keeps the lab usable offline. */
export function Label({ title, detail, position, rotation, width = 0.66, height = 0.2, dark = false, small = false }: LabelProps) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    // Labels are numerous in the world. 768px remains crisp in close-up while
    // using roughly half the GPU texture memory of the old 1024px atlases.
    const rasterScale = 0.75;
    canvas.width = 768;
    canvas.height = Math.max(32, Math.round((height / width) * 768));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = dark ? '#eaf0e8' : '#35443e';
      const titleSize = Math.round((small ? 40 : 66) * rasterScale);
      ctx.font = `${small ? 500 : 600} ${titleSize}px Arial, sans-serif`;
      const measured = ctx.measureText(title).width;
      if (measured > 990 * rasterScale) ctx.font = `${small ? 500 : 600} ${Math.floor(titleSize * 990 * rasterScale / measured)}px Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(title, 12 * rasterScale, 12 * rasterScale);
      if (detail) {
        ctx.fillStyle = dark ? '#adbcaf' : '#6d7b72';
        ctx.font = `400 ${30 * rasterScale}px Arial, sans-serif`;
        const detailSize = Math.min(30 * rasterScale, 990 * rasterScale / Math.max(ctx.measureText(detail).width, 1) * 30 * rasterScale);
        ctx.font = `400 ${detailSize}px Arial, sans-serif`;
        ctx.fillText(detail, 13 * rasterScale, Math.max(0, Math.min(canvas.height - detailSize - 8 * rasterScale, (small ? 68 : 98) * rasterScale)));
      }
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    result.anisotropy = 4;
    return result;
  }, [title, detail, width, height, dark, small]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={position} rotation={rotation} renderOrder={2}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export function Cable({ points, radius = 0.012, color = '#46504c' }: { points: Point3[]; radius?: number; color?: string }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((point) => new Vector3(...point))), [points]);
  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 36, radius, 6, false]} />
      <meshStandardMaterial color={color} roughness={0.72} />
    </mesh>
  );
}

function Floor() {
  const texture = useSurfaceTexture('terrazzo');
  const contact = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(32, 32, 4, 32, 32, 31);
      gradient.addColorStop(0, 'rgba(27,38,35,.54)');
      gradient.addColorStop(0.44, 'rgba(27,38,35,.29)');
      gradient.addColorStop(1, 'rgba(27,38,35,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => contact.dispose(), [contact]);
  return (
    <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]} receiveShadow>
      <planeGeometry args={[6.8, 6.5]} />
      <meshStandardMaterial map={texture} bumpMap={texture} bumpScale={0.008} roughness={0.48} metalness={0.035} />
    </mesh>
    {/* Welded vinyl sheet seams avoid a featureless plane without making the
        floor read like ceramic tiles. Lines live on the walking surface. */}
    {[-2.1, 0.0, 2.1].map(x => <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.012, 0]}>
      <planeGeometry args={[0.008, 6.38]} />
      <meshStandardMaterial color="#b3bdb5" roughness={0.91} depthWrite={false} />
    </mesh>)}
    {[
      { x: -0.45, z: 0.6, width: 1.5, length: 2.3 },
      { x: 0.65, z: -2.36, width: 1.3, length: 1.1 },
      { x: -2.83, z: -1.7, width: 1.15, length: 3.1 },
    ].map(({ x, z, width, length }) => <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.01, z]}>
      <planeGeometry args={[width, length]} />
      <meshBasicMaterial map={contact} transparent depthWrite={false} toneMapped={false} />
    </mesh>)}
    </group>
  );
}

function Wall({ position, rotation, width, height = 3.45, trim = true, twoSided = false, texture }: { position: Point3; rotation?: Point3; width: number; height?: number; trim?: boolean; twoSided?: boolean; texture?: Texture }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={PALETTE.wall} map={texture} bumpMap={texture} bumpScale={texture ? 0.0028 : 0} roughness={0.88} side={twoSided ? DoubleSide : FrontSide} />
      </mesh>
      {trim ? <>
        <Block position={[0, -1.62, 0.014]} size={[width, 0.17, 0.025]} color="#788e87" radius={0.005} />
        <Block position={[0, -0.69, 0.012]} size={[width, 0.115, 0.034]} color="#c1cac3" radius={0.009} />
        <Block position={[0, 1.65, 0.012]} size={[width, 0.045, 0.021]} color="#c8ccc5" radius={0.003} />
      </> : null}
    </group>
  );
}

function CeilingLuminaire({ position, length = 1.3 }: { position: Point3; length?: number }) {
  return (
    <group position={position}>
      <Block size={[0.36, 0.035, length]} color="#c1c8bf" radius={0.006} />
      <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.31, length - 0.08]} />
        <meshStandardMaterial color="#fffef3" emissive="#fff8e7" emissiveIntensity={1.45} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Cabinet({ position, width = 0.7, height = 0.77 }: { position: Point3; width?: number; height?: number }) {
  return (
    <group position={position}>
      <Block size={[width, height, 0.55]} color="#c3ccc0" radius={0.018} />
      {[0, 1].map((index) => (
        <group key={index}>
          <Block position={[(index - 0.5) * width / 2, 0.006, 0.288]} size={[width / 2 - 0.009, height - 0.042, 0.027]} color="#d8ded3" radius={0.006} />
          <Block position={[(index - 0.5) * width / 2 + (index ? -0.09 : 0.09), 0.14, 0.309]} size={[0.018, 0.15, 0.027]} color={PALETTE.alloy} radius={0.006} metalness={0.8} roughness={0.25} />
        </group>
      ))}
      <Block position={[0, -height / 2 + 0.027, 0.016]} size={[width - 0.06, 0.06, 0.50]} color="#8d9b8e" radius={0.007} />
    </group>
  );
}

function ClinicalCounter() {
  return (
    <group position={[-2.83, 0, -1.70]} rotation={[0, Math.PI / 2, 0]}>
      <Cabinet position={[-0.78, 0.43, 0]} width={0.78} />
      <Cabinet position={[0, 0.43, 0]} width={0.77} />
      <Cabinet position={[0.77, 0.43, 0]} width={0.76} />
      <Block position={[0, 0.837, 0]} size={[2.42, 0.056, 0.64]} color="#e5e9df" radius={0.018} roughness={0.22} />
      <Block position={[0, 0.971, -0.282]} size={[2.42, 0.24, 0.028]} color="#e8eae5" radius={0.006} roughness={0.28} />
      <Block position={[0.65, 0.869, 0]} size={[0.50, 0.013, 0.39]} color="#8d9b98" radius={0.045} metalness={0.7} roughness={0.2} />
      <Block position={[0.65, 0.877, 0]} size={[0.41, 0.008, 0.30]} color="#657873" radius={0.06} metalness={0.4} roughness={0.15} />
      <Cable points={[[0.65, 0.87, -0.22], [0.65, 1.13, -0.22], [0.65, 1.13, -0.08], [0.65, 1.04, -0.08]]} radius={0.019} color="#b3bdb9" />
      <Block position={[-0.49, 1.65, -0.044]} size={[1.26, 0.65, 0.34]} color="#d6ddd2" radius={0.018} />
      {[0, 1].map((i) => <Block key={i} position={[-0.81 + i * 0.63, 1.65, 0.134]} size={[0.618, 0.62, 0.022]} color="#e0e5dc" radius={0.004} />)}
      <Block position={[0.62, 1.59, -0.025]} size={[0.22, 0.27, 0.16]} color={PALETTE.white} radius={0.025} />
      <Block position={[0.62, 1.55, 0.061]} size={[0.15, 0.07, 0.015]} color={PALETTE.sage} radius={0.012} />
      <Block position={[-0.91, 0.939, 0.042]} size={[0.30, 0.135, 0.23]} color="#e9ecdf" radius={0.02} />
      <Block position={[-0.91, 1.01, 0.043]} size={[0.17, 0.011, 0.018]} color="#b3c0b0" radius={0.004} />
      <Block position={[-0.32, 0.974, -0.05]} size={[0.105, 0.215, 0.105]} color="#c7d6d2" radius={0.025} roughness={0.18} />
      <Block position={[-0.32, 1.088, -0.05]} size={[0.037, 0.035, 0.037]} color="#f1f2ed" radius={0.008} />
      <Block position={[-0.296, 1.11, -0.05]} size={[0.084, 0.018, 0.03]} color="#f1f2ed" radius={0.007} />
      <Label title="SOAP" position={[-0.32, 0.98, 0.004]} width={0.063} height={0.043} small />
      <Block position={[-0.49, 1.31, 0.06]} size={[1.18, 0.012, 0.12]} color="#e2dfc4" radius={0.003} />
      <Label title="HAND HYGIENE" position={[0.57, 1.89, -0.083]} width={0.55} height={0.11} small />
    </group>
  );
}

function ControlWindow() {
  return (
    <group position={[3.37, 1.87, -0.8]} rotation={[0, -Math.PI / 2, 0]}>
      {[-0.976, 0.976].map((x) => <Block key={x} position={[x, 0, -0.01]} size={[0.075, 1.31, 0.135]} color="#8f9c98" metalness={0.7} roughness={0.25} radius={0.009} />)}
      {[-0.62, 0.62].map((y) => <Block key={y} position={[0, y, -0.01]} size={[2.03, 0.075, 0.135]} color="#8f9c98" metalness={0.7} roughness={0.25} radius={0.009} />)}
      <mesh position={[0, 0, 0.042]}>
        <planeGeometry args={[1.85, 1.15]} />
        <meshPhysicalMaterial color="#b6d4c9" transparent opacity={0.19} metalness={0.18} roughness={0.07} side={DoubleSide} depthWrite={false} />
      </mesh>
      <Block position={[0, -0.658, 0.07]} size={[2.07, 0.048, 0.28]} color="#e5e8e0" radius={0.01} />
      <Label title="CONTROL ROOM" detail="LEAD GLASS / OBSERVATION" position={[-0.20, 0.86, 0.05]} width={1.58} height={0.24} />
      <Label title="Pb GLASS  /  01" position={[0.62, -0.54, 0.047]} width={0.44} height={0.063} small />
    </group>
  );
}

function EntryDoor({ exposing }: { exposing: boolean }) {
  const timber = useSurfaceTexture('timber');
  return (
    <group position={[-2.17, 1.14, -3.22]}>
      <Block size={[1.07, 2.28, 0.06]} color="#87938e" radius={0.012} metalness={0.55} />
      <mesh position={[0, 0.02, 0.041]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 2.13, 0.025]} />
        <meshStandardMaterial map={timber} roughness={0.5} bumpMap={timber} bumpScale={0.001} />
      </mesh>
      <Block position={[0, -0.875, 0.062]} size={[0.94, 0.29, 0.008]} color="#9ca8a6" radius={0.001} metalness={0.75} roughness={0.31} />
      <Block position={[-0.035, 0.34, 0.059]} size={[0.78, 0.30, 0.006]} color="#e7e8df" radius={0.009} />
      <Block position={[0.33, -0.22, 0.075]} size={[0.025, 0.16, 0.027]} color={PALETTE.alloy} radius={0.006} metalness={0.8} />
      <Block position={[0, 1.24, 0]} size={[0.57, 0.10, 0.073]} color="#a8b6aa" radius={0.012} />
      <mesh position={[0, 1.24, 0.046]}>
        <planeGeometry args={[0.46, 0.055]} />
        <meshStandardMaterial color={exposing ? '#d4a05d' : '#b9cbbb'} emissive={exposing ? '#e5ae5d' : '#8ea58f'} emissiveIntensity={exposing ? 0.9 : 0.16} />
      </mesh>
      <Label title="X-RAY ROOM" detail="CONTROLLED AREA" position={[-0.045, 0.36, 0.062]} width={0.75} height={0.24} />
      <mesh position={[0, 0.05, 0.066]}>
        <circleGeometry args={[0.068, 36]} />
        <meshStandardMaterial color="#bdc5ad" />
      </mesh>
      {[0, 1, 2].map((i) => <mesh key={i} position={[Math.sin(i * Math.PI * 2 / 3) * 0.026, 0.05 + Math.cos(i * Math.PI * 2 / 3) * 0.026, 0.072]} rotation={[0, 0, i * Math.PI * 2 / 3]}><circleGeometry args={[0.026, 12, 0, Math.PI * 0.7]} /><meshBasicMaterial color="#68745f" /></mesh>)}
    </group>
  );
}

function WallServices({ hygieneDone }: { hygieneDone: boolean }) {
  return (
    <group position={[-1.08, 1.29, -3.21]}>
      <Block size={[0.19, 0.48, 0.09]} color="#f0f1e7" radius={0.015} />
      <Block position={[0, 0.15, 0.051]} size={[0.13, 0.036, 0.012]} color={hygieneDone ? '#5da777' : '#adbfa9'} radius={0.003} />
      <mesh position={[0, 0.039, 0.054]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.036, 0.036, 0.015, 20]} /><meshStandardMaterial color="#adbeae" metalness={0.4} roughness={0.4} /></mesh>
      <mesh position={[0, -0.108, 0.054]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.032, 0.032, 0.015, 20]} /><meshStandardMaterial color="#c3c2a6" metalness={0.5} roughness={0.3} /></mesh>
    </group>
  );
}

/** Fixed wall status plate is visible from the table and distinguishes practice from exposure. */
function ExposureStatusPlate({ exposing }: { exposing: boolean }) {
  return <group position={[-0.04, 2.28, -3.194]}>
    <Block size={[1.25, 0.46, 0.038]} color="#d5ded6" roughness={0.73} radius={0.016} />
    <Block position={[-0.49, 0, 0.027]} size={[0.14, 0.30, 0.007]} color="#49675d" roughness={0.6} radius={0.008} />
    <mesh position={[-0.49, 0.04, 0.035]}><circleGeometry args={[0.045, 24]} /><meshStandardMaterial color={exposing ? '#f4c17d' : '#a6d0b4'} emissive={exposing ? '#eb9d4e' : '#76ab87'} emissiveIntensity={exposing ? 1.2 : 0.38} /></mesh>
    <Label title={exposing ? 'SIMULATED EXPOSURE' : 'RADIOGRAPHY PRACTICE'} detail={exposing ? 'VIRTUAL EXPOSURE CYCLE ACTIVE' : 'EDUCATIONAL SIMULATOR  /  NO RADIATION'} position={[0.10, 0.022, 0.033]} width={0.90} height={0.24} />
    <Block position={[0, -0.208, 0.018]} size={[1.22, 0.018, 0.018]} color="#7c9788" radius={0.003} />
  </group>;
}

function PrivacyWindow() {
  return (
    <group position={[-3.374, 2.03, 1.13]} rotation={[0, Math.PI / 2, 0]}>
      <Block size={[1.60, 1.20, 0.025]} color="#d7e0d6" radius={0.008} />
      <mesh position={[0, 0, 0.019]}>
        <planeGeometry args={[1.46, 1.07]} />
        <meshStandardMaterial color="#d9e6e4" emissive="#c8dfdf" emissiveIntensity={0.45} roughness={0.25} />
      </mesh>
      {Array.from({ length: 15 }, (_, i) => <Block key={i} position={[0, -0.5 + i * 0.071, 0.026]} size={[1.45, 0.016, 0.007]} color="#c3d2c5" radius={0.003} />)}
      <Block position={[0, 0, 0.024]} size={[0.036, 1.08, 0.026]} color="#becbbe" radius={0.005} />
      <Block position={[0, -0.62, 0.05]} size={[1.68, 0.047, 0.17]} color="#c2ccc0" radius={0.012} />
    </group>
  );
}

function ClinicalCeiling() {
  const texture = useSurfaceTexture('ceiling');
  return <group>
    <mesh position={[0, 3.45, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[6.8, 6.5]} />
      <meshStandardMaterial map={texture} roughness={0.92} bumpMap={texture} bumpScale={0.005} />
    </mesh>
    {[-2.1, 0, 2.1].map((x) => <CeilingLuminaire key={x} position={[x, 3.415, 0.58]} length={1.6} />)}
    {[-2, 2].map((x) => <CeilingLuminaire key={x} position={[x, 3.415, -2.20]} />)}
    {[-1.55, 1.45].map((x) => <group key={x} position={[x, 3.408, 2.26]}>
      <Block size={[0.48, 0.024, 0.48]} color="#b4beb8" radius={0.005} />
      <Block position={[0, -0.016, 0]} size={[0.43, 0.006, 0.43]} color="#52615c" radius={0.002} />
      {Array.from({ length: 9 }, (_, i) => <Block key={i} position={[-0.192 + i * 0.048, -0.022, 0]} size={[0.025, 0.012, 0.43]} color="#d2d7cf" radius={0.002} />)}
    </group>)}
    <mesh position={[0.7, 3.4, -2.7]}>
      <cylinderGeometry args={[0.066, 0.078, 0.045, 20]} />
      <meshStandardMaterial color="#e5e8e0" roughness={0.65} />
    </mesh>
    <mesh position={[0.7, 3.373, -2.7]} rotation={[Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.025, 16]} />
      <meshStandardMaterial color="#aebbb2" />
    </mesh>
    {/* Modular washable acoustic cassettes and shallow recessed light wells. */}
    {[-3.23, -1.62, 0, 1.62, 3.23].map(z => <Block key={z} position={[0, 3.431, z]} size={[6.72, 0.011, 0.014]} color="#c4c9c3" radius={0.002} />)}
    {[-2.26, -0.76, 0.76, 2.26].map(x => <Block key={x} position={[x, 3.431, 0]} size={[0.013, 0.011, 6.43]} color="#c4c9c3" radius={0.002} />)}
  </group>;
}

function LearningEntry() {
  const plaster = useSurfaceTexture('plaster');
  return <group>
    <Wall position={[-1.05, 1.71, 3.25]} rotation={[0, Math.PI, 0]} width={4.7} twoSided texture={plaster} />
    <Wall position={[3.15, 1.71, 3.25]} rotation={[0, Math.PI, 0]} width={0.5} twoSided texture={plaster} />
    <Wall position={[2.1, 2.975, 3.25]} rotation={[0, Math.PI, 0]} width={1.6} height={0.95} trim={false} twoSided texture={plaster} />
    {[1.265, 2.935].map((x) => <Block key={x} position={[x, 1.27, 3.23]} size={[0.07, 2.54, 0.14]} color="#879b94" radius={0.009} metalness={0.5} />)}
    <Block position={[2.1, 2.53, 3.23]} size={[1.74, 0.07, 0.14]} color="#879b94" radius={0.009} metalness={0.5} />
    <Label title="LEARNING GALLERY" detail="OBSERVATION GARDEN  /  EXIT" position={[2.08, 2.83, 3.224]} rotation={[0, Math.PI, 0]} width={1.44} height={0.27} />
  </group>;
}

function ObservationWall() {
  const plaster = useSurfaceTexture('plaster');
  return <group position={[3.4, 0, -0.8]} rotation={[0, -Math.PI / 2, 0]}>
    <Wall position={[-1.69, 1.71, 0]} width={1.52} texture={plaster} />
    <Wall position={[2.49, 1.71, 0]} width={3.12} texture={plaster} />
    <Wall position={[0, 0.6475, 0]} width={1.86} height={1.295} trim={false} texture={plaster} />
    <Wall position={[0, 2.9425, 0]} width={1.86} height={0.995} trim={false} texture={plaster} />
    <Block position={[0, 0.09, 0.014]} size={[1.86, 0.17, 0.025]} color="#788e87" radius={0.005} />
    <Block position={[0, 1.02, 0.012]} size={[1.86, 0.115, 0.034]} color="#c1cac3" radius={0.009} />
  </group>;
}

export const RoomArchitecture = memo(function RoomArchitecture({ exposing, hygieneDone = false }: { exposing: boolean; hygieneDone?: boolean }) {
  const plaster = useSurfaceTexture('plaster');
  return (
    <group>
      <Floor />
      <Wall position={[0, 1.71, -3.25]} width={6.8} texture={plaster} />
      <LearningEntry />
      <Wall position={[-3.4, 1.71, 0]} rotation={[0, Math.PI / 2, 0]} width={6.5} texture={plaster} />
      <ObservationWall />
      <ClinicalCeiling />
      <ClinicalCounter />
      <ControlWindow />
      <PrivacyWindow />
      <EntryDoor exposing={exposing} />
      <WallServices hygieneDone={hygieneDone} />
      <ExposureStatusPlate exposing={exposing} />
      <Block position={[1.43, 2.72, -3.21]} size={[1.66, 0.37, 0.048]} color="#42645c" radius={0.016} roughness={0.77} />
      <Label title="IMAGING SUITE   /   DR 01" detail="DIGITAL RADIOGRAPHY · TEACHING FACILITY" position={[1.43, 2.73, -3.179]} width={1.46} height={0.24} dark />
      <Block position={[2.39, 0.38, -2.85]} size={[0.36, 0.72, 0.33]} color="#d5ddd1" radius={0.04} />
      <Block position={[2.39, 0.76, -2.85]} size={[0.37, 0.05, 0.35]} color="#92a58f" radius={0.018} />
      <Block position={[2.42, 1.52, -3.17]} size={[0.45, 0.39, 0.07]} color="#e1e6dc" radius={0.018} />
      <Block position={[2.42, 1.34, -3.115]} size={[0.34, 0.053, 0.01]} color="#a8b8a2" radius={0.006} />
    </group>
  );
});
