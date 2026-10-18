import { RENDER_PROFILES, type RenderQuality } from './session/renderQuality';
import { Component, memo, useEffect, useRef, useState, type ReactNode, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, Lightformer } from '@react-three/drei';
import { ACESFilmicToneMapping, Euler, Group, PCFSoftShadowMap, Quaternion, SRGBColorSpace, Vector3 } from 'three';
import { RoomArchitecture } from './SceneAssets';
import { CollimatorField, RadiographyTable, TubeAssembly, WallBucky, type SelectedPart } from './SceneEquipment';
import { PatientModel } from './PatientModel';
import { SceneControls } from './SceneControls';
import { getSceneGeometry } from './sceneGeometry';
import type { CameraView, CapturedImage, SimulatorState } from './types';
import { OperatorStation } from './OperatorStation';
import { WorldInteractions, type WorldInteractionProps } from './WorldInteractions';
import { HospitalWorld } from './HospitalWorld';
import { DepartmentLighting } from './DepartmentDetails';
import { useClinicalLocale } from './session/i18n';

interface XraySceneProps {
  onInterrupted?:()=>void;
  roamingPatient?: MutableRefObject<{x:number;z:number}|null>;
  clinicalActor?: ReactNode;
  quality?: RenderQuality;
  initialPosition?: { x: number; z: number };
  state: SimulatorState;
  view: CameraView;
  cameraReset: number;
  exposing: boolean;
  onSelect: (part: SelectedPart) => void;
  onWalkChange?: (walking: boolean) => void;
  world: Omit<WorldInteractionProps, 'state' | 'enabled' | 'disabled'>;
  latestImage?: CapturedImage;
  patientPrepared?: boolean;
  registered?: boolean;
  gownHanded?: boolean;
  patientInRoom?: boolean;
  patientAtImaging?: boolean;
  changingDoorClosed?: boolean;
  hygieneDone?: boolean;
}

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void; fallback:ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(){this.props.onError();}
  render() {
    if (this.state.failed) return this.props.fallback;
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

const RoomPatient = memo(function RoomPatient({ state, onSelect, animateArrival = false }: Pick<XraySceneProps, 'state' | 'onSelect'> & { animateArrival?: boolean }) {
  const geometry = getSceneGeometry(state);
  const body = useRef<Group>(null);
  const arrivalStartedAt = useRef(performance.now());
  const { invalidate } = useThree();
  const fromPosition = useRef(new Vector3(
    geometry.patientPosition[0] + (geometry.supine ? 0.42 : 0),
    geometry.supine ? 0 : geometry.patientPosition[1],
    geometry.patientPosition[2] + (geometry.supine ? 0.24 : 0.12),
  ));
  const initialRotation = useRef(new Quaternion().setFromEuler(new Euler(0, geometry.supine ? 0 : geometry.patientRotation[1] - 0.42, 0)));
  useFrame(() => {
    const group = body.current;
    if (!group) return;
    const targetPosition = new Vector3(...geometry.patientPosition);
    const targetRotation = new Quaternion().setFromEuler(new Euler(...geometry.patientRotation));
    if (animateArrival && performance.now() - arrivalStartedAt.current < (geometry.supine ? 1800 : 650)) {
      const duration = geometry.supine ? 1.8 : 0.65;
      const progress = Math.min(1, Math.max(0, (performance.now() - arrivalStartedAt.current) / 1000 / duration));
      const eased = progress * progress * (3 - 2 * progress);
      group.position.lerpVectors(fromPosition.current, targetPosition, eased);
      group.quaternion.slerpQuaternions(initialRotation.current, targetRotation, eased);
      invalidate();
      return;
    }
    group.position.copy(targetPosition);
    group.quaternion.copy(targetRotation);
  });
  return <group ref={body} position={animateArrival ? fromPosition.current : geometry.patientPosition} rotation={animateArrival ? [0, geometry.supine ? 0 : geometry.patientRotation[1] - 0.42, 0] : geometry.patientRotation} onClick={(event) => { event.stopPropagation(); if (event.delta < 5) onSelect('patient'); }}>
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
    <Lightformer form="rect" intensity={1.65} position={[0, 4, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 4, 1]} color="#fff6e9" />
    <Lightformer form="rect" intensity={1.5} position={[-4, 2, 0]} rotation={[0, Math.PI / 2, 0]} scale={[5, 4, 1]} color="#e7f4f5" />
    <Lightformer form="rect" intensity={0.9} position={[3, 2, 2]} rotation={[0, -Math.PI / 3, 0]} scale={[5, 4, 1]} color="#ffffff" />
  </Environment>;
});

function SceneContents(props: XraySceneProps & { onLost: () => void; onReady:()=>void }) {
  const { gl, invalidate } = useThree();
  const ready=useRef(false);
  useFrame(()=>{if(!ready.current){ready.current=true;props.onReady();}});
  useEffect(() => { gl.shadowMap.needsUpdate = true; invalidate(); }, [gl, invalidate, props.state, props.world.barrierClosed]);
  return <>
    <color attach="background" args={['#c6dae5']} />
    <fog attach="fog" args={['#c6dae5', 24, 58]} />
    {/* Broad fill lighting replaces the unnaturally hard sunlit-wall shadow. */}
    <ambientLight intensity={0.30} color="#f2f3f0" />
    <hemisphereLight args={['#e8f0fa', '#69695c', 0.52]} />
    <directionalLight position={[-3.5, 8, 6]} intensity={1.06} color="#fff5e9" castShadow shadow-mapSize={[RENDER_PROFILES[props.quality ?? 'balanced'].shadowSize, RENDER_PROFILES[props.quality ?? 'balanced'].shadowSize]} shadow-bias={-0.0002} shadow-normalBias={0.03} shadow-camera-left={-10} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-10} shadow-camera-near={0.5} shadow-camera-far={30} shadow-radius={5} />
    <directionalLight position={[3.3, 4.5, -1.8]} intensity={0.3} color="#e9f2f4" />
    {/* Light sources are anchored to the reception and observation corridors. */}
    <pointLight position={[6.45, 2.75, 4.7]} intensity={5.5} distance={5} decay={2} color="#fff6e7" />
    <pointLight position={[-0.5, 2.8, 4.5]} intensity={4.4} distance={6} decay={2} color="#f2f7f1" />
    <RoomLighting />
    <DepartmentLighting shadows={RENDER_PROFILES[props.quality ?? 'balanced'].shadows}/>
    <RoomArchitecture exposing={props.exposing} hygieneDone={props.hygieneDone} />
    <HospitalWorld barrierClosed={props.world.barrierClosed} changingDoorClosed={props.changingDoorClosed} registered={props.registered ?? true} gownHanded={props.gownHanded ?? false} patientPrepared={props.patientPrepared} patientInRoom={props.patientInRoom ?? true} patientState={props.state} exposing={props.exposing} gameActive={props.view === 'first-person' && !props.clinicalActor} activePatientSeated={!!props.clinicalActor} />
    {props.clinicalActor}
    <RadiographyTable {...props} />
    <WallBucky {...props} />
    <TubeAssembly {...props} />
    {(props.view !== 'first-person' || !!props.patientAtImaging) && <RoomPatient state={props.state} onSelect={props.onSelect} animateArrival={props.view === 'first-person'} />}
    <CollimatorField state={props.state} />
    <EquipmentLabels state={props.state} />
    <OperatorStation state={props.state} barrierClosed={props.world.barrierClosed} exposing={props.exposing} image={props.latestImage} />
    <SceneControls roamingPatient={props.roamingPatient} state={props.state} view={props.view} cameraReset={props.cameraReset} onWalkChange={props.onWalkChange} barrierClosed={props.world.barrierClosed} changingDoorClosed={props.changingDoorClosed} patientPrepared={!!props.roamingPatient || props.view !== 'first-person' || !!props.patientPrepared} registered={!!props.roamingPatient || props.view !== 'first-person' || (props.registered ?? true)} patientInRoom={props.view !== 'first-person' || !!props.patientAtImaging} paused={props.world.paused} initialPosition={props.initialPosition} />
    <WorldInteractions {...props.world} state={props.state} enabled={props.view === 'first-person'} disabled={props.exposing} />
    <FrameTelemetry />
    <ContextWatcher onLost={props.onLost} />
  </>;
}

export default function XrayScene(props: XraySceneProps) {
  const {t}=useClinicalLocale();
  const profile = RENDER_PROFILES[props.quality ?? 'balanced'];
  const [lost, setLost] = useState(false);
  const [ready,setReady]=useState(false);
  const [generation, setGeneration] = useState(0);
  const reload = () => { setLost(false);setReady(false); setGeneration((value) => value + 1); };
  const interrupted=()=>{setLost(true);props.onInterrupted?.();};
  const fallback=<div className="sim-webgl-fallback" role="alert"><strong>{t('roomInterrupted')}</strong><p>{t('roomRecovery')}</p><button className="sim-outline-button" onClick={reload}>{t('reloadRoom')}</button></div>;
  return <div className={'sim-three-room'+(lost||!ready?' cg-scene-unavailable':'')} data-camera-view={props.view} aria-busy={!ready&&!lost}>
    {!ready&&!lost&&<div className="cg-scene-loading" role="status"><span>medicalphysics</span><strong>{t('loadingRoom')}</strong><p>{t('loadingRoomNote')}</p><div aria-hidden="true"/></div>}
    <SceneBoundary key={generation} onError={interrupted} fallback={fallback}>
      {lost ? fallback : <Canvas
        shadows={profile.shadows}
        frameloop="demand"
        dpr={[1, profile.dpr]}
        camera={{ position: [4.12, 2.57, 4.31], fov: 43, near: 0.025, far: 70 }}
        gl={{ antialias: profile.antialias, alpha: false, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
        onCreated={({ gl }) => { gl.toneMappingExposure = 1.02; gl.shadowMap.type = PCFSoftShadowMap; gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true; }}
        fallback={fallback}
      ><SceneContents {...props} onReady={()=>setReady(true)} onLost={interrupted} /></Canvas>}
    </SceneBoundary>
  </div>;
}

function FrameTelemetry() {
  const last=useRef(performance.now()), samples=useRef<number[]>([]), count=useRef(0);
  useFrame(({gl})=>{
    const now=performance.now(),delta=now-last.current;last.current=now;
    // Retain long frames. Demand-render idle gaps make this a frame-interval diagnostic,
    // not a hardware benchmark; benchmarks must measure a continuous walkthrough.
    samples.current.push(delta);
    if(++count.current%60===0){
      const sorted=[...samples.current].sort((a,b)=>a-b);
      gl.domElement.dataset.renderMetrics=JSON.stringify({frames:count.current,triangles:gl.info.render.triangles,drawCalls:gl.info.render.calls,frameIntervalP95:sorted[Math.floor(sorted.length*.95)]??null,includesDemandIdle:true});
      samples.current=samples.current.slice(-240);
    }
  });
  return null;
}
