import { memo, useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls, RoundedBox } from '@react-three/drei';
import { CanvasTexture, CatmullRomCurve3, Color, Curve, Group, Mesh, Quaternion, SRGBColorSpace, TubeGeometry, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import type { BenchCamera, SpringMotion } from './ApparatusBench';

type Point = [number, number, number];
type LabelKind = 'supply' | 'ammeter' | 'voltmeter' | 'ruler' | 'plate' | 'mass';

function makeLabel(kind: LabelKind, value: number, powered: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = kind === 'ruler' ? 256 : 1024;
  canvas.height = kind === 'ruler' ? 4096 : kind === 'supply' ? 640 : kind === 'plate' || kind === 'mass' ? 256 : 1536;
  const c = canvas.getContext('2d')!;
  const w = canvas.width; const h = canvas.height;
  c.fillStyle = kind === 'ruler' ? '#e7ddc8' : kind === 'supply' ? '#e5e6e4' : kind === 'mass' ? '#b4a06c' : kind === 'plate' ? '#e9e8df' : '#33373c';
  c.fillRect(0, 0, w, h);
  c.textBaseline = 'middle'; c.fillStyle = '#34363b'; c.textAlign = 'left';
  if (kind === 'ruler') {
    c.font = '44px monospace';
    for (let mm = -50; mm <= 630; mm++) {
      const y = (0.25 + mm * 0.005) / 3.4 * h;
      const major = mm % 10 === 0;
      c.fillRect(0, y, major ? 105 : mm % 5 === 0 ? 75 : 45, major ? 3 : 2);
      if (mm % 50 === 0 && mm >= 0) c.fillText(String(mm / 10), 130, y);
    }
    c.fillStyle = '#9d3730'; c.fillRect(0, 0.25 / 3.4 * h - 2, w, 4);
    c.font = '28px sans-serif'; c.fillText('cm', 150, 80);
  } else if (kind === 'supply') {
    c.font = '500 36px sans-serif'; c.fillText('DC POWER SUPPLY', 52, 54);
    c.fillStyle = '#74787c'; c.font = '22px monospace'; c.fillText('0–12 V   /   0–0.3 A', 52, 92);
    c.fillStyle = '#20292d'; c.fillRect(46, 129, 655, 252);
    c.strokeStyle = '#899599'; c.lineWidth = 4; c.strokeRect(46, 129, 655, 252);
    c.textAlign = 'right'; c.fillStyle = powered ? '#dbe9ee' : '#566265'; c.font = '90px monospace';
    c.fillText(powered ? value.toFixed(3) : '0.000', 592, 211); c.font = '35px sans-serif'; c.fillText('V', 663, 215);
    c.fillStyle = powered ? '#b8cbd3' : '#566265'; c.font = '35px sans-serif'; c.fillText('A', 663, 321);
    c.fillStyle = '#4b5054'; c.textAlign = 'center'; c.font = '20px sans-serif'; c.fillText('VOLTAGE', 842, 143);
    c.font = '24px monospace'; c.fillText('−', 719, 278); c.fillText('+', 961, 278);
    c.font = '20px sans-serif'; c.fillText('OUTPUT', 324, 438); c.fillText('POWER', 845, 467);
    c.strokeStyle = '#bfc2c3'; c.lineWidth = 3; c.beginPath(); c.moveTo(55, 411); c.lineTo(970, 411); c.stroke();
    c.fillStyle = '#7a7d80'; c.font = '21px monospace'; c.fillText('−', 175, 563); c.fillStyle = '#a43a32'; c.fillText('+', 484, 563);
  } else if (kind === 'plate') {
    c.textAlign = 'center'; c.font = '46px monospace'; c.fillText(`${value} Ω`, 512, 100); c.font = '31px monospace'; c.fillStyle = '#6c6e6b'; c.fillText('5 W', 512, 174);
  } else if (kind === 'mass') {
    c.textAlign = 'center'; c.font = '72px monospace'; c.fillText(`${value} g`, 512, 126);
  } else {
    const current = kind === 'ammeter';
    c.fillStyle = '#dadcdd'; c.font = '30px sans-serif'; c.textAlign = 'center'; c.fillText(current ? 'DC MILLIAMMETER' : 'DC VOLTMETER', 512, 100);
    c.fillStyle = '#a8b3b7'; c.fillRect(96, 170, 832, 385);
    c.fillStyle = '#d1d8d7'; c.fillRect(119, 193, 786, 338);
    c.fillStyle = '#3a4849'; c.font = '22px monospace'; c.textAlign = 'left'; c.fillText('DC', 159, 245);
    c.font = '140px monospace'; c.textAlign = 'right'; c.fillText(value.toFixed(current ? 2 : 3), 858, 365);
    c.font = '42px sans-serif'; c.fillText(current ? 'mA' : 'V', 858, 475);
    c.strokeStyle = '#81898c'; c.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      c.beginPath(); c.moveTo(512 + Math.sin(a) * 243, 922 + Math.cos(a) * 243); c.lineTo(512 + Math.sin(a) * 266, 922 + Math.cos(a) * 266); c.stroke();
    }
    c.fillStyle = '#d9dfe1'; c.font = '25px sans-serif'; c.textAlign = 'center'; c.fillText('OFF', 512, 605); c.fillText(current ? 'mA' : 'V', 806, 826); c.fillText('Ω', 216, 826);
    c.font = '26px sans-serif'; c.fillStyle = '#c6ced2'; c.fillText('COM', 261, 1330); c.fillStyle = '#e3b8a8'; c.fillText(current ? 'mA' : 'V Ω', 763, 1330);
    c.fillStyle = '#a3aeb4'; c.font = '19px sans-serif'; c.fillText(current ? 'FUSED · 400 mA MAX' : 'DC · 20 V RANGE', 512, 1480);
  }
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 8;
  return texture;
}

function Label({ kind, value = 0, powered = true, position, size, rotation = [0, 0, 0] }: { kind: LabelKind; value?: number; powered?: boolean; position: Point; size: [number, number]; rotation?: Point }) {
  const texture = useMemo(() => makeLabel(kind, value, powered), [kind, value, powered]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={position} rotation={rotation}><planeGeometry args={size}/><meshStandardMaterial map={texture} roughness={0.72} metalness={0.02}/></mesh>;
}

function Block({ position, size, color = '#e5e6e7', metalness = 0, roughness = 0.5, radius = 0.035 }: { position: Point; size: Point; color?: string; metalness?: number; roughness?: number; radius?: number }) {
  return <RoundedBox position={position} args={size} radius={radius} smoothness={3} castShadow receiveShadow><meshStandardMaterial color={color} metalness={metalness} roughness={roughness}/></RoundedBox>;
}

function Rod({ from, to, radius = 0.035, color = '#adb0b3', metalness = 0.92 }: { from: Point; to: Point; radius?: number; color?: string; metalness?: number }) {
  const a = new Vector3(...from); const b = new Vector3(...to); const length = a.distanceTo(b);
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return <mesh position={a.add(b).multiplyScalar(0.5)} quaternion={q} castShadow><cylinderGeometry args={[radius, radius, length, 24]}/><meshStandardMaterial color={color} metalness={metalness} roughness={0.24}/></mesh>;
}

function Screw({ position }: { position: Point }) {
  return <group position={position}><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.022, 0.022, 0.012, 16]}/><meshStandardMaterial color="#a9aeb0" metalness={0.95} roughness={0.3}/></mesh><mesh position={[0, 0, 0.008]}><boxGeometry args={[0.027, 0.004, 0.002]}/><meshStandardMaterial color="#51575c"/></mesh></group>;
}

function Terminal({ position, color = '#a33c30', rotation = [0, 0, 0] }: { position: Point; color?: string; rotation?: Point }) {
  return <group position={position} rotation={rotation}><mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.067, 0.072, 0.075, 32]}/><meshStandardMaterial color={color} roughness={0.38}/></mesh><mesh position={[0, 0, 0.045]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.032, 0.035, 0.021, 24]}/><meshStandardMaterial color="#b8ae83" metalness={0.9} roughness={0.23}/></mesh><mesh position={[0, 0, 0.058]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.016, 0.016, 0.006, 16]}/><meshStandardMaterial color="#282a2d"/></mesh></group>;
}

function Wire({ points, color, radius = 0.024 }: { points: Point[]; color: string; radius?: number }) {
  const key = points.flat().join(',');
  const geometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3(key.split(',').reduce<Vector3[]>((array, _, i, all) => {
    if (i % 3 === 0) array.push(new Vector3(Number(all[i]), Number(all[i + 1]), Number(all[i + 2])));
    return array;
  }, [])), 80, radius, 8, false), [key, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} castShadow><meshStandardMaterial color={color} roughness={0.43} metalness={0.03}/></mesh>;
}

const SpringStand = memo(function SpringStand() {
  return <group>
    <Block position={[-0.92, 0.16, 0]} size={[1.75, 0.2, 1.05]} color="#bfc5cb" metalness={0.25} roughness={0.4} radius={0.08}/>
    {[[-1.5, 0.045, -0.32], [-0.35, 0.045, -0.32], [-1.5, 0.045, 0.32], [-0.35, 0.045, 0.32]].map((p, i) => <mesh key={i} position={p as Point}><cylinderGeometry args={[0.085, 0.085, 0.07, 16]}/><meshStandardMaterial color="#33363a" roughness={0.9}/></mesh>)}
    <Rod from={[-1.1, 0.25, 0]} to={[-1.1, 4.59, 0]} radius={0.042}/>
    <Block position={[-1.1, 4.35, 0]} size={[0.22, 0.23, 0.21]} color="#494b4e" metalness={0.55} roughness={0.3}/>
    <Rod from={[-1.1, 4.35, 0]} to={[0.16, 4.35, 0]} radius={0.034}/>
    <Rod from={[-1.12, 4.35, 0]} to={[-1.33, 4.35, 0]} radius={0.024} color="#72767a"/>
    <Block position={[-1.37, 4.35, 0]} size={[0.1, 0.22, 0.07]} color="#2e3338" radius={0.025}/>
    <Rod from={[0.1, 4.35, 0]} to={[0.1, 4.24, 0]} radius={0.015}/>
    <mesh position={[0.1, 4.21, 0]}><torusGeometry args={[0.055, 0.013, 10, 32, Math.PI * 1.75]}/><meshStandardMaterial color="#a8a9ab" metalness={0.95} roughness={0.22}/></mesh>
    <Block position={[0.69, 2, -0.05]} size={[0.27, 3.4, 0.055]} color="#e4ded0" radius={0.006}/>
    <Label kind="ruler" position={[0.69, 2, -0.018]} size={[0.265, 3.4]}/>
    <Rod from={[0.69, 0.18, -0.05]} to={[0.69, 0.37, -0.05]} radius={0.035}/>
    <Block position={[0.69, 0.11, -0.08]} size={[0.7, 0.12, 0.6]} color="#abb4be" radius={0.04}/>
  </group>;
});

class Helix extends Curve<Vector3> {
  constructor() { super(); }
  getPoint(t: number, target = new Vector3()) { return target.set(0.125 * Math.cos(t * Math.PI * 28), -t, 0.125 * Math.sin(t * Math.PI * 28)); }
}

function LoadedSpring({ mass, motion }: { mass: number; motion: MutableRefObject<SpringMotion> }) {
  const coil = useRef<Mesh>(null); const load = useRef<Group>(null);
  const previousLength = useRef(-1);
  const geometry = useMemo(() => new TubeGeometry(new Helix(), 360, 0.012, 10, false), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const weights = useMemo(() => {
    let remaining = Math.round(mass * 1000) - 50; const result: { grams: number; height: number; radius: number; y: number }[] = [];
    let height = 0;
    for (const grams of [100, 50, 20, 10]) while (remaining >= grams) {
      const thickness = grams === 100 ? 0.085 : grams === 50 ? 0.065 : 0.04;
      result.push({ grams, height: thickness, radius: grams >= 50 ? 0.22 : 0.19, y: height + thickness / 2 });
      height += thickness + 0.008; remaining -= grams;
    }
    return result;
  }, [mass]);
  const stackHeight = weights.reduce((v, w) => Math.max(v, w.y + w.height / 2), 0);
  useFrame(() => {
    const length = 0.9 + motion.current.state.extension * 5;
    if (Math.abs(previousLength.current - length) > 1e-8) {
      // Change coil pitch while keeping the steel wire circular and 0.024 units thick.
      // Scaling a tube would incorrectly stretch the wire itself under a heavy load.
      const vertices = geometry.getAttribute('position');
      const normals = geometry.getAttribute('normal');
      const angular = Math.PI * 28;
      const tangentLength = Math.hypot(0.125 * angular, length);
      for (let ring = 0; ring <= 360; ring++) {
        const t = ring / 360; const a = angular * t;
        const ca = Math.cos(a); const sa = Math.sin(a);
        const bx = -length * sa / tangentLength; const by = 0.125 * angular / tangentLength; const bz = length * ca / tangentLength;
        for (let j = 0; j <= 10; j++) {
          const v = j / 10 * Math.PI * 2; const cv = Math.cos(v); const sv = -Math.sin(v);
          const nx = cv * ca + sv * bx; const ny = sv * by; const nz = cv * sa + sv * bz;
          const index = ring * 11 + j;
          vertices.setXYZ(index, 0.125 * ca + 0.012 * nx, -length * t + 0.012 * ny, 0.125 * sa + 0.012 * nz);
          normals.setXYZ(index, nx, ny, nz);
        }
      }
      vertices.needsUpdate = true; normals.needsUpdate = true; previousLength.current = length;
    }
    if (load.current) load.current.position.y = 4.35 - length;
  });
  return <>
    <mesh ref={coil} position={[0.1, 4.35, 0]} geometry={geometry} frustumCulled={false} castShadow><meshStandardMaterial color="#bfc2c7" metalness={0.98} roughness={0.2} envMapIntensity={1.2}/></mesh>
    <Rod from={[0.1, 4.35, 0]} to={[0.225, 4.35, 0]} radius={0.012}/>
    <group ref={load} position={[0, 4.35 - (0.9 + motion.current.state.extension * 5), 0]}>
      <Rod from={[0.1, 0, 0]} to={[0.225, 0, 0]} radius={0.012}/>
      <Rod from={[0.1, 0, 0]} to={[0.1, -0.45, 0]} radius={0.016}/>
      <mesh position={[0.1, -0.46, 0]} castShadow><cylinderGeometry args={[0.24, 0.24, 0.06, 64]}/><meshStandardMaterial color="#b8a066" metalness={0.87} roughness={0.3}/></mesh>
      {weights.map((w, i) => <mesh key={i} position={[0.1, -0.425 + w.y, 0]} castShadow><cylinderGeometry args={[w.radius, w.radius, w.height, 64]}/><meshStandardMaterial color="#b7a06b" metalness={0.88} roughness={0.25}/></mesh>)}
      <mesh position={[0.1, -0.425 + stackHeight + 0.01, 0]}><cylinderGeometry args={[0.03, 0.03, 0.018, 24]}/><meshStandardMaterial color="#969b9e" metalness={0.95} roughness={0.23}/></mesh>
      <Rod from={[0.1, 0, 0.03]} to={[0.78, 0, 0.03]} radius={0.009} color="#9f3930" metalness={0.4}/>
      <Label kind="mass" value={50} position={[0.1, -0.46, 0.242]} size={[0.26, 0.045]}/>
    </group>
  </>;
}

function PowerSupply({ voltage, resistance, powered, onPower, onVoltage }: { voltage: number; resistance: number; powered: boolean; onPower: () => void; onVoltage: () => void }) {
  return <group position={[-2.05, 0, -0.65]}>
    <Block position={[0, 0.67, 0]} size={[1.8, 1.12, 1.28]} color="#d1d4d5" metalness={0.42} roughness={0.43}/>
    <Block position={[0, 0.67, 0.65]} size={[1.73, 1.06, 0.055]} color="#e2e3e1" radius={0.022}/>
    <Label kind="supply" value={voltage} powered={powered} position={[0, 0.67, 0.682]} size={[1.72, 1.055]}/>
    {/* The second readout is a separate calibrated current display. */}
    <DisplayCurrent current={powered ? voltage / resistance : 0} position={[-0.2, 0.67, 0.686]}/>
    {[-0.71, 0.71].flatMap(x => [0.23, 1.1].map(y => <Screw key={`${x}-${y}`} position={[x, y, 0.69]}/>))}
    {Array.from({ length: 9 }, (_, i) => <Block key={i} position={[0.907, 0.4 + i * 0.065, -0.12]} size={[0.006, 0.018, 0.62]} color="#50575c" radius={0.002}/>)}
    <Terminal position={[-0.55, 0.3, 0.7]} color="#33383d"/><Terminal position={[-0.03, 0.3, 0.7]}/>
    <mesh position={[0.55, 0.75, 0.73]} rotation={[Math.PI / 2, 0, 0]} onClick={e => { e.stopPropagation(); onVoltage(); }} castShadow><cylinderGeometry args={[0.15, 0.16, 0.13, 48]}/><meshStandardMaterial color="#444a50" roughness={0.48} metalness={0.15}/></mesh>
    <group position={[0.55, 0.75, 0.805]} rotation={[0, 0, -voltage / 12 * Math.PI * 1.5 + Math.PI * 0.75]}><Block position={[0, 0.085, 0]} size={[0.014, 0.075, 0.005]} color="#e7e8e5" radius={0.002}/></group>
    <group onClick={e => { e.stopPropagation(); onPower(); }}><Block position={[0.55, 0.29, 0.73]} size={[0.16, 0.21, 0.08]} color="#30363a" radius={0.016}/><mesh position={[0.55, 0.34, 0.78]}><sphereGeometry args={[0.019, 12, 12]}/><meshStandardMaterial color={powered ? '#c37b31' : '#555a5e'} emissive={powered ? '#c37b31' : '#111111'} emissiveIntensity={powered ? 0.8 : 0}/></mesh></group>
    {[-0.65, 0.65].flatMap(x => [-0.43, 0.43].map(z => <Block key={`${x}-${z}`} position={[x, 0.055, z]} size={[0.24, 0.09, 0.18]} color="#3d4143" radius={0.025}/>))}
  </group>;
}

function DisplayCurrent({ current, position }: { current: number; position: Point }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 100;
    const c = canvas.getContext('2d')!; c.fillStyle = '#20292d'; c.fillRect(0, 0, 512, 100);
    c.fillStyle = '#b8cbd3'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.font = '66px monospace'; c.fillText(current.toFixed(3), 455, 53);
    const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace; return t;
  }, [current]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={position}><planeGeometry args={[0.88, 0.18]}/><meshStandardMaterial map={texture} roughness={0.65}/></mesh>;
}

function Multimeter({ position, current, value }: { position: Point; current: boolean; value: number }) {
  return <group position={position}>
    <Block position={[0, 0.83, 0]} size={[0.94, 1.53, 0.31]} color={current ? '#d6ad54' : '#d0a44b'} roughness={0.76} radius={0.085}/>
    <Block position={[0, 0.83, 0.155]} size={[0.81, 1.39, 0.035]} color="#32373b" radius={0.035}/>
    <Label kind={current ? 'ammeter' : 'voltmeter'} value={value} position={[0, 0.83, 0.176]} size={[0.8, 1.385]}/>
    <mesh position={[0, 0.69, 0.21]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.176, 0.18, 0.065, 48]}/><meshStandardMaterial color="#42484b" roughness={0.48}/></mesh>
    <group position={[0, 0.69, 0.251]} rotation={[0, 0, -0.8]}><Block position={[0, 0.03, 0]} size={[0.052, 0.19, 0.012]} color="#63696b" radius={0.012}/><Block position={[0, 0.105, 0.01]} size={[0.012, 0.031, 0.005]} color="#e6dfc7" radius={0.002}/></group>
    <Terminal position={[-0.205, 0.25, 0.19]} color="#292d30"/><Terminal position={[0.205, 0.25, 0.19]}/>
    <Block position={[0, 0.08, 0.03]} size={[0.98, 0.1, 0.48]} color="#4b4f50" roughness={0.85}/>
  </group>;
}

function ResistorBoard({ resistance }: { resistance: number }) {
  return <group position={[0.35, 0, -0.35]}>
    <Block position={[0, 0.15, 0]} size={[1.9, 0.14, 1]} color="#bba17a" roughness={0.8} radius={0.026}/>
    <Block position={[0, 0.225, 0]} size={[1.82, 0.012, 0.92]} color="#e5dfcf" roughness={0.9} radius={0.015}/>
    <Rod from={[-0.75, 0.26, 0]} to={[-0.75, 0.43, 0]} radius={0.026} color="#bba86d"/>
    <Rod from={[0.75, 0.26, 0]} to={[0.75, 0.43, 0]} radius={0.026} color="#bba86d"/>
    <Terminal position={[-0.75, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}/><Terminal position={[0.75, 0.26, 0]} color="#33363b" rotation={[-Math.PI / 2, 0, 0]}/>
    <Rod from={[-0.75, 0.43, 0]} to={[0.75, 0.43, 0]} radius={0.013}/>
    <Block position={[0, 0.43, 0]} size={[0.72, 0.24, 0.25]} color="#eeece2" roughness={0.62} radius={0.028}/>
    <Label kind="plate" value={resistance} position={[0, 0.43, 0.128]} size={[0.58, 0.16]}/>
    <Label kind="plate" value={resistance} position={[0, 0.235, 0.31]} size={[0.72, 0.18]} rotation={[-Math.PI / 2, 0, 0]}/>
    {[-0.84, 0.84].flatMap(x => [-0.37, 0.37].map(z => <mesh key={`${x}-${z}`} position={[x, 0.238, z]}><sphereGeometry args={[0.018, 10, 8]}/><meshStandardMaterial color="#999c9b" metalness={0.85} roughness={0.3}/></mesh>))}
  </group>;
}

const CircuitWires = memo(function CircuitWires() {
  return <>
    <Wire color="#a94536" points={[[-2.08, 0.3, 0.12], [-2.0, 0.25, 0.5], [-2.6, 0.06, 1.1], [-2.55, 0.07, 2.2], [-0.995, 0.25, 1.54]]}/>
    <Wire color="#41464a" points={[[-1.405, 0.25, 1.54], [-1.25, 0.1, 1.9], [-0.65, 0.055, 1.7], [-0.5, 0.07, 0.55], [-0.4, 0.38, -0.35]]}/>
    <Wire color="#41464a" points={[[1.1, 0.38, -0.35], [1.35, 0.1, -0.7], [0.8, 0.05, -1.55], [-2.8, 0.06, -1.6], [-3.0, 0.08, -0.1], [-2.6, 0.3, 0.12]]}/>
    <Wire color="#b34a39" points={[[1.905, 0.25, 1.54], [2.55, 0.08, 2.0], [2.5, 0.055, 0.2], [0.35, 0.055, 0.6], [-0.4, 0.38, -0.35]]}/>
    <Wire color="#41464a" points={[[1.495, 0.25, 1.54], [1.2, 0.08, 1.85], [0.7, 0.05, 1.2], [1.1, 0.38, -0.35]]}/>
  </>;
});

function CameraRig({ hooke, view, revision }: { hooke: boolean; view: BenchCamera; revision: number }) {
  const controls = useRef<OrbitControlsType>(null);
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    const target: Point = hooke ? view === 'detail' ? [0.48, 2.6, 0] : [-0.2, 2.25, 0] : view === 'detail' ? [0.35, 0.5, -0.3] : [0, 0.55, 0.15];
    const position: Point = hooke ? view === 'front' ? [-0.2, 2.4, 9.1] : view === 'detail' ? [1.1, 2.9, 3.5] : [5.0, 3.6, 8] : view === 'front' ? [0, 3.5, 8.5] : view === 'detail' ? [2.3, 3.4, 3.8] : [3.5, 5.8, 6.9];
    const aspect = size.width / Math.max(1, size.height);
    const factor = view === 'detail' ? 1 : Math.max(1, (hooke ? 1 : 1.5) / aspect);
    camera.position.set(...position).sub(new Vector3(...target)).multiplyScalar(factor).add(new Vector3(...target));
    camera.lookAt(...target);
    controls.current?.target.set(...target); controls.current?.update(); invalidate();
  }, [hooke, view, revision, camera, size.width, size.height, invalidate]);
  return <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping dampingFactor={0.12} minDistance={2.4} maxDistance={20} minPolarAngle={0.15} maxPolarAngle={Math.PI / 2 - 0.025} onChange={() => invalidate()}/>;
}

function RenderBridge({ requestRender, onContextLost }: { requestRender: MutableRefObject<() => void>; onContextLost: () => void }) {
  const { invalidate, gl } = useThree();
  useEffect(() => { requestRender.current = invalidate; return () => { requestRender.current = () => {}; }; }, [invalidate, requestRender]);
  useEffect(() => { gl.domElement.dataset.rendered = 'true'; }, [gl]);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', onContextLost);
    return () => canvas.removeEventListener('webglcontextlost', onContextLost);
  }, [gl, onContextLost]);
  return null;
}

interface Props {
  hooke: boolean; mass: number; voltage: number; constant: number; powered: boolean;
  onTogglePower: () => void; onVoltageStep: () => void; cameraView: BenchCamera; viewRevision: number;
  motion: MutableRefObject<SpringMotion>; requestRender: MutableRefObject<() => void>; onContextLost: () => void;
}

export default memo(function BenchScene({ hooke, mass, voltage, constant, powered, onTogglePower, onVoltageStep, cameraView, viewRevision, motion, requestRender, onContextLost }: Props) {
  return <Canvas shadows dpr={[1, 1.75]} frameloop="demand" camera={{ position: [5, 4, 8], fov: 34, near: 0.05, far: 60 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.setClearColor(new Color('#ffffff'), 0); }}>
    <color attach="background" args={['#ffffff']}/>
    <ambientLight intensity={0.55}/><hemisphereLight args={['#f4f6ff', '#b4aba0', 1.1]}/>
    <directionalLight position={[-3, 7, 5]} intensity={2.5} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={7} shadow-camera-bottom={-5} shadow-normalBias={0.025} shadow-bias={-0.00015}/>
    <directionalLight position={[5, 4, -2]} intensity={1.2}/>
    <Environment resolution={128} frames={1}><Lightformer form="rect" position={[-4, 6, 2]} scale={[5, 7, 1]} intensity={3} rotation={[0, Math.PI / 3, 0]}/><Lightformer form="rect" position={[5, 3, 0]} scale={[2, 6, 1]} intensity={2} rotation={[0, -Math.PI / 2, 0]}/><Lightformer form="rect" position={[0, 7, -4]} scale={[8, 2, 1]} intensity={2} rotation={[Math.PI / 3, 0, 0]}/></Environment>
    <ContactShadows position={[0, -0.015, 0]} opacity={0.32} scale={12} blur={2.6} far={6} resolution={512} color="#6f747c"/>
    {hooke ? <><SpringStand/><LoadedSpring mass={mass} motion={motion}/></> : <><PowerSupply voltage={voltage} resistance={constant} powered={powered} onPower={onTogglePower} onVoltage={onVoltageStep}/><Multimeter position={[-1.2, 0, 1.3]} current value={powered ? voltage / constant * 1000 : 0}/><Multimeter position={[1.7, 0, 1.3]} current={false} value={powered ? voltage : 0}/><ResistorBoard resistance={constant}/><CircuitWires/></>}
    <CameraRig hooke={hooke} view={cameraView} revision={viewRevision}/><RenderBridge requestRender={requestRender} onContextLost={onContextLost}/>
  </Canvas>;
});
