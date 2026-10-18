import { readFileSync,statSync } from 'node:fs';
import assert from 'node:assert/strict';
for(const [file,names,budget] of [
 ['department-props.glb',['ClinicalTrolley','Wheelchair','LeatherBag','WaveRelief','ReadingStack'],300_000],
 ['clinical-hands.glb',['Glove_L','Glove_R'],60_000],
]){
 const path='public/radiography/'+file,bytes=readFileSync(path);
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const data=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 for(const name of names)assert(data.nodes.some(n=>n.name===name),'Missing '+name);
 assert(data.extensionsUsed.includes('KHR_draco_mesh_compression'));
 assert(statSync(path).size<budget,file+' exceeds download budget');
 assert(data.buffers.every(b=>!b.uri),'All mesh buffers must be local');
 console.log(file+': '+names.length+' named assets, '+Math.round(bytes.length/1024)+' KiB, local Draco buffers');
}
