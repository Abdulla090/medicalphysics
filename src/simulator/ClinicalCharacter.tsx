import { memo, useEffect, useMemo } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { Bone, Mesh, MeshStandardMaterial, Quaternion, Vector3, RepeatWrapping, NoColorSpace, DoubleSide, SkinnedMesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clinicalDecoder } from './clinicalAssetLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { samplePatientPose } from './patientMotion';
import { repairGownLegs } from './repairGownLegs';
import type { SimulatorState } from './types';

type Gait={current:{time:number;running:boolean}};
/** Authored, locally decoded rig. Cloned skeletons animate independently; buffers stay shared. */
export const ClinicalCharacter=memo(function ClinicalCharacter({state,garment='gown',gait,staff=false,seated=false,appearance=0}:{state:SimulatorState;garment?:'gown'|'outpatient';gait?:Gait;staff?:boolean;seated?:boolean;appearance?:number}){
 const female=appearance%3===1;
 const crowdVariant=seated&&(appearance===3||appearance===5)?'-older':seated&&(appearance===2||appearance===6)?'-dark':female?'-female':'';
 const asset=`/radiography/clinical-adult${crowdVariant}${seated?'-lod':''}.glb`;
 const gltf=useLoader(GLTFLoader,asset,loader=>loader.setDRACOLoader(clinicalDecoder));
 const {invalidate,gl}=useThree();
 const [normal,roughness]=useLoader(KTX2Loader,['/radiography/skin-normal.ktx2','/radiography/skin-roughness.ktx2'],loader=>loader.setTranscoderPath('/radiography/decoders/basis/').detectSupport(gl));
 useMemo(()=>{for(const t of [normal,roughness]){t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(3,6);t.colorSpace=NoColorSpace;}},[normal,roughness]);
 const model=useMemo(()=>{
  const root=clone(gltf.scene),bones=new Map<string,{bone:Bone;rest:Quaternion}>(),owned:MeshStandardMaterial[]=[];
  root.traverse(object=>{
   if(object instanceof Bone)bones.set(object.name,{bone:object,rest:object.quaternion.clone()});
   if(object instanceof Mesh){object.castShadow=true;object.receiveShadow=true;
    if(object.name==='skin_gown' && object instanceof SkinnedMesh) object.geometry=repairGownLegs(object.geometry);
    const materials=Array.isArray(object.material)?object.material:[object.material];
    const changed=materials.map(m=>{
     const copy=m.clone() as MeshStandardMaterial;
     if(copy.name.startsWith('Dyed cotton'))copy.color.set(staff?'#41665c':['#879fae','#d1b2a0','#b9b4a4','#526779','#9a7665','#687c6c','#a294aa','#77726d'][appearance%8]);
     if(copy.name.startsWith('Leather footwear'))copy.color.set(appearance%3===0?'#61584d':appearance%3===1?'#554f4a':'#a9957e');
     if(copy.name.startsWith('Anatomical skin')){copy.color.set(crowdVariant==='-dark'||crowdVariant==='-older'?'#ffffff':['#fff3e8','#f9e9dc','#e9d2ba','#ffeede'][appearance%4]);copy.normalMap=normal;copy.normalScale.set(.12,.12);copy.roughnessMap=roughness;copy.roughness=.82;}
     if(copy.name.startsWith('Hair strands')){copy.alphaTest=.38;copy.transparent=false;copy.depthWrite=true;copy.side=DoubleSide;copy.color.set(female?['#584336','#514437','#a0a09a','#372e29'][appearance%4]:['#c6b4a0','#d8c7b3','#75695d','#eadfd1'][appearance%4]);}
     owned.push(copy);return copy;
    });object.material=Array.isArray(object.material)?changed:changed[0];
   }
  });
  if(seated){root.updateMatrixWorld(true);const hip=bones.get('Thigh_L')?.bone.getWorldPosition(new Vector3());if(hip)root.position.y=.465-hip.y;}
  return {root,bones,owned};
 },[gltf,staff,appearance,seated,female,crowdVariant,normal,roughness]);
 useEffect(()=>()=>model.owned.forEach(m=>m.dispose()),[model]);
 useEffect(()=>{model.root.traverse(o=>{if(o.name==='gown'||o.name==='gown_underlayer'||o.name==='skin_gown')o.visible=garment==='gown';if(o.name==='outpatient'||o.name==='skin_outpatient')o.visible=garment==='outpatient';if(o.name==='hair_primary')o.visible=appearance%2===0;if(o.name==='hair_alternate')o.visible=appearance%2===1;});invalidate();},[model,garment,appearance,invalidate]);
 const turn=useMemo(()=>new Quaternion(),[]),axis=useMemo(()=>new Vector3(1,0,0),[]);
 const roll=useMemo(()=>new Quaternion(),[]),rollAxis=useMemo(()=>new Vector3(0,0,1),[]);
 useFrame(({clock},delta)=>{
  const walking=!!gait?.current.running,pose=samplePatientPose(gait?.current.time??clock.elapsedTime,walking);
  const f=1-Math.exp(-Math.min(delta,.08)*14);let changing=false;
  const joint=(name:string,angle:number,z=0)=>{
   const item=model.bones.get(name);if(!item)return;
   turn.setFromAxisAngle(axis,angle).multiply(item.rest);
   if(z)turn.premultiply(roll.setFromAxisAngle(rollAxis,z));
   changing ||= item.bone.quaternion.angleTo(turn)>.002;item.bone.quaternion.slerp(turn,f);
  };
  for(const [index,suffix,side] of [[0,'R',-1],[1,'L',1]]as const){
   joint('Thigh_'+suffix,walking?pose.thigh[index]:seated?-1.52+(appearance%3===2&&index===0?.08:0):0);joint('Shin_'+suffix,walking?pose.knee[index]:seated?1.53+(appearance%3===2&&index===0?-.16:0):0);joint('Foot_'+suffix,walking?pose.ankle[index]:0);
   const arms=state.arms;
   joint('UpperArm_'+suffix,walking?pose.shoulder[index]:staff?-.16:seated?-.11-(appearance%3===1&&index===1?.04:0):arms==='raised'?-2.75:arms==='hips'?-.16:0,walking||staff?0:seated?side*.035:arms==='hips'?-side*.38:0);
   joint('Forearm_'+suffix,walking?-pose.elbow[index]:staff?-.72:seated?-.98-(appearance%3===1&&index===1?.08:0):arms==='hips'?-.72:arms==='raised'?-.28:-.05);
   joint('Hand_'+suffix,seated?.12:0,seated?side*.07:0);
  }
  joint('Spine',walking?pose.torsoPitch:seated?.018:0,walking?pose.torsoSway:0);
  joint('Head',walking?pose.headPitch:staff?.035:seated?.025+(appearance%3)*.03:0,seated?(appearance%3-1)*.035:0);
  if(walking||changing){gl.shadowMap.needsUpdate=true;invalidate();}
 });
 return <group name={staff?'clinical-staff':'clinical-patient'} scale={[state.patientSize,1,state.patientSize]} dispose={null}><primitive object={model.root}/></group>;
});
