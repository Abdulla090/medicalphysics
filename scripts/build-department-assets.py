"""Original clinical prop kit. Metres, bevelled edges, shared materials, local GLB.
Run with Blender --background --factory-startup --python this_file.py.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
# The original chair remains an editable source; re-export it without changing it.
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/radiography/waiting-chair.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/radiography/waiting-chair.glb'),export_format='GLB',export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0,rough=.5):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1);m.use_nodes=True
 n=m.node_tree.nodes.get('Principled BSDF'); n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
 return m
alloy=mat('Satin anodised aluminium',(.33,.39,.40),.85,.28)
chrome=mat('Brushed stainless steel',(.61,.64,.62),.9,.22)
rubber=mat('Textured graphite rubber',(.025,.033,.035),0,.9)
cloth=mat('Woven navy upholstery',(.065,.12,.15),0,.93)
ivory=mat('Warm ceramic enamel',(.80,.81,.76),.16,.32)
teal=mat('Deep petrol enamel',(.063,.17,.17),.28,.38)
leather=mat('Cognac leather',(.29,.14,.074),0,.68)
stitch=mat('Linen seam',(.54,.38,.23),0,.87)
paper=mat('Paper',(.84,.82,.75),0,.92)
bronze=mat('Anodised champagne',(.56,.39,.21),.65,.4)
clay=mat('Mineral clay',(.56,.46,.36),0,.88)
def finish(o,name,m):
 o.name=name;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o
def box(name,at,size,m,r=.01):
 bpy.ops.mesh.primitive_cube_add(size=1,location=at);o=bpy.context.object;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if r:
  b=o.modifiers.new('Manufactured edge radius','BEVEL');b.width=min(r,min(size)*.45);b.segments=3
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=b.name)
 n=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');n.keep_sharp=True
 bpy.ops.object.modifier_apply(modifier=n.name)
 return finish(o,name,m)
def tube(name,points,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=4;c.bevel_depth=r;c.bevel_resolution=2
 s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m)
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o
def ring(name,at,r,thick,m,axis='X'):
 bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=10,location=at,major_radius=r,minor_radius=thick,rotation=(0,math.pi/2,0) if axis=='X' else (0,0,0));return finish(bpy.context.object,name,m)
def rod(name,a,b,r,m):
 a,b=Vector(a),Vector(b);v=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=v.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return finish(o,name,m)
def root(name,objects):
 # One mesh per material reduces runtime draw calls while keeping editable source parts below.
 parent=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(parent)
 for o in objects:o.parent=parent
 return parent
def capture(fn,name):
 before=set(bpy.data.objects);fn();return root(name,[o for o in bpy.data.objects if o not in before])
def wheelchair():
 box('Suspended seat cushion',(0,0,.50),(.45,.43,.055),cloth,.025)
 box('Contoured backrest',(0,.22,.76),(.45,.055,.48),cloth,.025)
 for side in [-1,1]:
  x=side*.275
  tube('Continuous tubular chassis',[(x,-.31,.22),(x,-.23,.5),(x,.23,.52),(x,.25,.99),(x,.37,1.01)],.015,chrome)
  tube('Arm support',[(x,.21,.67),(x,-.22,.68),(x,-.27,.53)],.013,alloy)
  box('Padded armrest',(x,-.025,.713),(.07,.43,.04),rubber,.019)
  box('Push grip',(x,.345,1.01),(.046,.16,.046),rubber,.018)
  ring('Rear pneumatic tyre',(side*.315,.19,.305),.274,.022,rubber)
  ring('Wheel rim',(side*.315,.19,.305),.255,.009,alloy)
  ring('Push handrim',(side*.354,.19,.305),.235,.012,chrome)
  rod('Axle hub',(side*.29,.19,.305),(side*.345,.19,.305),.025,alloy)
  for n in range(20):
   a=n*math.tau/20;rod('Radial spoke',(side*.315,.19,.305),(side*.315,.19+math.sin(a)*.253,.305+math.cos(a)*.253),.0025,chrome)
  ring('Front swivel tyre',(x,-.34,.095),.066,.018,rubber)
  rod('Castor fork',(x,-.34,.095),(x,-.34,.23),.016,alloy)
  tube('Footrest hanger',[(x,-.25,.5),(x,-.40,.31),(x,-.45,.15)],.014,chrome)
  box('Textured footplate',(side*.13,-.48,.135),(.22,.20,.026),rubber,.013)
  for n in range(5):box('Footplate rib',(side*.13,-.545+n*.032,.15),(.185,.004,.003),alloy,.001)
 rod('Cross brace',(-.25,.1,.23),(.25,-.1,.48),.012,chrome);rod('Cross brace',(.25,.1,.23),(-.25,-.1,.48),.012,chrome)
def trolley():
 box('Trolley cabinet',(0,0,.53),(.58,.42,.66),ivory,.025)
 box('Coved cleanable worktop',(0,0,.89),(.65,.48,.05),ivory,.022)
 for i in range(4):
  z=.30+i*.15
  box('Drawer front',(0,-.221,z),(.535,.025,.137),teal if i==3 else ivory,.009)
  tube('Drawer handle',[(-.14,-.238,z+.025),(-.12,-.27,z+.025),(.12,-.27,z+.025),(.14,-.238,z+.025)],.008,alloy)
  box('Label pocket',(-.19,-.24,z-.025),(.065,.003,.026),paper,.002)
 for x in [-.25,.25]:
  for y in [-.17,.17]:
   rod('Castor yoke',(x,y,.08),(x,y,.20),.02,alloy);ring('Medical castor',(x,y,.075),.05,.018,rubber)
 tube('Push rail',[(-.31,.17,.90),(-.34,.17,1.02),(.34,.17,1.02),(.31,.17,.90)],.012,chrome)
 for i in range(3):box('Folded drape',(-.10,.03,.932+i*.023),(.28,.26,.027),cloth,.012)
 box('Supplies tray',(.19,-.04,.936),(.14,.25,.055),teal,.02)
 for n in range(4):box('Sterile pack',(.16+n*.02,-.04,.97),(.016,.16,.03),paper,.003)
def bag():
 box('Leather bag body',(0,0,.145),(.31,.14,.265),leather,.055)
 box('Front panel',(0,-.067,.15),(.28,.025,.20),leather,.035)
 tube('Edge piping',[(-.12,-.084,.24),(-.137,-.084,.08),(-.10,-.084,.035),(.10,-.084,.035),(.137,-.084,.08),(.12,-.084,.24)],.0025,stitch)
 for y in [-.04,.04]:tube('Leather handle',[(-.09,y,.265),(-.075,y,.37),(.075,y,.37),(.09,y,.265)],.009,leather)
 box('Zip',(0,0,.28),(.23,.008,.007),bronze,.002)
 box('Clasp',(0,-.088,.20),(.038,.008,.026),bronze,.004)
def relief():
 # Shallow contour sculpture: a quiet reference to wave propagation, not a poster.
 box('Mineral backing',(0,.025,0),(3.95,.08,.90),teal,.025)
 for n in range(31):
  x=-1.85+n*.123
  pts=[]
  for j in range(17):
   z=-.37+j*.046;wave=math.sin(x*1.9+z*4)*.026+math.sin(x*3-z*2)*.013
   pts.append((x+wave,-.043-abs(math.sin(x*1.7+z*2))*.036,z))
  tube('Champagne wave rib',pts,.009,bronze)
 box('Lower reveal',(0,-.05,-.46),(3.92,.02,.015),bronze,.004)
def magazines():
 for i in range(3):
  o=box('Patient reading',(0,0,.012+i*.015),(.24,.30,.015),paper,.004);o.rotation_euler.z=i*.08
 box('Journal cover',(0,0,.061),(.24,.30,.003),clay,.001)
 box('Journal title',(-.035,-.08,.064),(.13,.008,.001),paper,0)
capture(wheelchair,'Wheelchair')
capture(trolley,'ClinicalTrolley')
capture(bag,'LeatherBag')
capture(relief,'WaveRelief')
capture(magazines,'ReadingStack')
# Save an editable source with separated, named manufacturing components.
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/radiography/department-props.blend'))
for parent in [o for o in bpy.data.objects if o.type=='EMPTY']:
 bymaterial={}
 for o in list(parent.children):
  bymaterial.setdefault(o.data.materials[0].name,[]).append(o)
 for name,items in bymaterial.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.select_set(True)
  bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();bpy.context.object.name=parent.name+'_'+name
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/radiography/department-props.glb'),export_format='GLB',export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_yup=True,export_extras=True)
print('Department prop kit exported')
manifest_path=ROOT/'public/radiography/manifest.json'
manifest=json.loads(manifest_path.read_text())
manifest['assets']=[a for a in manifest['assets'] if a['url']!='/radiography/department-props.glb']
manifest['assets'].append({'url':'/radiography/department-props.glb','source':'assets/radiography/department-props.blend','generator':'scripts/build-department-assets.py','compression':'KHR_draco_mesh_compression','license':'Original project assets','bytes':(ROOT/'public/radiography/department-props.glb').stat().st_size})
manifest_path.write_text(json.dumps(manifest,indent=2))
