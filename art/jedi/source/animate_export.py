"""Bake seven in-place skeletal clips, preserve the editable scene, and export the runtime GLB."""
import bpy, math, json
from pathlib import Path
from mathutils import Euler, Vector
ROOT=Path(__file__).resolve().parents[3]
ART=ROOT/'art/jedi'
OUT=ROOT/'public/models/dark-jedi.glb'
bpy.ops.wm.open_mainfile(filepath=str(ART/'dark-jedi.blend'))
rig=bpy.data.objects['JediRig']
scene=bpy.context.scene
FPS=60
scene.render.fps=FPS
bpy.context.preferences.filepaths.save_version=0
for action in list(bpy.data.actions): bpy.data.actions.remove(action)
rig.animation_data_create()
for track in list(rig.animation_data.nla_tracks): rig.animation_data.nla_tracks.remove(track)


def rotate(name, angles):
    bone=rig.pose.bones[name]
    rest=rig.data.bones[name].matrix_local.to_quaternion()
    bone.rotation_mode='QUATERNION'
    bone.rotation_quaternion=rest.inverted() @ Euler(angles,'XYZ').to_quaternion() @ rest


def rest_pose():
    for bone in rig.pose.bones:
        bone.rotation_mode='QUATERNION';bone.rotation_quaternion=(1,0,0,0);bone.location=(0,0,0);bone.scale=(1,1,1)
    rotate('upperarm_r',(.02,-.32,.015))
    rotate('upperarm_l',(.02,.32,-.015))
    rotate('lowerarm_r',(.15,0,0))
    rotate('lowerarm_l',(.20,0,0))
    rotate('hand_r',(.05,0,.1))
    for bone in rig.pose.bones:
        if bone.name.startswith(('index_','middle_','ring_','pinky_')):
            bone.rotation_mode='XYZ';bone.rotation_euler=(.72 if bone.name.endswith('_r') else .12,0,0)
        elif bone.name.startswith('thumb_'):
            bone.rotation_mode='XYZ';bone.rotation_euler=(.24 if bone.name.endswith('_r') else .05,0,0)


def set_world_location(name,value):
    rig.pose.bones[name].location=rig.data.bones[name].matrix_local.to_quaternion().inverted() @ Vector(value)


def idle(t):
    rest_pose();phase=t*2*math.pi
    rotate('spine_03',(.008*math.sin(phase),0,0))
    rotate('head',(-.008*math.sin(phase),0,0))
    rotate('upperarm_l',(.02+.012*math.sin(phase),.32,-.015))


def run(t):
    rest_pose();phase=t*2*math.pi
    rotate('spine_03',(-.10,0,.05*math.sin(phase)))
    rotate('head',(.10,0,0))
    set_world_location('pelvis',(0,0,.013*math.cos(phase*2)))
    for side,sign in [('l',1),('r',-1)]:
        wave=math.sin(phase)*sign
        rotate('thigh_'+side,(-wave*.82,0,0))
        rotate('calf_'+side,(max(0,wave)*1.03+.12,0,0))
        rotate('foot_'+side,(wave*.25-.10,0,0))
        rotate('upperarm_'+side,(wave*.38,-.32 if side=='r' else .32,0))
        rotate('lowerarm_'+side,(-.16,0,0))


def lerp_pose(keys,t):
    for i in range(len(keys)-1):
        a,pa=keys[i];b,pb=keys[i+1]
        if t<=b:
            w=max(0,min(1,(t-a)/(b-a)));w=w*w*(3-2*w)
            return {name:tuple(x+(y-x)*w for x,y in zip(pa[name],pb[name])) for name in pa}
    return keys[-1][1]


def attack(t,step):
    rest_pose()
    direction=1 if step!=1 else -1
    base={'upperarm_r':(.02,-.32,.015),'lowerarm_r':(.15,0,0),'hand_r':(.05,0,.1),'spine_03':(0,0,0),'pelvis':(0,0,0),'upperarm_l':(.05,.32,0)}
    wind={'upperarm_r':(-1.0,.55,-.4*direction),'lowerarm_r':(-.6,0,-.15),'hand_r':(.65,.15,0),'spine_03':(-.05,0,-.22*direction),'pelvis':(0,0,-.08*direction),'upperarm_l':(-.25,.42,.1)}
    hit={'upperarm_r':(-.65,-.58,.63*direction),'lowerarm_r':(-.35,0,.12),'hand_r':(1.30,-.3,-.35*direction),'spine_03':(.08,0,.28*direction),'pelvis':(0,0,.12*direction),'upperarm_l':(-.45,.40,-.18)}
    if step==2:
        wind.update(upperarm_r=(-1.4,.12,-.14),lowerarm_r=(-.95,0,0),hand_r=(.8,0,0),spine_03=(-.10,0,0))
        hit.update(upperarm_r=(-.68,-.28,.08),lowerarm_r=(.22,0,0),hand_r=(1.1,0,0),spine_03=(.20,0,0))
    poses=lerp_pose([(0,base),(.13,wind),(.50,hit),(1,base)],t)
    for name,angles in poses.items():rotate(name,angles)
    rotate('thigh_l',(-.08*math.sin(t*math.pi),0,0))
    rotate('calf_l',(.12*math.sin(t*math.pi),0,0))


def block(t):
    rest_pose();breath=.012*math.sin(t*2*math.pi)
    rotate('upperarm_r',(-.9,-.20,-.35))
    rotate('lowerarm_r',(-.75,0,.1))
    rotate('hand_r',(1.25,.65,-.12))
    rotate('upperarm_l',(-.55,.25,.23))
    rotate('lowerarm_l',(-.55,.2,-.2))
    rotate('spine_03',(.04+breath,0,-.08))
    rotate('thigh_l',(-.14,0,0));rotate('calf_l',(.18,0,0))
    rotate('thigh_r',(-.1,0,0));rotate('calf_r',(.15,0,0))


def dodge(t):
    rest_pose();amount=math.sin(math.pi*t)
    rotate('spine_03',(-.5*amount,.08*amount,-.25*amount))
    rotate('head',(.18*amount,0,.12*amount))
    rotate('thigh_l',(-.7*amount,0,0));rotate('calf_l',(.65*amount,0,0))
    rotate('thigh_r',(.3*amount,0,0));rotate('calf_r',(.45*amount,0,0))
    rotate('upperarm_r',(-.15*amount,-.42,.12*amount))
    rotate('upperarm_l',(.32*amount,.4,0))
    set_world_location('pelvis',(0,0,-.09*amount))

clips=[('Idle',120,idle),('Run',28,run),('Attack1',28,lambda t:attack(t,0)),('Attack2',30,lambda t:attack(t,1)),('Attack3',37,lambda t:attack(t,2)),('Block',78,block),('Dodge',15,dodge)]
for name,frames,pose in clips:
    action=bpy.data.actions.new(name);action.use_fake_user=True
    rig.animation_data.action=action
    for frame in range(frames+1):
        scene.frame_set(frame)
        pose(frame/frames)
        for bone in rig.pose.bones:
            bone.keyframe_insert(data_path='rotation_euler' if bone.rotation_mode=='XYZ' else 'rotation_quaternion',frame=frame,group=bone.name)
            if bone.name=='pelvis':bone.keyframe_insert(data_path='location',frame=frame,group=bone.name)
    print('AUTHORED_CLIP',name,frames/FPS)

# Save a useful default studio view in the idle stance.
rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);scene.frame_start=0;scene.frame_end=120
bpy.context.view_layer.update()
# Merge static attachments by material to avoid hundreds of draw calls while preserving skin weights.
material_groups={}
for obj in bpy.data.objects:
    if obj.type=='MESH' and obj.get('game_asset') and len(obj.data.materials)==1:
        material_groups.setdefault(obj.data.materials[0].name,[]).append(obj)
for label,objects in material_groups.items():
    if len(objects)>1:
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
        objects[0].name='Jedi_'+label

# All textures and the selected reference are packed, so the scene opens without external files.
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'dark-jedi.blend'))
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
for obj in rig.children_recursive:
    if obj.type=='MESH' and obj.get('game_asset'):obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,
    export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_morph=False,
    export_yup=True,export_apply=False,export_materials='EXPORT',export_image_format='AUTO',
    export_optimize_animation_size=True,export_anim_slide_to_zero=True,export_extras=True)

# Generate review frames from the actual saved skeleton and actions.
for name,frame in [('Idle',0),('Run',7),('Attack1',11),('Block',10),('Dodge',7)]:
    rig.animation_data.action=bpy.data.actions[name];scene.frame_set(frame);bpy.context.view_layer.update()
    scene.camera.location=(3,-5,1.55);scene.camera.data.ortho_scale=2.9
    scene.camera.rotation_euler=(Vector((0,0,1.15))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(ART/'previews'/('animated-'+name+'.png'))
    bpy.ops.render.render(write_still=True)
print('EXPORTED_GLB',OUT.stat().st_size)
