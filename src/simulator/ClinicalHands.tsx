import { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clinicalDecoder } from './clinicalAssetLoader';

/** Anatomical mesh under a plain nitrile material, local and independently instanced. */
export function ClinicalHands(){
 const gltf=useLoader(GLTFLoader,'/radiography/clinical-hands.glb',l=>l.setDRACOLoader(clinicalDecoder));
 const hands=useMemo(()=>['L','R'].map(side=>gltf.scene.getObjectByName('Glove_'+side)!.clone(true)),[gltf]);
 return <group dispose={null}>{hands.map((hand,index)=><group key={index} position={[index===0?-.20:.20,-.30,-.43]} rotation={[1.0,Math.PI,index===0?-.12:.12]}><primitive object={hand}/><mesh position={[index===0?.002:-.002,.015,0]}><cylinderGeometry args={[.032,.030,.026,20]}/><meshStandardMaterial color="#769fa8" roughness={.75}/></mesh></group>)}</group>;
}
