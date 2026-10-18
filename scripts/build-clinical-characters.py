"""Build articulated adults from CC0 MakeHuman data and authored clinical garments.
Run through npm run assets:characters. All inputs are local and source scenes remain editable.
See assets/radiography/vendor/makehuman/PROVENANCE.md for licenses and download origins.
"""
import bpy, json, math
from pathlib import Path
from collections import defaultdict
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/radiography'; VENDOR=SOURCE/'vendor/makehuman'; SYSTEM=VENDOR/'system'
OUT=ROOT/'public/radiography'
TEXTURES={k:str(ROOT/v) for k,v in json.loads((SOURCE/'materials/character/textures.json').read_text()).items()}

def read_obj(path):
    vertices=[]; uvs=[]; faces=[]; groups=[]; group='body'
    for line in path.read_text().splitlines():
        p=line.split()
        if not p: continue
        if p[0]=='v': vertices.append(Vector(tuple(map(float,p[1:4]))))
        elif p[0]=='vt': uvs.append(tuple(map(float,p[1:3])))
        elif p[0]=='g': group=p[1]
        elif p[0]=='f':
            faces.append([(int(v.split('/')[0])-1,int(v.split('/')[1])-1 if '/' in v and v.split('/')[1] else 0) for v in p[1:]])
            groups.append(group)
    return vertices,uvs,faces,groups
BASE,UV,FACES,GROUPS=read_obj(VENDOR/'base.obj')
RIG=json.loads((VENDOR/'default.mhskel').read_text())
RAW_WEIGHTS=json.loads((VENDOR/'default_weights.mhw').read_text())['weights']

def map_bone(n):
    side='_'+n[-1] if n.endswith(('.L','.R')) else ''
    if n.startswith('upperarm'): return 'UpperArm'+side
    if n.startswith('lowerarm'): return 'Forearm'+side
    if n.startswith(('wrist','finger','metacarpal')): return 'Hand'+side
    if n.startswith('upperleg'): return 'Thigh'+side
    if n.startswith('lowerleg'): return 'Shin'+side
    if n.startswith(('foot','toe')): return 'Foot'+side
    if n.startswith(('root','pelvis')): return 'Root'
    if n.startswith(('spine','breast','clavicle','shoulder','neck01')): return 'Spine'
    return 'Head'
WEIGHTS=[defaultdict(float) for _ in BASE]
for name, values in RAW_WEIGHTS.items():
    for i,w in values: WEIGHTS[i][map_bone(name)]+=w

def normalize(w):
    w={n:max(0,v) for n,v in w.items() if v>0.001}
    total=sum(w.values())
    return {n:v/total for n,v in w.items()} if total else {'Spine':1}
WEIGHTS=[normalize(w) for w in WEIGHTS]

def material(name,color=(1,1,1),texture=None,normal=None,alpha=False,rough=.75):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
    if texture:
        im=bpy.data.images.load(TEXTURES.get(texture.relative_to(SYSTEM).as_posix(),str(texture)) if texture.is_relative_to(SYSTEM) else str(texture),check_existing=True)
        if max(im.size)>2048: im.scale(2048,2048)
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
        if alpha:
            m.node_tree.links.new(tex.outputs['Alpha'],bs.inputs['Alpha']);m.surface_render_method='DITHERED';m.use_backface_culling=False
    if normal and normal.exists():
        im=bpy.data.images.load(TEXTURES.get(normal.relative_to(SYSTEM).as_posix(),str(normal)),check_existing=True);im.colorspace_settings.name='Non-Color'
        if max(im.size)>1024: im.scale(1024,1024)
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
        bump=m.node_tree.nodes.new('ShaderNodeNormalMap');bump.inputs['Strength'].default_value=.65
        m.node_tree.links.new(tex.outputs['Color'],bump.inputs['Color']);m.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    return m

def create_mesh(name,vertices,uvs,faces,weights,mat,rig):
    used=sorted(set(i for face in faces for i,u in face));remap={i:n for n,i in enumerate(used)}
    data=bpy.data.meshes.new(name);data.from_pydata([vertices[i] for i in used],[],[[remap[i] for i,u in f] for f in faces]);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);data.materials.append(mat)
    layer=data.uv_layers.new(name='UVMap')
    for poly,face in zip(data.polygons,faces):
        poly.use_smooth=True
        for loop,(_,u) in zip(poly.loop_indices,face):layer.data[loop].uv=uvs[u]
    vg={n:obj.vertex_groups.new(name=n) for n in rig.data.bones.keys()}
    for n,orig in enumerate(used):
        for bone,w in weights[orig].items():vg[bone].add([n],w,'REPLACE')
    mod=obj.modifiers.new('Clinical articulation','ARMATURE');mod.object=rig;obj.parent=rig
    return obj

def proxy_data(name,shaped):
    path=SYSTEM/name; data=(path/(path.name+'.mhclo')).read_text().splitlines(); verts=[];weights=[];deleted=set();mode='';scale=[1,1,1]
    for line in data:
        p=line.split()
        if not p or p[0]=='#':continue
        if p[0] in ['x_scale','y_scale','z_scale']:
            axis=['x_scale','y_scale','z_scale'].index(p[0]);scale[axis]=abs(shaped[int(p[1])][axis]-shaped[int(p[2])][axis])/float(p[3])
        elif p[0]=='verts':mode='verts'
        elif p[0]=='delete_verts':mode='delete'
        elif mode=='verts' and p[0].lstrip('-').isdigit():
            ids=[int(p[0])] if len(p)==1 else list(map(int,p[:3])); blend=[1] if len(p)==1 else list(map(float,p[3:6]));offset=Vector((0,0,0)) if len(p)==1 else Vector([float(p[6+i])*scale[i] for i in range(3)])
            verts.append(sum((shaped[i]*w for i,w in zip(ids,blend)),Vector())+offset)
            weights.append(normalize({b:sum(WEIGHTS[i].get(b,0)*w for i,w in zip(ids,blend)) for b in set(b for i in ids for b in WEIGHTS[i])}))
        elif mode=='delete':
            i=0
            while i<len(p):
                if i+2<len(p) and p[i+1]=='-':deleted.update(range(int(p[i]),int(p[i+2])+1));i+=3
                else:deleted.add(int(p[i]));i+=1
    _,uv,faces,_=read_obj(path/(path.name+'.obj'))
    return verts,uv,faces,weights,deleted

def build(female=False,older=False,dark=False):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    shaped=[v.copy() for v in BASE]
    targets=[('caucasian-male-old',1.0)] if older else [('african-male-young',1.0)] if dark else [('caucasian-female-young',.7),('asian-female-young',.3)] if female else [('caucasian-male-young',.8),('caucasian-male-old',.2)]
    for target,strength in targets:
        for line in (VENDOR/(target+'.target')).read_text().splitlines():
            p=line.split()
            if not p or p[0].startswith('#'):continue
            shaped[int(p[0])]+=Vector(tuple(map(float,p[1:4])))*strength
    body_ids=set(i for f,g in zip(FACES,GROUPS) if g=='body' for i,u in f)
    bottom=min(shaped[i].y for i in body_ids);top=max(shaped[i].y for i in body_ids);scale=(1.68 if female else 1.74)/(top-bottom)
    def convert(v):return Vector((v.x*scale,-v.z*scale,(v.y-bottom)*scale))
    def joint(b,which):
        ids=RIG['joints'][RIG['bones'][b][which]]
        return convert(sum((shaped[i] for i in ids),Vector())/len(ids))
    bones={'Root':(Vector((0,0,0)),Vector((0,0,.2)),None),'Spine':(joint('spine05','head'),joint('neck01','tail'),'Root'),'Head':(joint('head','head'),joint('head','tail'),'Spine')}
    transforms={n:Matrix.Identity(4) for n in ['Root','Spine','Head']}
    for suffix,side in [('L',1),('R',-1)]:
        for name,src,end,parent in [('Thigh','upperleg01','lowerleg01','Root'),('Shin','lowerleg01','foot','Thigh_'+suffix),('Foot','foot',None,'Shin_'+suffix)]:
            a=joint(src+'.'+suffix,'head');b=joint(end+'.'+suffix,'head') if end else joint(src+'.'+suffix,'tail')
            bones[name+'_'+suffix]=(a,b,parent);transforms[name+'_'+suffix]=Matrix.Identity(4)
        shoulder=joint('upperarm01.'+suffix,'head');elbow=joint('lowerarm01.'+suffix,'head');wrist=joint('wrist.'+suffix,'head');hand=joint('wrist.'+suffix,'tail')
        new_elbow=shoulder+Vector((side*.09,-.012,-1)).normalized()*(elbow-shoulder).length
        new_wrist=new_elbow+Vector((side*.055,-.10,-1)).normalized()*(wrist-elbow).length
        def align(a,b,c,d):return Matrix.Translation(c)@(b-a).rotation_difference(d-c).to_matrix().to_4x4()@Matrix.Translation(-a)
        upper=align(shoulder,elbow,shoulder,new_elbow);lower=align(elbow,wrist,new_elbow,new_wrist)
        new_hand=lower@hand
        bones['UpperArm_'+suffix]=(shoulder,new_elbow,'Spine');bones['Forearm_'+suffix]=(new_elbow,new_wrist,'UpperArm_'+suffix);bones['Hand_'+suffix]=(new_wrist,new_hand,'Forearm_'+suffix)
        transforms['UpperArm_'+suffix]=upper;transforms['Forearm_'+suffix]=lower;transforms['Hand_'+suffix]=lower
    def deform(vertices,weights):return [sum(((transforms[b]@convert(v))*w for b,w in ws.items()),Vector()) for v,ws in zip(vertices,weights)]
    arm=bpy.data.armatures.new('Clinical anatomy');rig=bpy.data.objects.new('ClinicalAdult',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for n,(head,tail,parent) in bones.items():
        b=arm.edit_bones.new(n);b.head=head;b.tail=tail
        if parent:b.parent=arm.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
    clothpath='clothes/male_casualsuit05' if older else 'clothes/male_casualsuit02' if dark else 'clothes/female_casualsuit01' if female else 'clothes/male_casualsuit01'
    clothes=proxy_data(clothpath,shaped);shoes=proxy_data('clothes/shoes01',shaped)
    skinfile=next((SYSTEM/('skins/old_caucasian_male' if older else 'skins/middleage_african_male' if dark else 'skins/young_caucasian_female' if female else 'skins/young_caucasian_male')).glob('*diffuse.png'))
    skin=material('Anatomical skin',texture=skinfile,rough=.64)
    body=deform(shaped,WEIGHTS);bodyfaces=[f for f,g in zip(FACES,GROUPS) if g=='body']
    hidden=clothes[4]|shoes[4]
    create_mesh('skin_outpatient',body,UV,[f for f in bodyfaces if not any(i in hidden for i,u in f)],WEIGHTS,skin,rig)
    # Keep the complete thighs underneath the gown hem. The previous .64 m
    # cutoff removed the upper legs while the skirt finished above that point,
    # leaving detached, flat-topped knees visible in the game. Hidden skin can
    # safely continue into the roomy skirt without showing through the fabric.
    gownfaces=[]
    for f in bodyfaces:
        center=sum((body[i] for i,u in f),Vector())/len(f)
        if center.z>1.40 or (abs(center.x)>.215 and center.z<1.19) or center.z<.90:
            if not any(i in shoes[4] for i,u in f):gownfaces.append(f)
    create_mesh('skin_gown',body,UV,gownfaces,WEIGHTS,skin,rig)
    for name,data,folder in [('outpatient',clothes,clothpath),('shoes',shoes,'clothes/shoes01')]:
        path=SYSTEM/folder;texture=next(path.glob('*diffuse.png'));normal=next(path.glob('*normal.png'),None)
        mat=material('Everyday cotton' if name=='outpatient' else 'Leather footwear',texture=texture,normal=normal,rough=.88 if name=='outpatient' else .65)
        fitted=deform(data[0],data[3])
        ob=create_mesh(name,fitted,data[1],data[2],data[3],mat,rig)
        if name=='outpatient' and not older:
            cotton=material('Dyed cotton',texture=None if female or dark else SOURCE/'materials/character/cotton-neutral.jpg',normal=normal,rough=.9)
            ob.data.materials.append(cotton)
            for poly,face in zip(ob.data.polygons,data[2]):
                if sum(fitted[i].z for i,u in face)/len(face)>(.87 if female else .94) or any(any(b.startswith(('UpperArm','Forearm','Hand')) and w>.3 for b,w in data[3][i].items()) for i,u in face):poly.material_index=1
    for hairname in (['ponytail01','bob02'] if female else ['short02','short04']):
        data=proxy_data('hair/'+hairname,shaped);path=SYSTEM/'hair'/hairname
        mat=material('Hair strands',texture=next(path.glob('*diffuse.png')),alpha=True,rough=.73)
        ob=create_mesh('hair_primary' if hairname in ['short02','ponytail01'] else 'hair_alternate',deform(data[0],data[3]),data[1],data[2],data[3],mat,rig)
        ob['alphaMode']='MASK'
    eyes=proxy_data('eyes/low-poly',shaped)
    create_mesh('Eyes',deform(eyes[0],eyes[3]),eyes[1],eyes[2],eyes[3],material('Natural eyes',texture=SYSTEM/'eyes/materials/brown_eye.png',rough=.26),rig)
    # Original authored garment is retained as an editable Blender source.
    with bpy.data.libraries.load(str(SOURCE/'authored-garments.blend'),link=False) as (src,dst):dst.objects=['gown']
    gown=dst.objects[0];bpy.context.collection.objects.link(gown);gown.parent=rig;gown.matrix_parent_inverse=Matrix.Identity(4)
    for mod in gown.modifiers:
        if mod.type=='ARMATURE':mod.object=rig
    # Fit the existing modest clinical garment to this adult's shoulder width and height.
    ratio=(1.68 if female else 1.74)/1.676
    surface=BVHTree.FromPolygons(body,[[i for i,u in f] for f in bodyfaces])
    nearest=KDTree(len(body))
    for i,co in enumerate(body):nearest.insert(co,i)
    nearest.balance()
    for group in list(gown.vertex_groups):gown.vertex_groups.remove(group)
    garment_groups={n:gown.vertex_groups.new(name=n) for n in bones}
    for v in gown.data.vertices:
        v.co.z*=ratio
        if v.co.z>1.0:
            co,normal,face,distance=surface.find_nearest(v.co)
            if co is not None:v.co=co+normal*.018
        elif v.co.z>.88:
            v.co.x*=1.06;v.co.y*=1.06
        _,index,_=nearest.find(v.co)
        ws=WEIGHTS[index] if v.co.z>1.05 else {'Root':1}
        for bone,w in ws.items():garment_groups[bone].add([v.index],w,'REPLACE')
    for poly in gown.data.polygons:poly.use_smooth=True
    # A draped hospital gown should remain closed over the proximal thighs.
    # The original authored panel has a side opening that can reveal a large
    # triangular wedge of thigh, especially when the patient lies supine.
    # Fit a light inner fabric lining beneath the skirt, matching its existing
    # cloth material. This stays on the pelvis just like the lower gown panels,
    # and the articulated legs move naturally behind it.
    # Tuck the upper rim well inside the fitted gown so the liner never
    # creates a visible waist seam. Widen smoothly near the slit and hem.
    rings=[
        (.615,.211,.140),(.64,.220,.146),(.68,.221,.148),
        (.73,.216,.144),(.79,.207,.138),(.86,.198,.133),
        (.93,.185,.126),(1.01,.163,.115)
    ]
    segments=48
    liner_vertices=[]
    liner_uvs=[]
    for ri,(height,rx,ry) in enumerate(rings):
        for i in range(segments):
            angle=2*math.pi*i/segments
            fold=1+.006*math.sin(angle*12+height*9)
            liner_vertices.append((math.sin(angle)*rx*fold,math.cos(angle)*ry*fold,height))
            liner_uvs.append((i/segments,ri/(len(rings)-1)))
    mesh=bpy.data.meshes.new('Gown modesty lining')
    mesh.from_pydata(liner_vertices,[],[
        (ri*segments+i,(ri+1)*segments+i,
         (ri+1)*segments+(i+1)%segments,ri*segments+(i+1)%segments)
        for ri in range(len(rings)-1) for i in range(segments)
    ])
    mesh.update()
    lining=bpy.data.objects.new('gown_underlayer',mesh)
    bpy.context.collection.objects.link(lining)
    lining.parent=rig
    mesh.materials.append(gown.data.materials[0])
    uv=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        poly.use_smooth=True
        for li in poly.loop_indices:
            uv.data[li].uv=liner_uvs[mesh.loops[li].vertex_index]
    root_group=lining.vertex_groups.new(name='Root')
    root_group.add(list(range(len(liner_vertices))),1,'REPLACE')
    modifier=lining.modifiers.new('Pelvis follow','ARMATURE')
    modifier.object=rig
    for ob in bpy.context.scene.objects:
        if ob.type=='MESH':
            ob.hide_set(False)
            if ob.name in ['skin_gown','gown','gown_underlayer','hair_alternate']:ob.hide_render=True
    bpy.context.scene['provenance']='CC0 MakeHuman anatomy, rig data, skin, eyes, hair and everyday clothes; original clinical gown. See vendor/makehuman/PROVENANCE.md.'
    bpy.context.preferences.filepaths.save_version=0
    stem='clinical-adult-older' if older else 'clinical-adult-dark' if dark else 'clinical-adult-female' if female else 'clinical-adult'
    bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(stem+'.blend')))
    for ob in bpy.context.scene.objects:ob.hide_render=False
    export=dict(export_format='GLB',export_apply=False,export_yup=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_animations=False,export_image_format='AUTO')
    if not older and not dark:bpy.ops.export_scene.gltf(filepath=str(OUT/(stem+'.glb')),**export)
    # Keep facial topology intact on the crowd; reduce only clothing and hidden garment surfaces.
    for ob in list(bpy.context.scene.objects):
        if ob.type=='MESH' and ob.name in ['outpatient','gown','gown_underlayer','shoes']:
            bpy.context.view_layer.objects.active=ob
            mod=ob.modifiers.new('Crowd garment LOD','DECIMATE');mod.ratio=.55;mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name)
    for im in bpy.data.images:
        if max(im.size)>1024:im.scale(1024,1024)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(stem+'-lod.glb')),**export)
    print('ANATOMICAL_ADULT_EXPORTED',stem,[(n,tuple(round(v,3) for v in h)) for n,(h,t,p) in bones.items()])

build(False)
build(True)
build(older=True)
build(dark=True)
manifest_path=OUT/'manifest.json';manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
manifest.update(version=2,license='MakeHuman system assets CC0 1.0; original project clinical garments',source='assets/radiography/clinical-adult.blend',generator='scripts/build-clinical-characters.py')
manifest['assets']=[a for a in manifest.get('assets',[]) if 'clinical-adult' not in a['url']]
for stem in ['clinical-adult','clinical-adult-female','clinical-adult-older','clinical-adult-dark']:
    for suffix in (['-lod'] if stem.endswith(('older','dark')) else ['', '-lod']):
        path=OUT/(stem+suffix+'.glb');manifest['assets'].append({'url':'/radiography/'+path.name,'source':'assets/radiography/'+stem+'.blend','compression':'KHR_draco_mesh_compression','license':'CC0 1.0 anatomy and system assets; original clinical gown','bytes':path.stat().st_size})
manifest['notes']=['Source provenance and source license copies are in assets/radiography/vendor/makehuman.','Visual anatomy is separate from the analytic acquisition phantom.']
manifest_path.write_text(json.dumps(manifest,indent=2))
