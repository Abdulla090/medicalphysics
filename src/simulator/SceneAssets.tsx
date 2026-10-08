import { memo, useEffect, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import {
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { Point3 } from './sceneGeometry';

const PALETTE = {
  wall: '#e9e9e1',
  floor: '#cdcfc6',
  white: '#f3f3ec',
  sage: '#7c9c8d',
  paleSage: '#becdc2',
  graphite: '#333c3d',
  alloy: '#aeb7b5',
  ink: '#3c4c48',
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
    <RoundedBox position={position} rotation={rotation} args={size} radius={radius} smoothness={3} castShadow receiveShadow onClick={onClick}>
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
    canvas.width = 1024;
    canvas.height = Math.round((height / width) * 1024);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = dark ? '#eaf0e8' : '#35443e';
      ctx.font = `${small ? 500 : 600} ${small ? 40 : 66}px Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(title, 12, 12);
      if (detail) {
        ctx.fillStyle = dark ? '#adbcaf' : '#6d7b72';
        ctx.font = '400 30px Arial, sans-serif';
        ctx.fillText(detail, 13, small ? 68 : 98);
      }
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
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
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#cdd0c7';
      ctx.fillRect(0, 0, 512, 512);
      let seed = 174;
      for (let i = 0; i < 18000; i++) {
        seed = (seed * 16807) % 2147483647;
        const x = seed % 512;
        seed = (seed * 16807) % 2147483647;
        const y = seed % 512;
        ctx.fillStyle = i % 3 ? 'rgba(100,110,99,.028)' : 'rgba(255,255,255,.11)';
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.strokeStyle = 'rgba(100,116,101,.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, 511, 511);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    result.wrapS = result.wrapT = RepeatWrapping;
    result.repeat.set(6, 6);
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]} receiveShadow>
      <planeGeometry args={[6.8, 6.5]} />
      <meshStandardMaterial color="#f2f1e9" map={texture} roughness={0.56} metalness={0.025} />
    </mesh>
  );
}

function Wall({ position, rotation, width }: { position: Point3; rotation?: Point3; width: number }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh receiveShadow>
        <planeGeometry args={[width, 3.45]} />
        <meshStandardMaterial color={PALETTE.wall} roughness={0.86} />
      </mesh>
      <Block position={[0, -1.62, 0.014]} size={[width, 0.17, 0.025]} color="#b3c1b7" radius={0.005} />
      <Block position={[0, -0.69, 0.012]} size={[width, 0.026, 0.017]} color="#c8d0c6" radius={0.003} />
    </group>
  );
}

function CeilingLuminaire({ position, length = 1.3 }: { position: Point3; length?: number }) {
  return (
    <group position={position}>
      <Block size={[0.36, 0.035, length]} color="#c1c8bf" radius={0.006} />
      <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.31, length - 0.08]} />
        <meshStandardMaterial color="#fffef3" emissive="#fff8e0" emissiveIntensity={0.6} />
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
      <Block position={[0.65, 0.869, 0]} size={[0.50, 0.013, 0.39]} color="#8d9b98" radius={0.045} metalness={0.7} roughness={0.2} />
      <Block position={[0.65, 0.877, 0]} size={[0.41, 0.008, 0.30]} color="#657873" radius={0.06} metalness={0.4} roughness={0.15} />
      <Cable points={[[0.65, 0.87, -0.22], [0.65, 1.13, -0.22], [0.65, 1.13, -0.08], [0.65, 1.04, -0.08]]} radius={0.019} color="#b3bdb9" />
      <Block position={[-0.49, 1.65, -0.044]} size={[1.26, 0.65, 0.34]} color="#d6ddd2" radius={0.018} />
      {[0, 1].map((i) => <Block key={i} position={[-0.81 + i * 0.63, 1.65, 0.134]} size={[0.618, 0.62, 0.022]} color="#e0e5dc" radius={0.004} />)}
      <Block position={[0.62, 1.59, -0.025]} size={[0.22, 0.27, 0.16]} color={PALETTE.white} radius={0.025} />
      <Block position={[0.62, 1.55, 0.061]} size={[0.15, 0.07, 0.015]} color={PALETTE.sage} radius={0.012} />
      <Block position={[-0.91, 0.939, 0.042]} size={[0.30, 0.135, 0.23]} color="#e9ecdf" radius={0.02} />
      <Block position={[-0.91, 1.01, 0.043]} size={[0.17, 0.011, 0.018]} color="#b3c0b0" radius={0.004} />
      <Label title="HAND HYGIENE" position={[0.57, 1.89, -0.083]} width={0.55} height={0.11} small />
    </group>
  );
}

function ControlWindow() {
  return (
    <group position={[3.37, 1.87, -0.8]} rotation={[0, -Math.PI / 2, 0]}>
      <Block position={[0, 0, -0.01]} size={[2.03, 1.31, 0.085]} color="#e0e3d9" radius={0.01} />
      <mesh position={[0, 0, 0.042]}>
        <planeGeometry args={[1.85, 1.15]} />
        <meshPhysicalMaterial color="#bed3cd" transparent opacity={0.35} metalness={0.08} roughness={0.1} side={DoubleSide} />
      </mesh>
      <Block position={[0, -0.615, 0.02]} size={[2.07, 0.042, 0.16]} color="#bdc8bd" radius={0.01} />
      <Block position={[0, 0, -0.12]} size={[1.84, 1.10, 0.019]} color="#aebbb1" radius={0.004} />
      <Block position={[0.09, -0.23, 0.04]} size={[0.52, 0.33, 0.03]} color={PALETTE.graphite} radius={0.012} />
      <Block position={[0.09, -0.228, 0.063]} size={[0.48, 0.286, 0.004]} color="#506c65" radius={0.002} />
      <Label title="CONTROL ROOM" detail="LEAD GLASS / OBSERVATION" position={[-0.20, 0.86, 0.05]} width={1.58} height={0.24} />
      <Label title="DR 01  /  READY" position={[-0.04, -0.16, 0.071]} width={0.39} height={0.075} dark small />
    </group>
  );
}

function EntryDoor({ exposing }: { exposing: boolean }) {
  return (
    <group position={[-2.17, 1.14, -3.22]}>
      <Block size={[1.07, 2.28, 0.06]} color="#a5b9aa" radius={0.012} />
      <Block position={[0, 0.02, 0.041]} size={[0.95, 2.13, 0.025]} color="#c2cec0" radius={0.006} />
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

function WallServices() {
  return (
    <group position={[-1.08, 1.29, -3.21]}>
      <Block size={[0.19, 0.48, 0.09]} color="#f0f1e7" radius={0.015} />
      <Block position={[0, 0.15, 0.051]} size={[0.13, 0.036, 0.012]} color="#adbfa9" radius={0.003} />
      <mesh position={[0, 0.039, 0.054]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.036, 0.036, 0.015, 20]} /><meshStandardMaterial color="#adbeae" metalness={0.4} roughness={0.4} /></mesh>
      <mesh position={[0, -0.108, 0.054]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.032, 0.032, 0.015, 20]} /><meshStandardMaterial color="#c3c2a6" metalness={0.5} roughness={0.3} /></mesh>
    </group>
  );
}

function PrivacyWindow() {
  return (
    <group position={[-3.374, 2.03, 1.13]} rotation={[0, Math.PI / 2, 0]}>
      <Block size={[1.60, 1.20, 0.025]} color="#d7e0d6" radius={0.008} />
      <Block position={[0, 0, 0.012]} size={[1.46, 1.07, 0.012]} color="#d8e8df" radius={0.004} />
      {Array.from({ length: 15 }, (_, i) => <Block key={i} position={[0, -0.5 + i * 0.071, 0.026]} size={[1.45, 0.016, 0.007]} color="#c3d2c5" radius={0.003} />)}
      <Block position={[0, 0, 0.024]} size={[0.036, 1.08, 0.026]} color="#becbbe" radius={0.005} />
      <Block position={[0, -0.62, 0.05]} size={[1.68, 0.047, 0.17]} color="#c2ccc0" radius={0.012} />
    </group>
  );
}

export const RoomArchitecture = memo(function RoomArchitecture({ exposing }: { exposing: boolean }) {
  return (
    <group>
      <Floor />
      <Wall position={[0, 1.71, -3.25]} width={6.8} />
      <Wall position={[0, 1.71, 3.25]} rotation={[0, Math.PI, 0]} width={6.8} />
      <Wall position={[-3.4, 1.71, 0]} rotation={[0, Math.PI / 2, 0]} width={6.5} />
      <Wall position={[3.4, 1.71, 0]} rotation={[0, -Math.PI / 2, 0]} width={6.5} />
      <mesh position={[0, 3.45, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6.8, 6.5]} />
        <meshStandardMaterial color="#edf0e7" roughness={0.94} />
      </mesh>
      {[-2.1, 0, 2.1].map((x) => <CeilingLuminaire key={x} position={[x, 3.415, 0.58]} length={1.6} />)}
      {[-2, 2].map((x) => <CeilingLuminaire key={x} position={[x, 3.415, -2.20]} />)}
      <ClinicalCounter />
      <ControlWindow />
      <PrivacyWindow />
      <EntryDoor exposing={exposing} />
      <WallServices />
      <Label title="IMAGING SUITE" detail="DIGITAL RADIOGRAPHY  /  01" position={[1.49, 2.72, -3.23]} width={1.77} height={0.35} />
      <Block position={[2.39, 0.38, -2.85]} size={[0.36, 0.72, 0.33]} color="#d5ddd1" radius={0.04} />
      <Block position={[2.39, 0.76, -2.85]} size={[0.37, 0.05, 0.35]} color="#92a58f" radius={0.018} />
      <Block position={[2.42, 1.52, -3.17]} size={[0.45, 0.39, 0.07]} color="#e1e6dc" radius={0.018} />
      <Block position={[2.42, 1.34, -3.115]} size={[0.34, 0.053, 0.01]} color="#a8b8a2" radius={0.006} />
    </group>
  );
});
