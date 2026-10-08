import { useEffect, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Quaternion, Vector3 } from 'three';
import { Block, Cable, Label } from './SceneAssets';
import type { Point3 } from './sceneGeometry';
import { getSceneGeometry } from './sceneGeometry';
import type { SimulatorState } from './types';
import { getObjectDetectorDistance, getProtocol } from './protocols';

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

export function RadiographyTable({ state, onSelect }: EquipmentProps) {
  const { target, supine } = getSceneGeometry(state);
  return (
    <group position={[-0.45, 0, 0.60]} onClick={pick('table', onSelect)}>
      <Block position={[0, 0.065, 0]} size={[0.74, 0.13, 1.27]} radius={0.065} color="#cbd4c7" metalness={0.15} roughness={0.48} />
      <Block position={[0, 0.14, 0]} size={[0.48, 0.058, 0.93]} radius={0.025} color="#8fa095" metalness={0.5} />
      <Block position={[0, 0.37, 0]} size={[0.47, 0.46, 0.67]} radius={0.047} color="#e1e5db" />
      <Block position={[0, 0.58, 0]} size={[0.45, 0.08, 0.69]} radius={0.024} color="#a9b6aa" metalness={0.3} />
      <Block position={[0, 0.684, 0]} size={[0.62, 0.16, 1.12]} radius={0.035} color="#d0d9cc" />
      <Block position={[0, 0.755, 0]} size={[0.76, 0.06, 2.30]} radius={0.025} color="#aab9ac" metalness={0.4} roughness={0.35} />
      <Block position={[0, 0.797, 0]} size={[0.80, 0.046, 2.35]} radius={0.028} color="#44524c" metalness={0.11} roughness={0.37} />
      <Block position={[0, 0.819, 0]} size={[0.75, 0.007, 2.27]} radius={0.015} color="#52605a" roughness={0.64} />
      {[-0.402, 0.402].map((x) => <Block key={x} position={[x, 0.751, 0]} size={[0.018, 0.023, 2.07]} radius={0.004} color="#bec7bd" metalness={0.8} roughness={0.23} />)}
      <Block position={[0.267, 0.24, 0.27]} size={[0.038, 0.076, 0.225]} radius={0.012} color="#687d6d" />
      <Block position={[0.267, 0.24, -0.06]} size={[0.038, 0.076, 0.225]} radius={0.012} color="#687d6d" />
      <Block position={[0, 0.785, -1.03]} size={[0.67, 0.012, 0.036]} radius={0.004} color="#929f91" />
      <Label title="FLOATING TOP  /  CARBON FIBRE" position={[0, 0.54, 0.361]} width={0.39} height={0.08} small />
      <Label title="DR 01" position={[0.35, 0.75, 0.12]} rotation={[0, Math.PI / 2, 0]} width={0.30} height={0.073} small />
      {supine ? (
        <group position={[0, 0.775, target[2] - 0.60]} onClick={pick('detector', onSelect)}>
          <Block size={[0.52, 0.024, 0.58]} radius={0.016} color="#b3c1b3" metalness={0.35} />
          <Block position={[0, -0.026, 0.29]} size={[0.55, 0.062, 0.018]} radius={0.006} color="#70856f" />
          <Block position={[0.292, -0.025, 0.14]} size={[0.065, 0.022, 0.18]} radius={0.005} color="#9bac98" />
          {state.grid ? <Block position={[0, 0.023, 0]} size={[0.48, 0.008, 0.54]} radius={0.007} color="#788779" /> : null}
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
      <Block position={[0, 0.062, -0.18]} size={[0.71, 0.12, 0.40]} radius={0.023} color="#c1ccbf" metalness={0.2} />
      <Block position={[0, 1.36, -0.265]} size={[0.21, 2.61, 0.17]} radius={0.025} color="#d9e0d3" />
      <Block position={[0.013, 1.36, -0.169]} size={[0.082, 2.42, 0.017]} radius={0.004} color="#9eaf9e" metalness={0.55} roughness={0.29} />
      {Array.from({ length: 12 }, (_, index) => <Block key={index} position={[-0.083, 0.34 + index * 0.16, -0.173]} size={[0.03, 0.003, 0.004]} radius={0.001} color="#6f866f" />)}
      <group position={[0, height, 0]}>
        <Block position={[0, 0, -0.082]} size={[0.66, 0.67, 0.15]} radius={0.032} color="#d7dfd1" />
        <Block position={[0, 0, -0.006]} size={[0.48, 0.54, 0.015]} radius={0.022} color="#b4c2b0" roughness={0.32} />
        <Block position={[0, 0, 0.002]} size={[0.43, 0.49, 0.007]} radius={0.014} color="#d8e1d2" roughness={0.37} />
        <Block position={[0, -0.284, 0.013]} size={[0.29, 0.038, 0.011]} radius={0.008} color="#adbca7" />
        <Block position={[0.345, -0.094, -0.02]} size={[0.030, 0.19, 0.040]} radius={0.012} color="#94a990" metalness={0.3} />
        <Block position={[-0.345, -0.094, -0.02]} size={[0.030, 0.19, 0.040]} radius={0.012} color="#94a990" metalness={0.3} />
        <mesh position={[0.248, 0.275, 0.001]}>
          <circleGeometry args={[0.013, 18]} />
          <meshStandardMaterial color={state.detectorReady ? '#8ca987' : '#c49e63'} emissive={state.detectorReady ? '#6e8c6b' : '#c49e63'} emissiveIntensity={0.3} />
        </mesh>
        {state.grid ? (
          <group position={[0, 0, 0.016]}>
            <Block size={[0.45, 0.51, 0.002]} radius={0.01} color="#c8d2c1" roughness={0.7} />
            {Array.from({ length: 9 }, (_, i) => <Block key={i} position={[-0.2 + i * 0.05, 0, 0.002]} size={[0.0008, 0.47, 0.001]} radius={0.0003} color="#bcc8b5" />)}
          </group>
        ) : null}
        <Label title="DIGITAL RECEPTOR" position={[-0.018, 0.333, 0.002]} width={0.51} height={0.071} small />
        <Label title="L" position={[0.267, 0.186, 0.005]} width={0.041} height={0.07} small />
      </group>
      <Cable points={[[-0.13, height - 0.2, -0.20], [-0.22, height - 0.50, -0.25], [-0.15, 0.18, -0.23], [0, 0.11, -0.10]]} radius={0.012} color="#667c65" />
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
          <Block position={[x, 3.34, -0.30]} size={[0.10, 0.10, 4.65]} radius={0.016} color="#c3cdc2" metalness={0.3} />
          <Block position={[x, 3.28, -0.30]} size={[0.043, 0.037, 4.52]} radius={0.005} color="#8c9f8e" metalness={0.75} roughness={0.25} />
          {[-2.28, 1.54].map((z) => <Block key={z} position={[x, 3.40, z]} size={[0.17, 0.08, 0.20]} radius={0.005} color="#afbda9" />)}
        </group>
      ))}
      <Block position={[0, 3.19, source[2]]} size={[2.97, 0.115, 0.22]} radius={0.018} color="#d5ded0" metalness={0.23} />
      <Block position={[0, 3.121, source[2] + 0.079]} size={[2.75, 0.016, 0.016]} radius={0.004} color="#91a08e" metalness={0.7} />
      <Block position={[source[0], 3.108, source[2]]} size={[0.43, 0.12, 0.41]} radius={0.026} color="#cbd7c3" />
      {Array.from({ length: segments }, (_, index) => {
        const length = telescopeLength / segments + 0.08;
        const segmentSize = 0.25 - index * 0.038;
        return <Block key={index} position={[source[0], 3.07 - telescopeLength / segments * (index + 0.5), source[2]]} size={[segmentSize, length, segmentSize]} radius={0.008} color={index % 2 ? '#b5c1b2' : '#dce4d6'} metalness={index % 2 ? 0.5 : 0.1} roughness={0.35} />;
      })}
      <Block position={[source[0], jointY, source[2]]} size={[0.32, 0.13, 0.30]} radius={0.033} color="#dce3d4" metalness={0.15} />
      <Cable points={[[source[0] + 0.20, 3.11, source[2] + 0.06], [source[0] + 0.34, 2.82, source[2] + 0.15], [source[0] + 0.31, jointY + 0.27, source[2] + 0.16], [source[0] + 0.16, jointY, source[2] + 0.15]]} radius={0.012} />
      <group position={source} quaternion={rotation}>
        <Block position={[0, 0.058, 0.15]} size={[0.60, 0.29, 0.40]} radius={0.065} color="#e4eade" metalness={0.1} roughness={0.28} />
        <Block position={[-0.315, 0.058, 0.14]} size={[0.055, 0.20, 0.28]} radius={0.025} color="#a4b8a0" metalness={0.25} />
        <Block position={[0.315, 0.058, 0.14]} size={[0.055, 0.20, 0.28]} radius={0.025} color="#a4b8a0" metalness={0.25} />
        <Block position={[0, -0.073, -0.05]} size={[0.27, 0.18, 0.20]} radius={0.026} color="#5d7060" metalness={0.28} roughness={0.4} />
        <Block position={[0, -0.07, -0.163]} size={[0.225, 0.14, 0.037]} radius={0.017} color="#829479" metalness={0.5} roughness={0.25} />
        <Block position={[0, -0.07, -0.187]} size={[0.112, 0.078, 0.009]} radius={0.008} color="#253932" roughness={0.8} />
        <Block position={[0, 0.065, 0.36]} size={[0.30, 0.16, 0.024]} radius={0.02} color="#536956" metalness={0.3} roughness={0.22} />
        <Block position={[0, 0.065, 0.375]} size={[0.268, 0.131, 0.006]} radius={0.005} color="#2c4238" roughness={0.35} />
        <Label title={`${state.kvp} kV  /  ${(state.ma * state.exposureMs / 1000).toFixed(1)} mAs`} detail={exposing ? 'EXPOSURE IN PROGRESS' : `${state.sid} cm SID   |   ${state.tubeAngle > 0 ? '+' : ''}${state.tubeAngle} deg`} position={[0, 0.066, 0.38]} width={0.24} height={0.094} dark small />
        <Cable points={[[-0.33, -0.02, 0.24], [-0.36, -0.20, 0.24], [0.36, -0.20, 0.24], [0.33, -0.02, 0.24]]} radius={0.02} color="#889c81" />
        <Label title="TUBE / DR-01" position={[-0.06, 0.214, 0.164]} rotation={[-Math.PI / 2, 0, 0]} width={0.35} height={0.08} small />
        {[-0.08, 0.08].map((x) => <mesh key={x} position={[x, -0.093, 0.034]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.024, 0.024, 0.054, 16]} /><meshStandardMaterial color="#8da280" roughness={0.42} metalness={0.4} /></mesh>)}
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
