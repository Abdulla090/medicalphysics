import { Block, Label } from './SceneAssets';
import type { CapturedImage, SimulatorState } from './types';

export function OperatorStation({ state, barrierClosed, exposing, image }: { state: SimulatorState; barrierClosed: boolean; exposing: boolean; image?: CapturedImage }) {
  return <>
    <group position={[2.25, 0, -2.65]}>
      <Block position={[0, 0.81, 0]} size={[1.3, 0.06, 0.6]} color="#dfe5dc" radius={0.02} />
      {[-0.51, 0.51].map(x => <Block key={x} position={[x, 0.4, 0]} size={[0.05, 0.78, 0.48]} color="#9fac9e" radius={0.009} metalness={0.35} />)}
      <Block position={[0, 0.91, -0.05]} size={[0.21, 0.15, 0.11]} color="#53655a" radius={0.014} />
      <Block position={[0, 1.16, -0.055]} size={[0.64, 0.4, 0.039]} color="#41564a" radius={0.022} />
      <Block position={[0, 1.16, -0.032]} size={[0.59, 0.35, 0.008]} color="#243c30" radius={0.004} />
      <Label title={exposing ? 'ACQUIRING IMAGE' : image ? 'IMAGE AVAILABLE  /  V TO REVIEW' : 'RADIOGRAPHY / DR 01'} detail={`${state.kvp} kVp  ${state.ma} mA  ${state.exposureMs} ms`} dark small position={[0, 1.16, -0.025]} width={0.55} height={0.29} />
      <Block position={[-0.09, 0.858, 0.17]} size={[0.42, 0.023, 0.13]} color="#aab9a7" radius={0.012} />
      <Block position={[0.4, 0.88, 0.16]} size={[0.14, 0.077, 0.16]} color="#52694e" radius={0.017} />
      <mesh position={[0.4, 0.925, 0.16]}><sphereGeometry args={[0.028, 20, 16]} /><meshStandardMaterial color={exposing ? '#b88b42' : '#92ae7d'} roughness={0.35} emissive={exposing ? '#957039' : '#5f7954'} emissiveIntensity={0.15} /></mesh>
      <Label title="EXPOSURE SWITCH" position={[0.39, 0.871, 0.247]} width={0.15} height={0.048} small />
    </group>
    <group position={[1.75, 0, -1.75]} rotation={[0, barrierClosed ? 0 : -Math.PI / 2, 0]}>
      <group position={[0.6, 0, 0]}>
        <Block position={[0, 0.79, 0]} size={[1.2, 1.53, 0.043]} color="#becbbd" radius={0.012} metalness={0.17} />
        <mesh position={[0, 1.74, 0]}><boxGeometry args={[1.1, 0.47, 0.012]} /><meshPhysicalMaterial color="#b8d2c9" transparent opacity={0.24} roughness={0.09} depthWrite={false} /></mesh>
        {[-0.59, 0.59].map(x => <Block key={x} position={[x, 1.11, 0]} size={[0.028, 2.16, 0.06]} color="#92a88f" radius={0.005} metalness={0.55} />)}
        <Block position={[0, 2.17, 0]} size={[1.22, 0.034, 0.06]} color="#92a88f" radius={0.007} metalness={0.55} />
        <Block position={[0, 1.47, 0]} size={[1.2, 0.04, 0.047]} color="#92a88f" radius={0.007} metalness={0.55} />
        <Label title="OPERATOR BARRIER" detail="SIMULATED LEAD / OBSERVATION GLASS" position={[0, 1.1, 0.03]} width={0.71} height={0.15} />
        {[-0.5, 0.5].map(x => <Block key={x} position={[x, 0.05, 0]} size={[0.09, 0.065, 0.38]} color="#71876b" radius={0.013} metalness={0.3} />)}
      </group>
    </group>
    <group position={[1.65, 1.3, -1.75]}>
      <Block size={[0.11, 0.15, 0.035]} color="#d8e1d3" radius={0.01} />
      <Block position={[0, 0, 0.022]} size={[0.058, 0.075, 0.012]} color={barrierClosed ? '#779568' : '#a2834c'} radius={0.005} />
      <Label title={barrierClosed ? 'CLOSED' : 'OPEN'} position={[0, -0.1, 0.023]} width={0.14} height={0.04} small />
    </group>
  </>;
}
