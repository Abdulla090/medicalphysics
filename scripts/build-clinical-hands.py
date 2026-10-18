"""Derive anatomical gloved hands from the local CC0 character, preserving its source."""
import bpy, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/radiography/clinical-adult.blend'))
body=bpy.data.objects['skin_outpatient']; rig=bpy.data.objects['ClinicalAdult']
hands=[]
mat=bpy.data.materials.new('Powder-free clinical glove');mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.36,.57,.62,1);bs.inputs['Roughness'].default_value=.72
for side in ['L','R']:
 group=body.vertex_groups['Hand_'+side].index
 selected={v.index for v in body.data.vertices if any(g.group==group and g.weight>.1 for g in v.groups)}
 faces=[tuple(p.vertices) for p in body.data.polygons if all(i in selected for i in p.vertices)]
 used=sorted({i for f in faces for i in f});remap={i:j for j,i in enumerate(used)}
 origin=rig.data.bones['Hand_'+side].head_local
 mesh=bpy.data.meshes.new('Anatomical glove '+side);mesh.from_pydata([body.data.vertices[i].co-origin for i in used],[],[[remap[i] for i in f] for f in faces]);mesh.update()
 ob=bpy.data.objects.new('Glove_'+side,mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(mat)
 for p in mesh.polygons:p.use_smooth=True
 hands.append(ob)
for o in list(bpy.data.objects):
 if o not in hands:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/radiography/clinical-hands.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/radiography/clinical-hands.glb'),export_format='GLB',export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
path=ROOT/'public/radiography/manifest.json';manifest=json.loads(path.read_text())
manifest['assets']=[a for a in manifest['assets'] if a['url']!='/radiography/clinical-hands.glb']
manifest['assets'].append({'url':'/radiography/clinical-hands.glb','source':'assets/radiography/clinical-hands.blend','generator':'scripts/build-clinical-hands.py','license':'CC0 1.0 anatomy; original glove material','compression':'KHR_draco_mesh_compression','bytes':(ROOT/'public/radiography/clinical-hands.glb').stat().st_size})
path.write_text(json.dumps(manifest,indent=2))
