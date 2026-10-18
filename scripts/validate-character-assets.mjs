import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
for(const stem of ['clinical-adult','clinical-adult-female','clinical-adult-older','clinical-adult-dark'])for(const lod of (stem.endsWith('older')||stem.endsWith('dark')?['-lod']:['', '-lod'])){
 const path=`public/radiography/${stem}${lod}.glb`,bytes=readFileSync(path);
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const document=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 const names=new Set(document.nodes.map(n=>n.name));
 for(const n of ['Root','Spine','Head','Thigh_L','Thigh_R','Shin_L','Shin_R','Forearm_L','Forearm_R','Hand_L','Hand_R','Eyes','skin_outpatient','skin_gown','gown','outpatient','hair_primary','hair_alternate'])assert.ok(names.has(n),`${path}: missing ${n}`);
 assert.ok(document.extensionsUsed.includes('KHR_draco_mesh_compression'));
 assert.ok(document.images.length>=6,'Photo skin, eyes, hair and garment maps must be embedded.');
 assert.ok(document.skins.length>0);
 assert.ok(bytes.length<5_000_000,`${path} exceeds the per-character transfer budget`);
 console.log(`${path}: valid articulated asset, ${(bytes.length/1048576).toFixed(2)} MiB`);
}
