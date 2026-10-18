import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { InstancedMesh, Matrix4, Mesh } from 'three';
import { clinicalDecoder } from './clinicalAssetLoader';
import { WAITING_SEATS } from './sceneManifest';

function MaterialBatch({mesh}:{mesh:Mesh}){
 const ref=useRef<InstancedMesh>(null),{invalidate}=useThree();
 useLayoutEffect(()=>{
  const instance=ref.current;if(!instance)return;
  WAITING_SEATS.forEach((seat,index)=>{
   const transform=new Matrix4().makeRotationY(seat.yaw);transform.setPosition(seat.x,0,seat.z);transform.multiply(mesh.matrixWorld);
   instance.setMatrixAt(index,transform);
  });
  instance.instanceMatrix.needsUpdate=true;instance.computeBoundingSphere();invalidate();
 },[mesh,invalidate]);
 return <instancedMesh ref={ref} args={[mesh.geometry,mesh.material,WAITING_SEATS.length]} castShadow receiveShadow dispose={null}/>;
}
/** The nine authored chairs share four instanced material batches. */
export const WaitingChairs=memo(function WaitingChairs(){
 const gltf=useLoader(GLTFLoader,'/radiography/waiting-chair.glb',loader=>loader.setDRACOLoader(clinicalDecoder));
 const meshes=useMemo(()=>{gltf.scene.updateMatrixWorld(true);const list:Mesh[]=[];gltf.scene.traverse(o=>{if(o instanceof Mesh)list.push(o);});return list;},[gltf]);
 return <group name="instanced-waiting-chairs">{meshes.map(mesh=><MaterialBatch key={mesh.uuid} mesh={mesh}/>)}</group>;
});
