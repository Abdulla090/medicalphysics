import { Component, memo, useEffect, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Html, Lightformer } from '@react-three/drei';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { RoomArchitecture } from './SceneAssets';
import { CollimatorField, RadiographyTable, TubeAssembly, WallBucky, type SelectedPart } from './SceneEquipment';
import { PatientModel } from './PatientModel';
import { SceneControls } from './SceneControls';
import { getSceneGeometry } from './sceneGeometry';
import type { CameraView, CapturedImage, SimulatorState } from './types';
import { OperatorStation } from './OperatorStation';
import { WorldInteractions, type WorldInteractionProps } from './WorldInteractions';

interface XraySceneProps {
  state: SimulatorState;
  view: CameraView;
  cameraReset: number;
  exposing: boolean;
  onSelect: (part: SelectedPart) => void;
  onWalkChange?: (walking: boolean) => void;
  world: Omit<WorldInteractionProps, 'state' | 'enabled' | 'disabled'>;
  latestImage?: CapturedImage;
}

class SceneBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="sim-webgl-fallback"><strong>The 3D room could not start</strong><p>This simulator needs WebGL and hardware acceleration. Reload the room or try a current browser.</p><button className="sim-outline-button" onClick={this.props.onRetry}>Reload 3D room</button></div>;
    return this.props.children;
  }
}

function ContextWatcher({ onLost }: { onLost: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onLost(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onLost]);
  return null;
}

const RoomPatient = memo(function RoomPatient({ state, onSelect }: Pick<XraySceneProps, 'state' | 'onSelect'>) {
  const geometry = getSceneGeometry(state);
  return <group position={geometry.patientPosition} rotation={geometry.patientRotation} onClick={(event) => { event.stopPropagation(); if (event.delta < 5) onSelect('patient'); }}>
    <group rotation={[0, state.patientRotation * Math.PI / 180, 0]}><PatientModel state={state} /></group>
  </group>;
});

function EquipmentLabels({ state }: { state: SimulatorState }) {
  const { source, target, supine } = getSceneGeometry(state);
  if (!state.showLabels) return null;
  return <group>
    <Html position={[source[0] + 0.54, source[1] + 0.13, source[2]]} center zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}><div className="sim-object-label">01<span>Ceiling tube</span></div></Html>
    <Html position={[target[0] + (supine ? 0.55 : 0.53), target[1] - 0.25, target[2]]} center zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}><div className="sim-object-label">02<span>{supine ? 'Table receptor' : 'Digital receptor'}</span></div></Html>
  </group>;
}

const RoomLighting = memo(function RoomLighting() {
  return <Environment resolution={128} frames={1}>
    <Lightformer form="rect" intensity={2.5} position={[0, 4, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 4, 1]} color="#fffaf0" />
    <Lightformer form="rect" intensity={1.5} position={[-4, 2, 0]} rotation={[0, Math.PI / 2, 0]} scale={[4, 3, 1]} color="#d9e9eb" />
    <Lightformer form="rect" intensity={1} position={[3, 2, 2]} rotation={[0, -Math.PI / 3, 0]} scale={[3, 2, 1]} color="#eef1e6" />
  </Environment>;
});

function SceneContents(props: XraySceneProps & { onLost: () => void }) {
  const { gl, invalidate } = useThree();
  useEffect(() => { gl.shadowMap.needsUpdate = true; invalidate(); }, [gl, invalidate, props.state, props.world.barrierClosed]);
  return <>
    <color attach="background" args={['#e1e5dc']} />
    <ambientLight intensity={0.65} color="#f5f6ec" />
    <hemisphereLight args={['#f6f8f1', '#a4b4a0', 0.85]} />
    <directionalLight position={[-3.1, 6.5, 3.8]} intensity={1.35} color="#fff8e9" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0003} shadow-normalBias={0.025} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-camera-near={0.5} shadow-camera-far={18} shadow-radius={4} />
    <directionalLight position={[3.3, 3.1, -1.8]} intensity={0.75} color="#dce8ef" />
    <RoomLighting />
    <RoomArchitecture exposing={props.exposing} />
    <RadiographyTable {...props} />
    <WallBucky {...props} />
    <TubeAssembly {...props} />
    <RoomPatient state={props.state} onSelect={props.onSelect} />
    <CollimatorField state={props.state} />
    <EquipmentLabels state={props.state} />
    <OperatorStation state={props.state} barrierClosed={props.world.barrierClosed} exposing={props.exposing} image={props.latestImage} />
    <SceneControls state={props.state} view={props.view} cameraReset={props.cameraReset} onWalkChange={props.onWalkChange} barrierClosed={props.world.barrierClosed} paused={props.world.paused} />
    <WorldInteractions {...props.world} state={props.state} enabled={props.view === 'first-person'} disabled={props.exposing} />
    <ContextWatcher onLost={props.onLost} />
  </>;
}

export default function XrayScene(props: XraySceneProps) {
  const [lost, setLost] = useState(false);
  const [generation, setGeneration] = useState(0);
  const reload = () => { setLost(false); setGeneration((value) => value + 1); };
  return <div className="sim-three-room" data-camera-view={props.view}>
    <SceneBoundary key={generation} onRetry={reload}>
      {lost ? <div className="sim-webgl-fallback"><strong>The graphics connection was interrupted</strong><p>Your settings and captured images are preserved.</p><button className="sim-outline-button" onClick={reload}>Reconnect 3D room</button></div> : <Canvas
        shadows
        frameloop="demand"
        dpr={[1, props.view === 'first-person' ? 1.25 : 1.5]}
        camera={{ position: [4.12, 2.57, 4.31], fov: 43, near: 0.025, far: 40 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
        onCreated={({ gl }) => { gl.toneMappingExposure = 1.05; gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true; }}
        fallback={<div className="sim-webgl-fallback"><strong>WebGL is unavailable</strong><p>Enable browser hardware acceleration to enter the 3D room.</p></div>}
      ><SceneContents {...props} onLost={() => setLost(true)} /></Canvas>}
    </SceneBoundary>
  </div>;
}
