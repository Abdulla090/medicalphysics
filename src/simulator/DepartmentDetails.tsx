import { memo, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Mesh, Object3D } from 'three';
import { clinicalDecoder } from './clinicalAssetLoader';
import { useSurfaceTexture } from './SceneMaterials';
import { Label } from './SceneAssets';

/** Original Blender kit, shared buffers. All ground props are in sceneManifest. */
function Prop({name,position,rotation=0}:{name:string;position:[number,number,number];rotation?:number}){
 const gltf=useLoader(GLTFLoader,'/radiography/department-props.glb',l=>l.setDRACOLoader(clinicalDecoder));
 const model=useMemo(()=>{const original=gltf.scene.getObjectByName(name);if(!original)throw new Error('Missing department prop: '+name);const copy=original.clone(true);copy.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});return copy;},[gltf,name]);
 return <group position={position} rotation={[0,rotation,0]} dispose={null}><primitive object={model}/></group>;
}
export const DepartmentDetails=memo(function DepartmentDetails(){
 const acoustic=useSurfaceTexture('acoustic');
 return <group name="authored-department-details">
  <Prop name="ClinicalTrolley" position={[-2.92,0,2.05]} rotation={Math.PI/2}/>
  <Prop name="Wheelchair" position={[7.55,0,7.24]} rotation={-.5}/>
  <Prop name="LeatherBag" position={[-2.92,.49,8.03]} rotation={Math.PI/2}/>
  <Prop name="LeatherBag" position={[-.75,0,9.86]} rotation={.2}/>
  <Prop name="ReadingStack" position={[.02,.54,9.79]} rotation={.6}/>
  <Prop name="WaveRelief" position={[-1.2,2.13,10.40]} rotation={Math.PI}/>
  <mesh position={[-1.2,.81,10.445]} receiveShadow><boxGeometry args={[4.18,1.46,.035]}/><meshStandardMaterial map={acoustic} bumpMap={acoustic} bumpScale={.003} color="#c3b9a7" roughness={.96}/></mesh>
  <mesh position={[-1.2,1.55,10.42]}><boxGeometry args={[4.18,.025,.04]}/><meshStandardMaterial color="#95856e" metalness={.5} roughness={.5}/></mesh>
  <Label title="MOBILITY SUPPORT" detail="PLEASE ASK YOUR RADIOGRAPHER" position={[8.365,1.6,7.25]} rotation={[0,-Math.PI/2,0]} width={.9} height={.22}/>
 </group>;
});

/** Interior keys add directional shape where an exterior sun cannot reach. */
export const DepartmentLighting=memo(function DepartmentLighting({shadows}:{shadows:boolean}){
 const reception=useMemo(()=>{const t=new Object3D();t.position.set(7.9,.9,4.8);return t;},[]);
 const imaging=useMemo(()=>{const t=new Object3D();t.position.set(.2,.7,-.2);return t;},[]);
 return <>
  <primitive object={reception}/><primitive object={imaging}/>
  <spotLight position={[6.6,2.95,4.9]} target={reception} angle={1.08} penumbra={.9} intensity={12} distance={7} decay={2} color="#fff0db" castShadow={shadows} shadow-mapSize={[1024,1024]} shadow-bias={-.0002} shadow-normalBias={.01} shadow-radius={4}/>
  <spotLight position={[1.4,3.05,1.5]} target={imaging} angle={1.1} penumbra={.85} intensity={29} distance={9} decay={2} color="#edf5ff" castShadow={shadows} shadow-mapSize={[1024,1024]} shadow-bias={-.0002} shadow-normalBias={.012} shadow-radius={4}/>
  <pointLight position={[-2.7,2.6,-1.7]} color="#f3e6d3" intensity={3} distance={5}/>
 </>;
});
