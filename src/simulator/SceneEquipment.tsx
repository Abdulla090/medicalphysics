import { useEffect, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Quaternion, Vector3 } from 'three';
import { Block, Cable, Label } from './SceneAssets';
import type { Point3 } from './sceneGeometry';
import { getSceneGeometry } from './sceneGeometry';
import type { SimulatorState } from './types';
import { getObjectDetectorDistance, getProtocol } from './protocols';
import { useSurfaceTexture } from './SceneMaterials';

export type SelectedPart = 'patient' | 'tube' | 'detector' | 'table';

type EquipmentProps = {
  state: SimulatorState;
  exposing: boolean;
  onSelect: (part: SelectedPart) => void;
};

function pick(part: SelectedPart, onSelect: EquipmentProps['onSelect']) {
  return (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.delta < 5) onSelect(part);
  };
}

export function RadiographyTable({ state, exposing, onSelect }: EquipmentProps) {
  const { target, supine } = getSceneGeometry(state);
  const carbon = useSurfaceTexture('carbon');
  const rubber = useSurfaceTexture('rubber');
  return (
    <group position={[-0.45, 0, 0.60]} onClick={pick('table', onSelect)}>
      <Block position={[0, 0.065, 0]} size={[0.74, 0.13, 1.27]} radius={0.065} color="#c5ccca" metalness={0.15} roughness={0.48} />
      <Block position={[0, 0.14, 0]} size={[0.48, 0.058, 0.93]} radius={0.025} color="#798b89" metalness={0.5} />
      <Block position={[0, 0.37, 0]} size={[0.47, 0.46, 0.67]} radius={0.047} color="#e5e9e6" />
      <Block position={[0, 0.58, 0]} size={[0.45, 0.08, 0.69]} radius={0.024} color="#b4bfbc" metalness={0.3} />
      <Block position={[0, 0.684, 0]} size={[0.62, 0.16, 1.12]} radius={0.035} color="#d8dfdb" />
      <Block position={[0, 0.755, 0]} size={[0.76, 0.06, 2.30]} radius={0.025} color="#a0b0ae" metalness={0.4} roughness={0.35} />
      <Block position={[0, 0.797, 0]} size={[0.80, 0.046, 2.35]} radius={0.028} color="#29373a" metalness={0.11} roughness={0.37} />
      <mesh position={[0, 0.824, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.75, 2.27]} />
        <meshStandardMaterial map={carbon} bumpMap={carbon} bumpScale={0.0014} metalness={0.15} roughness={0.38} />
      </mesh>
      {[-0.402, 0.402].map((x) => <Block key={x} position={[x, 0.751, 0]} size={[0.018, 0.023, 2.07]} radius={0.004} color="#bbc7c5" metalness={0.8} roughness={0.23} />)}
      <Block position={[0.267, 0.24, 0.27]} size={[0.038, 0.076, 0.225]} radius={0.012} color="#45645e" />
      <Block position={[0.267, 0.24, -0.06]} size={[0.038, 0.076, 0.225]} radius={0.012} color="#45645e" />
      <Block position={[0, 0.785, -1.03]} size={[0.67, 0.012, 0.036]} radius={0.004} color="#9baaaa" />
      {[-0.32, 0.32].map((x) => <group key={x}>
        <Block position={[x, 0.688, 0]} size={[0.028, 0.035, 1.64]} color="#4b5d5b" radius={0.005} metalness={0.8} roughness={0.24} />
        {[-0.88, 0.88].map((z) => <mesh key={z} position={[x, 0.758, z]}>
          <cylinderGeometry args={[0.012, 0.012, 0.006, 8]} />
          <meshStandardMaterial color="#d2d9d6" metalness={0.85} roughness={0.2} />
        </mesh>)}
      </group>)}
      <Block position={[0, 0.48, 0.338]} size={[0.35, 0.006, 0.003]} color="#9aaaa6" radius={0.001} />
      <Block position={[0, 0.26, 0.338]} size={[0.35, 0.006, 0.003]} color="#9aaaa6" radius={0.001} />
      <Block position={[0.35, 0.11, 0.19]} size={[0.12, 0.036, 0.35]} color="#344d46" radius={0.012} />
      <Block position={[0.35, 0.131, 0.10]} size={[0.095, 0.008, 0.10]} color="#819f8c" radius={0.005} />
      <Block position={[0.35, 0.131, 0.28]} size={[0.095, 0.008, 0.10]} color="#819f8c" radius={0.005} />
      {/* Foot control and local equipment state stay within the existing table footprint. */}
      <mesh position={[0.353, 0.136, 0.193]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.09, 0.07]} /><meshStandardMaterial map={rubber} color="#b6c7bd" roughness={0.92} /></mesh>
      <mesh position={[0.321, 0.644, -0.32]} rotation={[0, Math.PI / 2, 0]}><circleGeometry args={[0.016, 20]} /><meshStandardMaterial color={exposing ? '#f7bf68' : state.detectorReady ? '#86bd9a' : '#dbbc84'} emissive={exposing ? '#d9954b' : state.detectorReady ? '#649b7d' : '#b49356'} emissiveIntensity={0.75} /></mesh>
      <Block position={[0.31, 0.59, -0.32]} size={[0.012, 0.035, 0.16]} color="#6d8981" radius={0.003} />
      <Label title="FLOATING TOP  /  CARBON FIBRE" position={[0, 0.54, 0.361]} width={0.39} height={0.08} small />
      <Label title="DR 01" position={[0.35, 0.75, 0.12]} rotation={[0, Math.PI / 2, 0]} width={0.30} height={0.073} small />
      {supine ? (
        <group position={[0, 0.775, target[2] - 0.60]} onClick={pick('detector', onSelect)}>
          <Block size={[0.52, 0.024, 0.58]} radius={0.016} color="#b5c5c1" metalness={0.35} />
          <Block position={[0, -0.026, 0.29]} size={[0.55, 0.062, 0.018]} radius={0.006} color="#4c6c66" />
          <Block position={[0.292, -0.025, 0.14]} size={[0.065, 0.022, 0.18]} radius={0.005} color="#a0b4ac" />
          {state.grid ? <Block position={[0, 0.023, 0]} size={[0.48, 0.008, 0.54]} radius={0.007} color="#627c73" /> : null}
        </group>
      ) : null}
    </group>
  );
}

export function WallBucky({ state, onSelect }: EquipmentProps) {
  const { target, supine } = getSceneGeometry(state);
  const height = supine ? 1.30 : target[1];
  return (
    <group position={[0.65, 0, -2.15]} onClick={pick('detector', onSelect)}>
      <Block position={[0, 0.062, -0.18]} size={[0.71, 0.12, 0.40]} radius={0.023} color="#bccac4" metalness={0.2} />
      <Block position={[0, 1.36, -0.265]} size={[0.21, 2.61, 0.17]} radius={0.025} color="#e4e9e6" />
      <Block position={[0.013, 1.36, -0.169]} size={[0.082, 2.42, 0.017]} radius={0.004} color="#a5b7b3" metalness={0.55} roughness={0.29} />
      {Array.from({ length: 12 }, (_, index) => <Block key={index} position={[-0.083, 0.34 + index * 0.16, -0.173]} size={[index % 5 === 0 ? 0.055 : 0.03, 0.003, 0.004]} radius={0.001} color="#5e7770" />)}
      {[0.6, 1.4, 2.2].map((height, index) => <Label key={height} title={`${60 + index * 80} cm`} position={[-0.21, height, -0.164]} width={0.11} height={0.04} small />)}
      <group position={[0, height, 0]}>
        <Block position={[0, 0, -0.082]} size={[0.66, 0.67, 0.15]} radius={0.032} color="#e4e9e5" />
        <Block position={[0, 0, -0.006]} size={[0.48, 0.54, 0.015]} radius={0.022} color="#8da9a1" roughness={0.32} />
        <Block position={[0, 0, 0.002]} size={[0.43, 0.49, 0.007]} radius={0.014} color="#dae3de" roughness={0.37} />
        <Block position={[0, -0.284, 0.013]} size={[0.29, 0.038, 0.011]} radius={0.008} color="#8ba79d" />
        <Block position={[0.345, -0.094, -0.02]} size={[0.030, 0.19, 0.040]} radius={0.012} color="#52796d" metalness={0.3} />
        <Block position={[-0.345, -0.094, -0.02]} size={[0.030, 0.19, 0.040]} radius={0.012} color="#52796d" metalness={0.3} />
        <Block position={[0, 0, 0.021]} size={[0.037, 0.002, 0.001]} radius={0.0004} color="#6e8b7e" />
        <Block position={[0, 0, 0.021]} size={[0.002, 0.037, 0.001]} radius={0.0004} color="#6e8b7e" />
        {[-1, 1].map((side) => <group key={side}>
          <Cable points={[[side * 0.27, 0.25, -0.12], [side * 0.39, 0.31, -0.10], [side * 0.43, 0.48, -0.10], [side * 0.34, 0.53, -0.14]]} color="#789489" radius={0.018} />
          {[-1, 1].map((vertical) => <group key={vertical} position={[side * 0.19, vertical * 0.215, 0.021]}>
            <Block size={[0.036, 0.003, 0.001]} color="#668174" radius={0.0004} />
            <Block position={[side * 0.016, -vertical * 0.016, 0]} size={[0.003, 0.035, 0.001]} color="#668174" radius={0.0004} />
          </group>)}
        </group>)}
        <mesh position={[0.248, 0.275, 0.001]}>
          <circleGeometry args={[0.013, 18]} />
          <meshStandardMaterial color={state.detectorReady ? '#73aa8e' : '#c49e63'} emissive={state.detectorReady ? '#407d68' : '#c49e63'} emissiveIntensity={0.3} />
        </mesh>
        <Block position={[0.217, 0.324, 0.015]} size={[0.118, 0.027, 0.007]} color={state.detectorReady ? '#b3d6c3' : '#d8bd88'} radius={0.005} />
        {state.grid ? (
          <group position={[0, 0, 0.016]}>
            <Block size={[0.45, 0.51, 0.002]} radius={0.01} color="#d0dbd5" roughness={0.7} />
            {Array.from({ length: 9 }, (_, i) => <Block key={i} position={[-0.2 + i * 0.05, 0, 0.002]} size={[0.0008, 0.47, 0.001]} radius={0.0003} color="#bccbc2" />)}
          </group>
        ) : null}
        <Label title="DIGITAL RECEPTOR" position={[-0.018, 0.333, 0.002]} width={0.51} height={0.071} small />
        <Label title="L" position={[0.267, 0.186, 0.005]} width={0.041} height={0.07} small />
      </group>
      <Cable points={[[-0.13, height - 0.2, -0.20], [-0.22, height - 0.50, -0.25], [-0.15, 0.18, -0.23], [0, 0.11, -0.10]]} radius={0.012} color="#455857" />
    </group>
  );
}

export function TubeAssembly({ state, exposing, onSelect }: EquipmentProps) {
  const { source, target } = useMemo(() => getSceneGeometry(state), [state]);
  const direction = useMemo(() => new Vector3(...target).sub(new Vector3(...source)).normalize(), [source, target]);
  const rotation = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, 0, -1), direction), [direction]);
  const jointY = source[1] + 0.22;
  const telescopeLength = Math.max(0.18, 3.11 - jointY);
  const segments = 4;
  return (
    <group onClick={pick('tube', onSelect)}>
      {[-1.36, 1.36].map((x) => (
        <group key={x}>
          <Block position={[x, 3.34, -0.30]} size={[0.10, 0.10, 4.65]} radius={0.016} color="#cbd2ce" metalness={0.3} />
          <Block position={[x, 3.28, -0.30]} size={[0.043, 0.037, 4.52]} radius={0.005} color="#8eaba7" metalness={0.75} roughness={0.25} />
          {[-2.28, 1.54].map((z) => <Block key={z} position={[x, 3.40, z]} size={[0.17, 0.08, 0.20]} radius={0.005} color="#b1c2bb" />)}
        </group>
      ))}
      <Block position={[0, 3.19, source[2]]} size={[2.97, 0.115, 0.22]} radius={0.018} color="#dce3e0" metalness={0.23} />
      <Block position={[0, 3.121, source[2] + 0.079]} size={[2.75, 0.016, 0.016]} radius={0.004} color="#8aa19b" metalness={0.7} />
      <Block position={[source[0], 3.108, source[2]]} size={[0.43, 0.12, 0.41]} radius={0.026} color="#d5ded8" />
      {Array.from({ length: segments }, (_, index) => {
        const length = telescopeLength / segments + 0.08;
        const segmentSize = 0.25 - index * 0.038;
        return <Block key={index} position={[source[0], 3.07 - telescopeLength / segments * (index + 0.5), source[2]]} size={[segmentSize, length, segmentSize]} radius={0.008} color={index % 2 ? '#a1b1b0' : '#e1e6e4'} metalness={index % 2 ? 0.5 : 0.1} roughness={0.35} />;
      })}
      <Block position={[source[0], jointY, source[2]]} size={[0.32, 0.13, 0.30]} radius={0.033} color="#e3e8e5" metalness={0.15} />
      <Cable points={[[source[0] + 0.20, 3.11, source[2] + 0.06], [source[0] + 0.34, 2.82, source[2] + 0.15], [source[0] + 0.31, jointY + 0.27, source[2] + 0.16], [source[0] + 0.16, jointY, source[2] + 0.15]]} radius={0.012} />
      <group position={source} quaternion={rotation}>
        <Block position={[0, 0.058, 0.15]} size={[0.60, 0.29, 0.40]} radius={0.065} color="#eef0ec" metalness={0.1} roughness={0.28} />
        <Block position={[-0.315, 0.058, 0.14]} size={[0.055, 0.20, 0.28]} radius={0.025} color="#5d7d76" metalness={0.25} />
        <Block position={[0.315, 0.058, 0.14]} size={[0.055, 0.20, 0.28]} radius={0.025} color="#5d7d76" metalness={0.25} />
        {[-1, 1].map((side) => <group key={side}>
          <mesh position={[side * 0.348, 0.058, 0.14]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.071, 0.071, 0.018, 32]} />
            <meshStandardMaterial color="#becac7" metalness={0.8} roughness={0.25} />
          </mesh>
          <mesh position={[side * 0.36, 0.058, 0.14]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.031, 0.031, 0.01, 24]} />
            <meshStandardMaterial color="#3c5652" metalness={0.5} roughness={0.3} />
          </mesh>
          {Array.from({ length: 6 }, (_, index) => <Block key={index} position={[side * 0.305, 0.13 - index * 0.027, 0.264]} size={[0.042, 0.007, 0.022]} radius={0.002} color="#425b56" />)}
        </group>)}
        <Block position={[0, -0.073, -0.05]} size={[0.27, 0.18, 0.20]} radius={0.026} color="#354c4b" metalness={0.28} roughness={0.4} />
        <Block position={[0, -0.07, -0.163]} size={[0.225, 0.14, 0.037]} radius={0.017} color="#72938a" metalness={0.5} roughness={0.25} />
        <Block position={[0, -0.07, -0.187]} size={[0.112, 0.078, 0.009]} radius={0.008} color="#1f3035" roughness={0.8} />
        <Block position={[0, -0.068, -0.193]} size={[0.079, 0.048, 0.002]} radius={0.002} color="#52615c" roughness={0.18} metalness={0.2} />
        {/* The shutter aperture reflects the selected collimation width and height. */}
        {[-1, 1].map((side) => <group key={side}>
          <Block position={[side * (0.038 - Math.min(0.026, state.collimationWidth * 0.00055)), -0.068, -0.197]} size={[0.009, 0.057, 0.003]} radius={0.002} color="#c2d0c3" metalness={0.65} />
          <Block position={[0, -0.068 + side * (0.025 - Math.min(0.019, state.collimationHeight * 0.0004)), -0.198]} size={[0.086, 0.007, 0.003]} radius={0.002} color="#c2d0c3" metalness={0.65} />
        </group>)}
        <Block position={[0, 0.065, 0.36]} size={[0.30, 0.16, 0.024]} radius={0.02} color="#34534d" metalness={0.3} roughness={0.22} />
        <Block position={[0, 0.065, 0.375]} size={[0.268, 0.131, 0.006]} radius={0.005} color="#223b3b" roughness={0.35} />
        <Label title={`${state.kvp} kV  /  ${(state.ma * state.exposureMs / 1000).toFixed(1)} mAs`} detail={exposing ? 'EXPOSURE IN PROGRESS' : `${state.sid} cm SID   |   ${state.tubeAngle > 0 ? '+' : ''}${state.tubeAngle} deg`} position={[0, 0.066, 0.38]} width={0.24} height={0.094} dark small />
        <Cable points={[[-0.33, -0.02, 0.24], [-0.36, -0.20, 0.24], [0.36, -0.20, 0.24], [0.33, -0.02, 0.24]]} radius={0.02} color="#58776d" />
        <Block position={[0, -0.205, 0.24]} size={[0.23, 0.038, 0.044]} radius={0.017} color="#344c47" roughness={0.82} />
        <mesh position={[0.221, 0.158, 0.353]}>
          <circleGeometry args={[0.011, 16]} />
          <meshStandardMaterial color={exposing ? '#dda656' : '#83ba9d'} emissive={exposing ? '#bd823f' : '#529e7c'} emissiveIntensity={0.6} />
        </mesh>
        <Label title="TUBE / DR-01" position={[-0.06, 0.214, 0.164]} rotation={[-Math.PI / 2, 0, 0]} width={0.35} height={0.08} small />
        {[-0.08, 0.08].map((x) => <mesh key={x} position={[x, -0.093, 0.034]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.024, 0.024, 0.054, 16]} /><meshStandardMaterial color="#849e93" roughness={0.42} metalness={0.4} /></mesh>)}
      </group>
    </group>
  );
}

function FieldLines({ corners, center, supine }: { corners: Point3[]; center: Point3; supine: boolean }) {
  const positions = useMemo(() => {
    const result: number[] = [];
    for (let i = 0; i < 4; i++) result.push(...corners[i], ...corners[(i + 1) % 4]);
    result.push(center[0] - 0.025, center[1], center[2], center[0] + 0.025, center[1], center[2]);
    if (supine) result.push(center[0], center[1], center[2] - 0.025, center[0], center[1], center[2] + 0.025);
    else result.push(center[0], center[1] - 0.025, center[2], center[0], center[1] + 0.025, center[2]);
    return new Float32BufferAttribute(result, 3);
  }, [corners, center, supine]);
  return <lineSegments renderOrder={5}><bufferGeometry><primitive attach="attributes-position" object={positions} /></bufferGeometry><lineBasicMaterial color="#f6f2ce" transparent opacity={0.84} depthTest={false} toneMapped={false} /></lineSegments>;
}

export function CollimatorField({ state }: { state: SimulatorState }) {
  const { source, target, supine } = useMemo(() => getSceneGeometry(state), [state]);
  const fieldWidth = state.collimationWidth / 200;
  const fieldHeight = state.collimationHeight / 200;
  // Project the visible setup light to the entrance surface; it is not ionising radiation.
  const rotation = state.patientRotation * Math.PI / 180;
  const lateral = getProtocol(state.protocol).projection === 'LAT';
  const entranceRadius = Math.hypot((lateral ? 17 : 11) * Math.cos(rotation), (lateral ? 11 : 17) * Math.sin(rotation)) * state.patientSize;
  const depth = (getObjectDetectorDistance(state) + entranceRadius) / 100;
  const axialDistance = state.sid / 100 * Math.cos(state.tubeAngle * Math.PI / 180);
  const scale = (axialDistance - depth) / axialDistance;
  const center = useMemo<Point3>(() => supine
    ? [target[0], target[1] + depth, target[2] + (source[2] - target[2]) * depth / axialDistance]
    : [target[0], target[1] + (source[1] - target[1]) * depth / axialDistance, target[2] + depth], [supine, target, source, depth, axialDistance]);
  const corners = useMemo<Point3[]>(() => supine
    ? [[center[0] - fieldWidth * scale, center[1], center[2] - fieldHeight * scale], [center[0] + fieldWidth * scale, center[1], center[2] - fieldHeight * scale], [center[0] + fieldWidth * scale, center[1], center[2] + fieldHeight * scale], [center[0] - fieldWidth * scale, center[1], center[2] + fieldHeight * scale]]
    : [[center[0] - fieldWidth * scale, center[1] - fieldHeight * scale, center[2]], [center[0] + fieldWidth * scale, center[1] - fieldHeight * scale, center[2]], [center[0] + fieldWidth * scale, center[1] + fieldHeight * scale, center[2]], [center[0] - fieldWidth * scale, center[1] + fieldHeight * scale, center[2]]], [center, fieldWidth, fieldHeight, scale, supine]);
  const geometry = useMemo(() => {
    const points: number[] = [];
    for (let i = 0; i < 4; i++) points.push(...source, ...corners[i], ...corners[(i + 1) % 4]);
    const result = new BufferGeometry();
    result.setAttribute('position', new Float32BufferAttribute(points, 3));
    return result;
  }, [source, corners]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (!state.lightField) return null;
  return (
    <group>
      <mesh geometry={geometry} renderOrder={3}>
        <meshBasicMaterial color="#efeace" transparent opacity={0.019} side={DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={center} rotation={supine ? [-Math.PI / 2, 0, 0] : undefined} renderOrder={4}>
        <planeGeometry args={[fieldWidth * 2 * scale, fieldHeight * 2 * scale]} />
        <meshBasicMaterial color="#efe9c3" transparent opacity={0.07} side={DoubleSide} depthWrite={false} />
      </mesh>
      <FieldLines corners={corners} center={center} supine={supine} />
    </group>
  );
}
