"""Author the reference-inspired dark Jedi using Blender 5.1 CLI and MPFB's CC0 human topology."""
import bpy, sys, math, random, json
from pathlib import Path
from mathutils import Vector, Euler
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[3]
CACHE = ROOT / '.asset-cache'
ART = ROOT / 'art/jedi'
OUT = ROOT / 'public/models'
PREVIEWS = ART / 'previews'
for directory in [OUT, PREVIEWS]: directory.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(CACHE / 'mpfb/mpfb2-2.0.17/src'))
# Keep MPFB's extension data inside this task, without changing the user's Blender preferences.
_original_path = bpy.utils.extension_path_user
bpy.utils.extension_path_user = lambda package, **kwargs: str(CACHE / 'mpfb-user') if package == 'mpfb' else _original_path(package, **kwargs)
bpy.ops.preferences.addon_enable(module='mpfb')
from mpfb.services.humanservice import HumanService
from mpfb.services.targetservice import TargetService

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x = 720
scene.render.resolution_y = 960
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'
scene.world.color = (0.16, 0.16, 0.16)
scene.render.fps = 60

macro = TargetService.get_default_macro_info_dict()
macro.update(gender=1.0, age=0.35, muscle=0.64, weight=0.5, proportions=0.75)
macro['race'] = {'caucasian': 1.0, 'african': 0.0, 'asian': 0.0}
human = HumanService.create_human(macro_detail_dict=macro)
human.name = 'JediHumanSource'
for fragment, weight in [('head/head-square',0.3), ('head/head-scale-horiz-decr',0.12), ('nose/nose-width-decr',0.12)]:
    path = CACHE / ('mpfb/mpfb2-2.0.17/src/mpfb/data/targets/' + fragment + '.target.gz')
    if path.exists(): TargetService.load_target(human, str(path), weight=weight)
rig = HumanService.add_builtin_rig(human, 'game_engine')
rig.name = 'JediRig'
rig.data.name = 'JediSkeleton'


def material(name, color, roughness=0.7, metallic=0.0, image=None):
    mat = bpy.data.materials.new(name)
    mat.use_fake_user = True
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if image:
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = image
        mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


def load_texture(path, size=1024):
    im = bpy.data.images.load(str(path), check_existing=True)
    if max(im.size) > size: im.scale(size, size)
    im.pack()
    return im


def weave_texture(name, rgb, leather=False):
    size = 256
    rng = random.Random(19 if leather else 11)
    values = []
    for y in range(size):
        for x in range(size):
            grain = rng.uniform(-0.035, 0.035)
            weave = (math.sin(x * math.pi) + math.sin(y * math.pi * .5)) * .028
            value = 1 + grain + (weave if not leather else grain * 2)
            values.extend([max(0, min(1, c * value)) for c in rgb] + [1])
    im = bpy.data.images.new(name, width=size, height=size)
    im.pixels.foreach_set(values)
    im.pack()
    return im

skin_tex = load_texture(CACHE / 'skin/skins/toigo_light_skin_male_bronze/young_lightskinned_male_diffuse_Bronze.png')
skin = material('NaturalSkin', (0.58, 0.34, 0.22), .65, image=skin_tex)
cloth = material('CharcoalWovenTunic', (.038,.035,.033), .88, image=weave_texture('CharcoalWeave', (.17,.16,.15)))
trouser_mat = material('DarkBrownTrousers', (.052,.037,.028), .87, image=weave_texture('TrouserWeave', (.21,.17,.145)))
leather = material('WeatheredChestnutLeather', (.075,.036,.018), .62, image=weave_texture('LeatherGrain', (.285,.185,.12), True))
boot_mat = material('DarkBootLeather', (.039,.023,.016), .53, image=weave_texture('BootLeatherGrain', (.19,.125,.09), True))
seam_mat = material('LeatherEdgeStitch', (.19,.103,.047), .75)
metal = material('BrushedSteel', (.31,.34,.37), .3, .85)
black_metal = material('BlackHiltGrip', (.012,.016,.018), .4, .65)

hair = HumanService.add_mhclo_asset(str(CACHE / 'hair/hair/cortu_short_messy_hair/cortu_short_messy_hair.mhclo'), human,
    asset_type='Hair', subdiv_levels=0, material_type='MAKESKIN', interpolate_weights=True, import_subrig=False, import_weights=False)
hair.name = 'WavyBrownHair'
# The authored clumps have strand detail in their normal and color maps.
hair_tex = load_texture(CACHE / 'hair/hair/cortu_short_messy_hair/short_messy_diff.png')
hair_mat = material('ChestnutHair', (.055,.026,.01), .7, image=hair_tex)
# Preserve the authored hair-card alpha and tint the strands chestnut.
hair_pixels = list(hair_tex.pixels[:])
for index in range(0,len(hair_pixels),4):
    luminance = sum(hair_pixels[index:index+3])/3
    hair_pixels[index:index+3] = [0.14+luminance*.22,0.07+luminance*.12,0.035+luminance*.065]
hair_tex.pixels.foreach_set(hair_pixels)
hair_tex.filepath_raw=str(CACHE/'chestnut-hair.png'); hair_tex.file_format='PNG'; hair_tex.save(); hair_tex.pack()
hair_nodes=hair_mat.node_tree
hair_shader=hair_nodes.nodes.get('Principled BSDF')
hair_image=next(n for n in hair_nodes.nodes if n.type=='TEX_IMAGE')
hair_nodes.links.new(hair_image.outputs['Alpha'],hair_shader.inputs['Alpha'])
hair_nodes.links.remove(hair_shader.inputs['Base Color'].links[0])
hair_shader.inputs['Base Color'].default_value=(.075,.035,.014,1)
hair_mat.surface_render_method='DITHERED'
hair_mat.use_transparency_overlap=False
hair.data.materials.clear(); hair.data.materials.append(hair_mat)
for v in hair.data.vertices:
    if v.co.y < -.075 and v.co.z < 1.49: v.co.z += .055
    elif v.co.z < 1.31: v.co.z += .025

# Authored, fitted eye topology rather than exposed unbounded eyeball spheres.
eyes = HumanService.add_mhclo_asset(str(CACHE / 'eyes/low-poly/low-poly.mhclo'), human,
    asset_type='Eyes', subdiv_levels=0, material_type='NONE', interpolate_weights=False, import_subrig=False, import_weights=False)
eyes.name = 'Eyes'
eye_tex = load_texture(CACHE / 'eyes/materials/brown_eye.png', 512)
eye_mat = material('HazelEyes', (.4,.3,.15), .2, image=eye_tex)
eyes.data.materials.clear(); eyes.data.materials.append(eye_mat)

# Bake the anatomical morphs while preserving the authored vertex groups and UVs.
def baked_copy(obj, name):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph), preserve_all_data_layers=True, depsgraph=depsgraph)
    result = obj.copy(); result.data = mesh; result.name = name
    bpy.context.collection.objects.link(result)
    for modifier in list(result.modifiers): result.modifiers.remove(modifier)
    result.parent = rig
    result.matrix_parent_inverse = rig.matrix_world.inverted()
    return result

body = baked_copy(human, 'Skin')
body.data.materials.clear(); body.data.materials.append(skin)
for p in body.data.polygons: p.material_index = 0; p.use_smooth = True
bone_names = set(rig.data.bones.keys())


def weights(vertex, obj=body):
    return {obj.vertex_groups[g.group].name:g.weight for g in vertex.groups if obj.vertex_groups[g.group].name in bone_names and g.weight > .001}


def subset(source, name, predicate, mat, inflate=0.0):
    result = source.copy(); result.data = source.data.copy(); result.name = name
    bpy.context.collection.objects.link(result)
    bpy.ops.object.select_all(action='DESELECT'); result.select_set(True); bpy.context.view_layer.objects.active = result
    # Only remove faces here; delete orphan vertices too after selection.
    for face in result.data.polygons: face.select = not predicate(face, source)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='FACE'); bpy.ops.mesh.delete(type='FACE'); bpy.ops.object.mode_set(mode='OBJECT')
    for v in result.data.vertices:
        v.co += v.normal * inflate
    result.data.materials.clear(); result.data.materials.append(mat)
    for p in result.data.polygons: p.material_index = 0; p.use_smooth = True
    return result


def center(face, obj):
    return sum((obj.data.vertices[i].co for i in face.vertices), Vector()) / len(face.vertices)


def arm_weight(face, obj):
    names = ('upperarm_', 'lowerarm_')
    return sum(sum(w for n,w in weights(obj.data.vertices[i],obj).items() if n.startswith(names)) for i in face.vertices) / len(face.vertices)


def hand_weight(face, obj):
    return sum(sum(w for n,w in weights(obj.data.vertices[i],obj).items() if n.startswith(('hand_', 'thumb_', 'index_', 'middle_', 'ring_', 'pinky_'))) for i in face.vertices) / len(face.vertices)

# Real anatomical shoulder and elbow surfaces make the sleeves deform naturally.
# Sleeves are constructed as smooth garment panels below, avoiding exposed cut topology.
trousers = subset(body, 'FittedTrousers', lambda p,o: .28 < center(p,o).z < .815, trouser_mat, .012)
boots = subset(body, 'TallLeatherBoots', lambda p,o: .08 < center(p,o).z < .38, boot_mat, .011)
# Replace the exposed source body's covered torso, feet, and legs with only skin that is actually visible.
visible_skin = subset(body, 'FaceNeckAndHands', lambda p,o: all(o.data.vertices[i].co.z>1.325 for i in p.vertices) or all(o.data.vertices[i].co.z>1.23 and abs(o.data.vertices[i].co.x)<.09 for i in p.vertices) or hand_weight(p,o)>.1, skin)
bpy.data.objects.remove(body, do_unlink=True)
body = visible_skin

# Transfer the authored human skinning to garment panels using nearby body vertices.
# Keep the original anatomical mesh in memory, hidden and excluded from export, as a fitting cage.
cage = baked_copy(human, 'FittingCage')
cage.hide_render = True; cage.hide_set(True)
kdtree = KDTree(len(cage.data.vertices))
for v in cage.data.vertices: kdtree.insert(v.co, v.index)
kdtree.balance()


def bind(obj, rigid=None):
    # Remove MPFB helper groups from runtime meshes and keep at most four normalized influences.
    for g in list(obj.vertex_groups):
        if g.name not in bone_names: obj.vertex_groups.remove(g)
    if rigid:
        for g in list(obj.vertex_groups): obj.vertex_groups.remove(g)
        group=obj.vertex_groups.new(name=rigid); group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    elif not obj.vertex_groups:
        groups={name:obj.vertex_groups.new(name=name) for name in bone_names}
        for v in obj.data.vertices:
            distances=kdtree.find_n(v.co, 3)
            accum={}
            for _,i,d in distances:
                factor=1/max(.0001,d)**2
                for name,w in weights(cage.data.vertices[i],cage).items(): accum[name]=accum.get(name,0)+factor*w
            top=sorted(accum.items(),key=lambda a:a[1],reverse=True)[:4]
            total=sum(w for _,w in top)
            if total:
                for name,w in top: groups[name].add([v.index],w/total,'REPLACE')
    for v in obj.data.vertices:
        top=sorted([(g.group,g.weight) for g in v.groups],key=lambda a:a[1],reverse=True)
        for index,_ in top[4:]: obj.vertex_groups[index].remove([v.index])
        total=sum(w for _,w in top[:4])
        if total:
            for index,w in top[:4]: obj.vertex_groups[index].add([v.index],w/total,'REPLACE')
    obj.parent=rig
    obj.matrix_parent_inverse=rig.matrix_world.inverted()
    for m in list(obj.modifiers):
        if m.type=='ARMATURE': obj.modifiers.remove(m)
    modifier=obj.modifiers.new('JediSkinning','ARMATURE'); modifier.object=rig
    obj['game_asset']=True
    for p in obj.data.polygons: p.use_smooth=True
    return obj


def mesh_object(name, verts, faces, mat, uv=True):
    mesh=bpy.data.meshes.new(name+'Mesh'); mesh.from_pydata(verts, [], faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    if uv:
        layer=mesh.uv_layers.new(name='UVMap')
        for face in mesh.polygons:
            for li in face.loop_indices:
                v=mesh.vertices[mesh.loops[li].vertex_index].co
                layer.data[li].uv=(v.x*3+.5,v.z*3)
    return obj


def finish_surface(obj, thickness=.003, subdiv=1):
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj
    if subdiv:
        mod=obj.modifiers.new('TailoredSurface','SUBSURF'); mod.levels=subdiv; bpy.ops.object.modifier_apply(modifier=mod.name)
    if thickness:
        mod=obj.modifiers.new('LeatherThickness','SOLIDIFY'); mod.thickness=thickness; bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

# Smooth tailored sleeves follow the arm centerline; the shoulder openings overlap the torso.
for side in ['l','r']:
    upper=rig.data.bones['upperarm_'+side]; lower=rig.data.bones['lowerarm_'+side]
    axis=(upper.tail_local-upper.head_local).normalized()
    sections=[(upper.head_local-axis*.03+Vector((0,0,-.018)),.052), (upper.head_local+axis*.03,.070),
              (upper.head_local.lerp(upper.tail_local,.7),.052), (upper.tail_local,.049),
              (lower.head_local.lerp(lower.tail_local,.35),.046),
              (lower.head_local.lerp(lower.tail_local,.75),.037), (lower.tail_local,.032)]
    vv=[];ff=[];n=24
    for j,(centerpoint,radius) in enumerate(sections):
        direction=(sections[min(j+1,len(sections)-1)][0]-sections[max(j-1,0)][0]).normalized()
        u=direction.cross(Vector((0,1,0))).normalized(); v=direction.cross(u).normalized()
        for k in range(n):
            angle=k*2*math.pi/n;point=centerpoint+radius*(u*math.cos(angle)+v*math.sin(angle))
            vv.append(tuple(point))
    for j in range(len(sections)-1):
        for k in range(n):ff.append((j*n+k,j*n+(k+1)%n,(j+1)*n+(k+1)%n,(j+1)*n+k))
    finish_surface(mesh_object('TailoredSleeve_'+side,vv,ff,cloth),.004,1)

# Tailored split skirt: a structured fabric garment, not the cone used by the old character.
verts=[]; faces=[]; rings=10; segments=48
for j in range(rings):
    t=j/(rings-1); z=.795-t*.235
    rx=.153+t*.045; ry=.102+t*.03
    for k in range(segments):
        angle=2*math.pi*k/segments
        fold=.004*math.sin(angle*12)*(t+.3)
        verts.append(((rx+fold)*math.sin(angle),(ry+fold)*math.cos(angle),z+.007*math.cos(angle*2)*t))
for j in range(rings-1):
    for k in range(segments):
        # Small front and back splits expose independent legs and prevent animation pinching.
        if j>4 and k in [0,1,23,24,25,47]: continue
        faces.append((j*segments+k,j*segments+(k+1)%segments,(j+1)*segments+(k+1)%segments,(j+1)*segments+k))
skirt=finish_surface(mesh_object('SplitTunicHem',verts,faces,cloth),.004)

# Tailored torso from a garment pattern, with no anatomical nipple or muscle impressions.
vv=[]; ff=[]; sections=[(.765,.158,.117),(.83,.163,.124),(.94,.165,.126),(1.06,.19,.137),(1.16,.213,.139),(1.22,.23,.108),(1.265,.18,.075),(1.338,.074,.066)]
for j,(z,rx,ry) in enumerate(sections):
    for k in range(48):
        a=2*math.pi*k/48
        fold=.0025*math.sin(a*10+j*.45)
        vv.append(((rx+fold)*math.sin(a),(ry+fold)*math.cos(a),z+(.088*min(0,math.cos(a)) if j==len(sections)-1 else 0)))
for j in range(len(sections)-1):
    for k in range(48):
        a=j*48+k; ff.append((a,j*48+(k+1)%48,(j+1)*48+(k+1)%48,(j+1)*48+k))
finish_surface(mesh_object('TailoredCharcoalTunic',vv,ff,cloth),.004,1)

# Two continuous leather shoulder tabards, over the shoulders and down front and back.
# The front panels cross the chest lightly and separate below the belt like the reference.
for side in [-1,1]:
    rows=[(.56,.155,.16),(.765,.13,.13),(.98,.115,.11),(1.16,.104,.14),(1.24,.054,.158),(1.274,-.012,.155),(1.22,-.105,.148),(1.16,-.148,.14),(1.08,-.151,.12),(.98,-.137,.105),(.845,-.142,.10),(.765,-.151,.123),(.67,-.16,.147),(.56,-.176,.163)]
    vv=[]; ff=[]; columns=7
    for z,y,cx in rows:
        for k in range(columns):
            t=k/(columns-1); x=side*(cx+(t-.5)*.083)
            vv.append((x,y-.006*math.sin(math.pi*t),z))
    for j in range(len(rows)-1):
        for k in range(columns-1): a=j*columns+k; ff.append((a,a+1,a+1+columns,a+columns))
    panel=finish_surface(mesh_object('LeatherTabard'+('Left' if side>0 else 'Right'),vv,ff,leather),.005,1)
    # Stitching follows panel edges, and shares their skinning.
    for edge in [0,columns-1]:
        curve=bpy.data.curves.new('TabardStitch','CURVE'); curve.dimensions='3D'; curve.bevel_depth=.00075; curve.bevel_resolution=1
        spline=curve.splines.new('POLY'); spline.points.add(len(rows)-1)
        for j,(z,y,cx) in enumerate(rows): spline.points[j].co=(*vv[j*columns+edge][:2],z,1)
        stitch=bpy.data.objects.new('TabardEdgeStitch',curve); bpy.context.collection.objects.link(stitch); curve.materials.append(seam_mat)
        bpy.ops.object.select_all(action='DESELECT'); stitch.select_set(True); bpy.context.view_layer.objects.active=stitch; bpy.ops.object.convert(target='MESH')

# The charcoal crossover collar hides anatomical pec contours and follows the reference's V-neck.
for side in [-1,1]:
    vv=[]; ff=[]
    for j in range(12):
        t=j/11; z=1.28-t*.37; cx=side*(.065-t*.105); y=-.082-.075*math.sin(t*math.pi*.75)
        for k in range(3): vv.append((cx+side*(k-1)*.018,y-.004,z))
    for j in range(11):
        for k in range(2): a=j*3+k; ff.append((a,a+1,a+4,a+3))
    finish_surface(mesh_object('CrossWrapCollar',vv,ff,cloth),.003,1)


def band(name,z,rx,ry,height,mat,bone='pelvis',cx=0,cy=0):
    vv=[]; ff=[]; n=48
    for h in [-height/2,height/2]:
        for k in range(n):
            angle=2*math.pi*k/n; vv.append((cx+rx*math.sin(angle),cy+ry*math.cos(angle),z+h))
    for k in range(n): ff.append((k,(k+1)%n,(k+1)%n+n,k+n))
    return bind(finish_surface(mesh_object(name,vv,ff,mat),.004,0),bone)

band('WideLeatherBelt',.815,.168,.127,.059,leather)
band('LowerBeltPiping',.787,.17,.129,.006,boot_mat)
band('UpperBeltPiping',.845,.17,.129,.006,boot_mat)


def cube(name,position,scale,mat,bone='pelvis',bevel=.002):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position)
    obj=bpy.context.object; obj.name=name; obj.scale=scale
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod=obj.modifiers.new('RoundedEdges','BEVEL'); mod.width=bevel; mod.segments=2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return bind(obj,bone)

cube('BeltBuckle', (0,-.138,.814), (.071,.016,.032),metal)
cube('BuckleInset',(0,-.149,.814),(.04,.003,.016),black_metal)
for x in [-.105,.105]:
    cube('BeltLoop',(x,-.11,.815),(.012,.018,.077),boot_mat)
    cube('BeltRivet',(x,-.122,.832),(.007,.005,.007),metal)
cube('SmallUtilityPouch',(.149,-.048,.79),(.055,.03,.085),boot_mat)

# Boot straps are attached to the shin. The toe's authored anatomy stays inside the leather boot.
for side in ['l','r']:
    sign=1 if side=='l' else -1
    band('BootTopCuff_'+side,.375,.065,.058,.03,leather,'calf_'+side,sign*.144,-.031)
    band('BootStrap_'+side,.338,.062,.057,.022,boot_mat,'calf_'+side,sign*.148,-.027)
    cube('BootStrapBuckle_'+side,(sign*.207,-.027,.339),(.012,.03,.02),metal,'calf_'+side)
    cube('BootSole_'+side,(sign*.174,-.085,.004),(.105,.239,.015),black_metal,'foot_'+side,.009)
    # Smooth, shaped boot uppers cover the base mesh's anatomical toes.
    vv=[]; ff=[]; slices=[(.036,.028,.071),(.017,.047,.085),(-.03,.054,.106),(-.105,.058,.079),(-.18,.052,.058),(-.218,.024,.037)]
    for y,rx,top in slices:
        for k in range(24):
            a=2*math.pi*k/24
            vv.append((sign*.174+rx*math.sin(a),y,.007+(top-.007)*(.5+.5*math.cos(a))))
    for j in range(len(slices)-1):
        for k in range(24):
            a=j*24+k; ff.append((a,j*24+(k+1)%24,(j+1)*24+(k+1)%24,(j+1)*24+k))
    ff.append(tuple(range(23,-1,-1))); ff.append(tuple(range(120,144)))
    bind(finish_surface(mesh_object('RoundedBootFoot_'+side,vv,ff,boot_mat),.003,1),'foot_'+side)
    # Four leather cuff bands follow each authored forearm's diagonal axis.
    upper=rig.data.bones['lowerarm_'+side]
    head=upper.head_local; tail=upper.tail_local
    axis=tail-head
    for j in range(4):
        pos=head.lerp(tail,.38+j*.12)
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.057-j*.003, depth=.027, location=pos)
        obj=bpy.context.object; obj.name='LeatherBracerBand_'+side
        obj.rotation_mode='QUATERNION'; obj.rotation_quaternion=axis.to_track_quat('Z','Y')
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        obj.data.materials.append(leather if j%2 else boot_mat); bind(obj,'lowerarm_'+side)

# Eyebrows sit on the authored facial surface and restore the reference's strong brow line.
face_bvh = BVHTree.FromPolygons([v.co for v in cage.data.vertices],[list(p.vertices) for p in cage.data.polygons])
brow_mat=material('BrownEyebrows',(.045,.018,.008),.85)
for side in [-1,1]:
    for strand in range(30):
        t=strand/29; x=side*(.018+t*.047); z=1.472+.007*math.sin(t*math.pi*.85)
        points=[]
        for k in range(3):
            xx=x+side*k*.0014; zz=z+k*.0008
            hit,normal,_,_=face_bvh.ray_cast(Vector((xx,-1,zz)),Vector((0,1,0)))
            if hit: points.append(hit+normal*.0012)
        if len(points)!=3: continue
        curve=bpy.data.curves.new('BrowHair','CURVE');curve.dimensions='3D';curve.bevel_depth=.0006;curve.bevel_resolution=1
        spline=curve.splines.new('POLY');spline.points.add(2)
        for point,value in zip(spline.points,points):point.co=(*value,1)
        obj=bpy.data.objects.new('EyebrowHair',curve);bpy.context.collection.objects.link(obj);curve.materials.append(brow_mat)
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH');bind(obj,'head')

# Saber meshes are weighted to the actual hand, so every exported clip moves the weapon with the grip.
hand=rig.data.bones['hand_r']
weapon_origin=hand.head_local+Vector((-.012,-.025,-.017))
weapon_axis=Vector((-.17,-.14,1)).normalized()

def cylinder(name,along,radius,length,mat):
    location=weapon_origin+weapon_axis*along
    bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=radius,depth=length,location=location)
    obj=bpy.context.object; obj.name=name
    obj.rotation_mode='QUATERNION'; obj.rotation_quaternion=weapon_axis.to_track_quat('Z','Y')
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj.data.materials.append(mat)
    return bind(obj,'hand_r')

cylinder('SaberHilt',0,.019,.18,metal)
for along in [-.065,-.036,-.007,.022,.05]: cylinder('HiltGripRing',along,.0205,.014,black_metal)
cylinder('SaberEmitter',.095,.024,.027,metal)
blade_mat=material('SaberBladeCore',(.3,.7,1),.2)
bsdf=blade_mat.node_tree.nodes.get('Principled BSDF'); bsdf.inputs['Emission Color'].default_value=(.3,.7,1,1); bsdf.inputs['Emission Strength'].default_value=3
cylinder('SaberBladeCore',.65,.011,1.07,blade_mat)

# Bind all garments, keeping the non-exported fitting cage out of the asset.
for obj in list(bpy.data.objects):
    if obj.type=='MESH' and obj not in [human,cage] and not obj.get('game_asset'):
        bind(obj,'head' if obj in [hair,eyes] else None)
# Hanging garment panels follow the hips below the belt, rather than stretching across alternating legs.
for obj in bpy.data.objects:
    if obj.type=='MESH' and (obj.name.startswith(('LeatherTabard','TabardEdgeStitch')) or obj.name=='SplitTunicHem'):
        group=obj.vertex_groups.get('pelvis') or obj.vertex_groups.new(name='pelvis')
        for vertex in obj.data.vertices:
            if vertex.co.z<.87:
                for existing in list(vertex.groups):obj.vertex_groups[existing.group].remove([vertex.index])
                group.add([vertex.index],1,'REPLACE')
for obj in [human,cage]: bpy.data.objects.remove(obj,do_unlink=True)

# Runtime character is 2.3 world units tall, matching the old player collider and camera.
rig.scale=(1.5,1.5,1.5)
rig['reference']='art/jedi/reference/dark-jedi.png'
rig['appearance']='Reference 02: charcoal wrap tunic, chestnut leather tabards, bracers, fitted trousers, tall boots, wavy hair.'

# Add the chosen reference to the editable scene, hidden from game export and renders.
reference=bpy.data.objects.new('SelectedReference02',None); bpy.context.collection.objects.link(reference)
reference.empty_display_type='IMAGE'; reference.data=bpy.data.images.load(str(ART/'reference/dark-jedi.png')); reference.data.pack()
reference.hide_render=True; reference.location=(2,0,1.1); reference.empty_display_size=2.3

# Studio cameras and softboxes live in the .blend, and are excluded from game export.
def point_at(obj,target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,size,color in [('Key',(-3,-4,5),420,4,(1,.87,.75)),('Fill',(4,-3,3),230,3,(.77,.87,1)),('Rim',(1,3,4),400,3,(1,.92,.82))]:
    data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.shape='DISK'; data.size=size; data.color=color
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj); obj.location=loc; point_at(obj,(0,0,1.2))
bpy.ops.object.camera_add(location=(0,-5.2,1.3)); camera=bpy.context.object; camera.name='CharacterReviewCamera'; camera.data.type='ORTHO'; camera.data.ortho_scale=2.65; point_at(camera,(0,0,1.16)); scene.camera=camera

# Animation authoring follows below; all clips are sampled into the exported GLB.
# Keep neutral render separate from the armed idle stance.
def render(name,loc,target,scale):
    camera.location=loc; camera.data.ortho_scale=scale; point_at(camera,target)
    scene.render.filepath=str(PREVIEWS/(name+'.png')); bpy.ops.render.render(write_still=True)

bpy.ops.wm.save_as_mainfile(filepath=str(ART/'dark-jedi.blend'))
render('front-neutral',(0,-5.2,1.3),(0,0,1.16),2.65)
render('face-review',(0,-3,2.14),(0,-.07,2.13),.57)
render('side-neutral',(5.2,0,1.3),(0,0,1.16),2.65)
print('CHARACTER_CREATED',sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH'))
