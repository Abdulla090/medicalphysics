"""Original clinical character source. Run with Blender --background --python this_file.
Metres, clinical neutral styling, skin plus separately removable modest garments.
All geometry is authored here; no third-party character or texture sources.
"""
import bpy, math, json, os
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/radiography'
SOURCE=ROOT/'assets/radiography'
OUT.mkdir(parents=True,exist_ok=True); SOURCE.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def xyz(p):
    # Keep a compact neck-to-shoulder transition and anatomically proportioned head.
    y=p[1] - .045*max(0,min(1,(p[1]-1.39)/.09))
    return (p[0],-p[2],y)
def material(name, color, rough=.7, noise=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
    if noise:
        tex=m.node_tree.nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=noise
        bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.12;bump.inputs['Distance'].default_value=.0006
        m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    return m
skin=material('Warm skin',(0.52,.32,.22),.64,160)
cloth=material('Woven sage',(0.23,.39,.35),.9,280)
gown=material('Woven chalk',(0.70,.78,.73),.94,280)
pants=material('Slate twill',(.095,.135,.15),.92,250)
hair=material('Deep brown hair',(.035,.027,.023),.86,170)
lip=material('Soft lip',(.34,.17,.135),.8)
eye=material('Warm sclera',(.64,.60,.53),.48)
iris=material('Hazel iris',(.055,.07,.055),.36)
shoe=material('Soft graphite footwear',(.055,.065,.069),.8)
bone_parts={}; variants={}
def mesh(name, verts, faces, mat, bone, variant='body'):
    d=bpy.data.meshes.new(name);d.from_pydata([xyz(v) for v in verts],[],faces);d.update()
    ob=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(ob);ob.data.materials.append(mat)
    for p in d.polygons:p.use_smooth=True
    ob['bone']=bone;ob['variant']=variant;bone_parts.setdefault(bone,[]).append(ob);variants.setdefault(variant,[]).append(ob)
    return ob
def loft(name,rings,mat,bone,variant='body',segments=32):
    # Ring (height, radius-x, radius-z, center-x, center-z); dense authored profiles avoid stacked primitives.
    vertices=[];faces=[]
    if name=='Head sculpt':
        dense=[]
        for a,b in zip(rings,rings[1:]):
            for i in range(5):dense.append(tuple(a[k]+(b[k]-a[k])*i/5 for k in range(5)))
        rings=dense+[rings[-1]]
    for y,rx,rz,cx,cz in rings:
        for i in range(segments):
            a=2*math.pi*i/segments
            x=cx+rx*math.sin(a);z=cz+rz*math.cos(a)
            if name=='Head sculpt':
                front=max(0,math.cos(a))**5
                gauss=lambda cx,cy,sx,sy: math.exp(-((abs(x)-cx)/sx)**2-((y-cy)/sy)**2)
                z+=front*(.007*gauss(.033,1.643,.025,.013)-.006*gauss(.032,1.623,.02,.011)+.006*gauss(.048,1.595,.025,.024)+.004*gauss(0,1.514,.034,.017)+.003*gauss(0,1.561,.025,.015))
            vertices.append((x,y,z))
    for j in range(len(rings)-1):
        for i in range(segments):
            a=j*segments+i;b=j*segments+(i+1)%segments
            faces.append((a,b,b+segments,a+segments))
    faces.extend([tuple(range(segments-1,-1,-1)),tuple((len(rings)-1)*segments+i for i in range(segments))])
    ob=mesh(name,vertices,faces,mat,bone,variant)
    uv=ob.data.uv_layers.new(name='Surface UV')
    for face in ob.data.polygons:
        for loop in face.loop_indices:
            index=ob.data.loops[loop].vertex_index;uv.data[loop].uv=(index%segments/segments,index//segments/(len(rings)-1))
    sub=ob.modifiers.new('Silhouette refinement','SUBSURF');sub.levels=1
    bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.modifier_apply(modifier=sub.name);ob.select_set(False)
    return ob
def ellipsoid(name,p,scale,mat,bone,variant='body',segments=20,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=xyz(p))
    ob=bpy.context.object;ob.name=name;ob.scale=(scale[0],scale[2],scale[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.data.materials.append(mat)
    for f in ob.data.polygons:f.use_smooth=True
    ob['bone']=bone;ob['variant']=variant;bone_parts.setdefault(bone,[]).append(ob);variants.setdefault(variant,[]).append(ob);ob.select_set(False)
    return ob
def line(name,points,radius,mat,bone,variant='body'):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=2
    spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for b,p in zip(spline.bezier_points,points):b.co=xyz(p);b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    ob=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(ob);bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.convert(target='MESH');ob=bpy.context.object
    ob.data.materials.append(mat);ob['bone']=bone;ob['variant']=variant;bone_parts.setdefault(bone,[]).append(ob);variants.setdefault(variant,[]).append(ob);ob.select_set(False)
    return ob

loft('Head sculpt',[(1.478,.022,.027,0,.01),(1.492,.042,.043,0,.006),(1.525,.062,.062,0,.001),(1.56,.075,.081,0,-.003),(1.59,.08,.087,0,-.005),(1.62,.082,.088,0,-.008),(1.65,.079,.085,0,-.009),(1.68,.068,.072,0,-.01),(1.706,.045,.053,0,-.01),(1.721,.004,.006,0,-.01)],skin,'Head',segments=40)
loft('Neck',[(1.365,.05,.047,0,0),(1.415,.045,.046,0,0),(1.48,.039,.039,0,0),(1.52,.045,.04,0,0)],skin,'Spine')
loft('Nasal planes',[(1.571,.006,.003,0,.079),(1.58,.012,.009,0,.083),(1.593,.014,.016,0,.084),(1.606,.009,.012,0,.083),(1.63,.005,.004,0,.08)],skin,'Head',segments=20)
for side in [-1,1]:
    ellipsoid('Ear', (side*.081,1.593,-.012),(.015,.034,.02),skin,'Head')
    ellipsoid('Ear concha',(side*.089,1.592,.002),(.004,.017,.009),lip,'Head')
    # Small recessed almond eyes and restrained low-contrast lips.
    ellipsoid('Eye',(side*.031,1.622,.076),(.0145,.0048,.004),eye,'Head')
    ellipsoid('Iris',(side*.030,1.622,.080),(.0042,.0042,.002),iris,'Head')
    line('Upper eyelid',[(side*.013,1.622,.079),(side*.030,1.629,.08),(side*.05,1.622,.074)],.0016,skin,'Head')
    line('Brow',[(side*.014,1.644,.077),(side*.03,1.647,.078),(side*.05,1.642,.072)],.0023,hair,'Head')
for side in [-1,1]:
    line('Ear helix',[(side*.084,1.567,.001),(side*.096,1.588,.003),(side*.092,1.619,-.004),(side*.082,1.625,-.012)],.002,skin,'Head')
    ellipsoid('Nostril',(side*.009,1.582,.094),(.003,.0018,.002),lip,'Head')
line('Mouth',[(-.022,1.555,.075),(0,1.553,.081),(.022,1.555,.075)],.0018,lip,'Head')
ellipsoid('Lower lip',(0,1.549,.078),(.017,.003,.0025),lip,'Head')
# Hair cap follows the cranial surface with a side-parted hairline.
vertices=[];faces=[];seg=48;rows=12
for row in range(rows+1):
    t=row/rows
    for i in range(seg):
        a=i/seg*math.pi*2;front=max(0,math.cos(a));bottom=1.58+.082*front+.012*math.sin(a)*front
        y=bottom+(1.729-bottom)*t;radius=math.sqrt(max(0,1-((y-1.61)/.121)**2))
        vertices.append((math.sin(a)*.086*radius,y,-.01+math.cos(a)*.095*radius))
for j in range(rows):
    for i in range(seg):faces.append((j*seg+i,j*seg+(i+1)%seg,(j+1)*seg+(i+1)%seg,(j+1)*seg+i))
mesh('Sculpted hair',vertices,faces,hair,'Head','hair_short')
mesh('Swept hair crown',vertices,faces,hair,'Head','hair_long')
loft('Shoulder length hair',[(1.405,.053,.018,0,-.077),(1.43,.078,.025,0,-.075),(1.53,.087,.031,0,-.069),(1.64,.083,.035,0,-.045),(1.695,.052,.032,0,-.032)],hair,'Head','hair_long')
for i in range(24):
    x=-.055+i*.0046
    line('Hair strand',[(x,1.68,.057),(x*.8-.01,1.718,.025),(x*.65-.015,1.722,-.025)],.0008,hair,'Head','hair_short')
torso=[(.83,.143,.102,0,0),(.91,.15,.106,0,0),(1.04,.145,.107,0,0),(1.16,.165,.113,0,0),(1.28,.187,.114,0,0),(1.35,.183,.092,0,-.003),(1.395,.07,.053,0,-.003)]
loft('Tailored tunic',torso,cloth,'Spine','outpatient')
loft('Modest examination gown',[(.63,.19,.145,0,0),(.7,.192,.144,0,0),(.86,.18,.132,0,0),(1.03,.16,.12,0,0),(1.17,.17,.12,0,0),(1.29,.192,.12,0,0),(1.36,.186,.096,0,-.003),(1.399,.07,.055,0,-.003)],gown,'Spine','gown')
line('Gown neckline',[(-.066,1.397,.024),(-.05,1.362,.077),(0,1.345,.104),(.05,1.362,.077),(.066,1.397,.024)],.0025,cloth,'Spine','gown')
line('Tunic neckline',[(-.065,1.395,.021),(-.038,1.36,.082),(0,1.343,.104),(.038,1.36,.082),(.065,1.395,.021)],.003,pants,'Spine','outpatient')
line('Pocket welt',[(.062,1.245,.114),(.139,1.245,.101)],.002,gown,'Spine','outpatient')
for side,suffix in [(-1,'R'),(1,'L')]:
    x=side*.092
    for variant,mat in [('body',skin),('outpatient',pants)]:
        radius=1 if variant=='body' else 1.07
        ob=loft('Leg surface',[(.09,.03*radius,.033*radius,x,.008),(.17,.034*radius,.035*radius,x,0),(.29,.05*radius,.052*radius,x,-.007),(.37,.055*radius,.055*radius,x,0),(.425,.046*radius,.047*radius,x,.008),(.46,.047*radius,.048*radius,x,.008),(.50,.051*radius,.052*radius,x,.006),(.55,.06*radius,.061*radius,x,.003),(.68,.078*radius,.08*radius,x,0),(.82,.081*radius,.081*radius,x,0),(.875,.069*radius,.08*radius,x,0)],mat,'Thigh_'+suffix,'lower_skin' if variant=='body' else variant)
        ob['blend_joint']='Shin_'+suffix;ob['blend_height']=.445;ob['blend_width']=.08
    ellipsoid('Contoured shoe',(x,.054,.052),(.046,.047,.113),shoe,'Foot_'+suffix)
    ellipsoid('Sole',(x,.017,.052),(.048,.012,.115),pants,'Foot_'+suffix)
    ax=side*.205
    for variant,mat in [('outpatient',cloth),('gown',gown)]:
        loft('Set-in sleeve',[(1.18,.05,.053,ax+side*.024,0),(1.26,.06,.064,ax+side*.01,0),(1.34,.056,.057,ax,0),(1.367,.034,.038,ax-side*.012,0)],mat,'UpperArm_'+suffix,variant)
    ob=loft('Arm surface',[(.815,.023,.025,ax+side*.051,.016),(.9,.027,.028,ax+side*.047,.012),(.985,.037,.036,ax+side*.043,.005),(1.045,.034,.034,ax+side*.038,.002),(1.075,.033,.034,ax+side*.035,0),(1.11,.036,.037,ax+side*.033,0),(1.14,.043,.04,ax+side*.03,0),(1.22,.045,.047,ax+side*.02,0)],skin,'UpperArm_'+suffix)
    ob['blend_joint']='Forearm_'+suffix;ob['blend_height']=1.07;ob['blend_width']=.065
    ellipsoid('Palm',(ax+side*.053,.77,.014),(.027,.054,.018),skin,'Forearm_'+suffix)
    for f in range(4):
        fx=ax+side*.053+(f-1.5)*.012
        length=[.063,.073,.067,.052][f]
        line('Finger',[(fx,.749,.013),(fx,.721,.018),(fx,.749-length,.025)],.006,skin,'Forearm_'+suffix)
    line('Thumb',[(ax+side*.031,.788,.023),(ax+side*.016,.76,.037),(ax+side*.01,.742,.043)],.008,skin,'Forearm_'+suffix)

# True armature, named joints and vertex groups preserved in both Blender and glTF.
arm=bpy.data.armatures.new('Clinical adult skeleton');rig=bpy.data.objects.new('ClinicalAdult',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
bones={'Root':((0,0,0),(0,.2,0),None),'Spine':((0,.84,0),(0,1.4,0),'Root'),'Head':((0,1.47,0),(0,1.72,0),'Spine')}
for side,suffix in [(-1,'R'),(1,'L')]:
    bones.update({'Thigh_'+suffix:((side*.092,.855,0),(side*.092,.445,.008),'Root'),'Shin_'+suffix:((side*.092,.445,.008),(side*.092,.09,.008),'Thigh_'+suffix),'Foot_'+suffix:((side*.092,.09,.008),(side*.092,.04,.12),'Shin_'+suffix),'UpperArm_'+suffix:((side*.205,1.35,0),(side*.24,1.07,0),'Spine'),'Forearm_'+suffix:((side*.24,1.07,0),(side*.258,.81,.016),'UpperArm_'+suffix)})
for name,(head,tail,parent) in bones.items():
    b=arm.edit_bones.new(name);b.head=xyz(head);b.tail=xyz(tail)
    if parent:b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
for bone,objects in bone_parts.items():
    for ob in objects:
        vg=ob.vertex_groups.new(name=bone)
        if 'blend_joint' in ob:
            lower=ob.vertex_groups.new(name=ob['blend_joint'])
            for vert in ob.data.vertices:
                y=(ob.matrix_world@vert.co).z
                weight=max(0,min(1,(ob['blend_height']+ob['blend_width']/2-y)/ob['blend_width']))
                weight=weight*weight*(3-2*weight)
                vg.add([vert.index],1-weight,'REPLACE');lower.add([vert.index],weight,'REPLACE')
        else:vg.add(list(range(len(ob.data.vertices))),1,'REPLACE')
        mod=ob.modifiers.new('Articulation','ARMATURE');mod.object=rig;ob.parent=rig
for variant,objects in variants.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=variant
# Studio scene and editable source are saved before export.
bpy.ops.object.select_all(action='DESELECT');bpy.context.view_layer.objects.active=rig
bpy.context.scene['provenance']='Original procedural asset authored for the medicalphysics radiography training project.'
bpy.context.scene['coordinates']='Metres. Source Blender Z up. glTF Y up, patient anterior +Z.'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'clinical-adult.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'clinical-adult.glb'),export_format='GLB',export_apply=False,export_yup=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_animations=False)
# A separate crowd LOD retains the same rig and material names.
for ob in list(bpy.context.scene.objects):
    if ob.type=='MESH':
        bpy.context.view_layer.objects.active=ob
        mod=ob.modifiers.new('Crowd silhouette LOD','DECIMATE');mod.ratio=.23;mod.use_collapse_triangulate=True
        bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.ops.export_scene.gltf(filepath=str(OUT/'clinical-adult-lod.glb'),export_format='GLB',export_apply=False,export_yup=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_animations=False)
manifest={'version':1,'license':'Original project asset; no external model sources','source':'assets/radiography/clinical-adult.blend','generator':'scripts/build-clinical-characters.py','assets':[{'url':'/radiography/clinical-adult.glb','rig':'ClinicalAdult','variants':['body','gown','outpatient'],'compression':'KHR_draco_mesh_compression','bytes':(OUT/'clinical-adult.glb').stat().st_size}],'notes':['Material procedural nodes retained in Blender source. Runtime glTF uses PBR material factors.','Geometry is visual presentation; analytic phantom remains the acquisition source.']}
manifest['assets'].append({'url':'/radiography/clinical-adult-lod.glb','source':'assets/radiography/clinical-adult.blend','compression':'KHR_draco_mesh_compression','bytes':(OUT/'clinical-adult-lod.glb').stat().st_size})
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('CHARACTER_EXPORT_COMPLETE',manifest['assets'])
