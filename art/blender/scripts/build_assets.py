"""Build the original grounded-stylized asset set and validate every GLB.

Run with Blender, not CPython:
  Blender --background --factory-startup --python build_assets.py -- all
"""

from __future__ import annotations

import math
import shutil
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
BLEND_ROOT = ROOT / "art" / "blender"
MODEL_ROOT = ROOT / "public" / "assets" / "models"
PREVIEW_ROOT = ROOT / "art" / "previews"
TMP_ROOT = ROOT / ".asset-build"

for directory in (MODEL_ROOT, PREVIEW_ROOT, TMP_ROOT):
    directory.mkdir(parents=True, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0


def mat(name, color, metallic=0.0, roughness=0.65, emissive=None, emission_strength=0.0):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emissive:
        bsdf.inputs["Emission Color"].default_value = (*emissive, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return material


def finish(obj, name, material, bevel=0.0):
    obj.name = name
    if material:
        obj.data.materials.append(material)
    if bevel > 0:
        modifier = obj.modifiers.new("Soft industrial edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)
    return obj


def subdivide(obj, levels=2):
    modifier = obj.modifiers.new("Authored surface refinement", "SUBSURF")
    modifier.levels = levels
    modifier.render_levels = levels
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)
    return obj


def box(name, loc, dims, material, rot=(0, 0, 0), bevel=0.025):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    obj = bpy.context.object
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, material, bevel)


def cylinder(name, loc, radius, depth, material, rot=(0, 0, 0), vertices=12, bevel=0.015):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    return finish(bpy.context.object, name, material, bevel)


def cylinder_between(name, start, end, radius, material, vertices=12, bevel=0.015):
    start_v, end_v = Vector(start), Vector(end)
    direction = end_v - start_v
    midpoint = (start_v + end_v) * 0.5
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=direction.length,
        location=midpoint,
    )
    obj = bpy.context.object
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, material, bevel)


def cone(name, loc, r1, r2, depth, material, rot=(0, 0, 0), vertices=12, bevel=0.01):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot)
    return finish(bpy.context.object, name, material, bevel)


def sphere(name, loc, scale, material, segments=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, material, 0.0)


def ico(name, loc, scale, material, rot=(0, 0, 0), subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, material, 0.06)


def torus(name, loc, major, minor, material, rot=(0, 0, 0), segments=24):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=segments, minor_segments=6, location=loc, rotation=rot)
    return finish(bpy.context.object, name, material, 0.0)


def curve_pipe(name, points, radius, material):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, co in zip(spline.bezier_points, points):
        point.co = co
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def empty(name, loc):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "ARROWS"
    obj.empty_display_size = 0.14
    obj.location = loc
    bpy.context.collection.objects.link(obj)
    return obj


def armature(name, bones):
    data = bpy.data.armatures.new(f"{name}_ArmatureData")
    obj = bpy.data.objects.new(f"{name}_Armature", data)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    made = {}
    for bone_name, head, tail, parent in bones:
        bone = data.edit_bones.new(bone_name)
        bone.head = head
        bone.tail = tail
        if parent:
            bone.parent = made[parent]
        made[bone_name] = bone
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.select_set(False)
    obj["forward_axis"] = "+Z runtime"
    obj["root_at_ground"] = True
    return obj


def parent_to_bone(obj, rig, bone_name):
    world = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world
    return obj


def clear_pose(rig):
    for bone in rig.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = (0, 0, 0)
        bone.location = (0, 0, 0)


def action(rig, name, duration, poses):
    clip = bpy.data.actions.new(name)
    clip.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = clip
    clear_pose(rig)
    for frame, values in poses:
        bpy.context.scene.frame_set(frame)
        clear_pose(rig)
        for bone_name, rotation in values.items():
            rig.pose.bones[bone_name].rotation_euler = rotation
        for bone in rig.pose.bones:
            bone.keyframe_insert("rotation_euler", frame=frame, group=bone.name)
            if bone.name == "Root":
                bone.keyframe_insert("location", frame=frame, group=bone.name)
    clip.frame_start = 1
    clip.frame_end = duration
    rig.animation_data.action = None
    return clip


def add_character_actions(rig, kind):
    if kind == "anakin":
        action(rig, "Idle", 48, [(1, {}), (24, {"Spine": (0.025, 0, 0)}), (48, {})])
        for name, reverse in (("Run", False), ("Backpedal", True)):
            s = -1 if reverse else 1
            action(rig, name, 24, [
                (1, {"UpperLeg.L": (0.58*s, 0, 0), "UpperLeg.R": (-0.58*s, 0, 0), "UpperArm.L": (-0.35*s, 0, 0.1), "UpperArm.R": (0.35*s, 0, -0.1)}),
                (13, {"UpperLeg.L": (-0.58*s, 0, 0), "UpperLeg.R": (0.58*s, 0, 0), "UpperArm.L": (0.35*s, 0, 0.1), "UpperArm.R": (-0.35*s, 0, -0.1)}),
                (24, {"UpperLeg.L": (0.58*s, 0, 0), "UpperLeg.R": (-0.58*s, 0, 0), "UpperArm.L": (-0.35*s, 0, 0.1), "UpperArm.R": (0.35*s, 0, -0.1)}),
            ])
        attacks = [
            [(1, {"UpperArm.R": (-0.4, 0.2, -0.5)}), (9, {"UpperArm.R": (-1.5, -0.45, 0.5), "Spine": (0, 0, -0.22)}), (22, {})],
            [(1, {"UpperArm.R": (-0.5, -0.4, 0.35)}), (10, {"UpperArm.R": (-1.35, 0.65, -0.55), "Spine": (0, 0, 0.2)}), (24, {})],
            [(1, {"UpperArm.R": (-1.2, 0, -0.2)}), (12, {"UpperArm.R": (-2.2, 0, 0.05), "Spine": (-0.18, 0, 0)}), (26, {})],
        ]
        for index, poses in enumerate(attacks, 1):
            action(rig, f"Attack{index}", poses[-1][0], poses)
        action(rig, "Block", 30, [(1, {"UpperArm.R": (-1.2, 0.25, -0.45), "LowerArm.R": (-0.45, 0, 0)}), (30, {"UpperArm.R": (-1.23, 0.22, -0.45), "LowerArm.R": (-0.45, 0, 0)})])
        action(rig, "Dodge", 22, [(1, {}), (8, {"Spine": (0.15, 0, -0.55), "UpperLeg.L": (-0.4, 0, 0), "UpperLeg.R": (0.3, 0, 0)}), (22, {})])
        action(rig, "Hit", 16, [(1, {}), (6, {"Spine": (0.12, 0.18, 0.28), "Head": (-0.1, 0, 0)}), (16, {})])
        action(rig, "Defeat", 42, [(1, {}), (18, {"Spine": (0.75, 0, 0.25), "UpperLeg.L": (-0.9, 0, 0.2), "UpperLeg.R": (-0.65, 0, -0.2)}), (42, {"Spine": (1.35, 0, 0.35), "Head": (-0.5, 0, 0), "UpperArm.R": (-1.0, 0, 0.8)})])
        action(rig, "Interact", 28, [(1, {}), (12, {"UpperArm.L": (-1.0, -0.25, 0.2), "LowerArm.L": (-0.55, 0, 0)}), (28, {})])
    elif kind == "b1":
        action(rig, "Idle", 42, [(1, {}), (21, {"Head": (0.05, 0.08, 0)}), (42, {})])
        action(rig, "Move", 28, [(1, {"UpperLeg.L": (0.45, 0, 0), "UpperLeg.R": (-0.45, 0, 0)}), (15, {"UpperLeg.L": (-0.45, 0, 0), "UpperLeg.R": (0.45, 0, 0)}), (28, {"UpperLeg.L": (0.45, 0, 0), "UpperLeg.R": (-0.45, 0, 0)})])
        action(rig, "Fire", 18, [(1, {"UpperArm.R": (-0.65, 0, -0.12), "UpperArm.L": (-0.45, 0, 0.22)}), (7, {"UpperArm.R": (-0.72, 0, -0.12), "Spine": (-0.06, 0, 0)}), (18, {})])
        action(rig, "Hit", 14, [(1, {}), (5, {"Spine": (0.08, 0.25, 0.35)}), (14, {})])
        action(rig, "Defeat", 40, [(1, {}), (16, {"Spine": (0.65, 0.15, 0.4), "UpperLeg.L": (-0.5, 0, 0), "UpperLeg.R": (-0.25, 0, 0)}), (40, {"Spine": (1.45, 0.2, 0.6), "Head": (-0.7, 0, 0)})])
    else:
        action(rig, "Idle", 44, [(1, {}), (22, {"Spine": (0.018, 0, 0)}), (44, {})])
        action(rig, "Move", 32, [(1, {"UpperLeg.L": (0.32, 0, 0), "UpperLeg.R": (-0.32, 0, 0)}), (17, {"UpperLeg.L": (-0.32, 0, 0), "UpperLeg.R": (0.32, 0, 0)}), (32, {"UpperLeg.L": (0.32, 0, 0), "UpperLeg.R": (-0.32, 0, 0)})])
        action(rig, "BurstFire", 24, [(1, {"UpperArm.R": (-0.35, 0, -0.1)}), (6, {"UpperArm.R": (-0.43, 0, -0.1), "Spine": (-0.04, 0, 0)}), (12, {"UpperArm.R": (-0.35, 0, -0.1)}), (18, {"UpperArm.R": (-0.43, 0, -0.1)}), (24, {})])
        action(rig, "Melee", 24, [(1, {"UpperArm.L": (0.2, 0, 0.5)}), (10, {"UpperArm.L": (-1.35, 0, -0.45), "Spine": (-0.2, 0, 0.25)}), (24, {})])
        action(rig, "Hit", 16, [(1, {}), (6, {"Spine": (0.1, -0.16, 0.18)}), (16, {})])
        action(rig, "Defeat", 44, [(1, {}), (19, {"Spine": (0.55, 0, -0.35), "UpperLeg.L": (-0.4, 0, 0), "UpperLeg.R": (-0.35, 0, 0)}), (44, {"Spine": (1.35, 0, -0.48), "Head": (-0.55, 0, 0)})])


def humanoid_bones(scale=1.0):
    s = scale
    return [
        ("Root", (0, 0, 0), (0, 0, 0.18*s), None),
        ("Hips", (0, 0, 0.82*s), (0, 0, 1.04*s), "Root"),
        ("Spine", (0, 0, 1.04*s), (0, 0, 1.53*s), "Hips"),
        ("Head", (0, 0, 1.53*s), (0, 0, 2.02*s), "Spine"),
        ("UpperArm.L", (-0.28*s, 0, 1.48*s), (-0.61*s, 0, 1.23*s), "Spine"),
        ("LowerArm.L", (-0.61*s, 0, 1.23*s), (-0.76*s, -0.03*s, 0.94*s), "UpperArm.L"),
        ("UpperArm.R", (0.28*s, 0, 1.48*s), (0.61*s, 0, 1.23*s), "Spine"),
        ("LowerArm.R", (0.61*s, 0, 1.23*s), (0.76*s, -0.03*s, 0.94*s), "UpperArm.R"),
        ("UpperLeg.L", (-0.19*s, 0, 0.9*s), (-0.2*s, 0, 0.48*s), "Hips"),
        ("LowerLeg.L", (-0.2*s, 0, 0.48*s), (-0.2*s, 0, 0.08*s), "UpperLeg.L"),
        ("UpperLeg.R", (0.19*s, 0, 0.9*s), (0.2*s, 0, 0.48*s), "Hips"),
        ("LowerLeg.R", (0.2*s, 0, 0.48*s), (0.2*s, 0, 0.08*s), "UpperLeg.R"),
    ]


def build_anakin():
    reset()
    cloth = mat("Anakin_DarkCloth", (0.035, 0.045, 0.06), roughness=0.84)
    cloth2 = mat("Anakin_Tunic", (0.10, 0.085, 0.075), roughness=0.78)
    leather = mat("WeatheredLeather", (0.12, 0.075, 0.045), roughness=0.62)
    skin = mat("WarmSkin", (0.56, 0.30, 0.19), roughness=0.7)
    hair = mat("LongBrownHair", (0.075, 0.038, 0.022), roughness=0.9)
    metal = mat("SaberMetal", (0.3, 0.34, 0.38), metallic=0.9, roughness=0.25)
    accent = mat("SaberGrip", (0.035, 0.04, 0.045), metallic=0.35, roughness=0.5)
    rig = armature("Anakin", humanoid_bones())
    parts = []
    torso = cone("Torso", (0, 0, 1.31), .28, .43, .58, cloth, vertices=24, bevel=.025)
    parts += [(subdivide(torso, 2), "Spine")]
    parts += [(box("ShoulderTabard", (0, -0.18, 1.43), (.78, .07, .48), cloth2, rot=(0.12, 0, 0), bevel=.035), "Spine")]
    parts += [(box("RearRobeLayer", (0, .19, 1.25), (.58, .06, .78), cloth, rot=(-.08,0,0), bevel=.04), "Spine")]
    parts += [(box("InnerTunic", (0,-.22,1.30), (.46,.06,.56), cloth2, rot=(.05,0,0), bevel=.035), "Spine")]
    parts += [(cylinder("Neck", (0,0,1.63), .105,.22,skin,vertices=20,bevel=.018), "Head")]
    parts += [(box("Belt", (0, 0, 1.02), (.75, .27, .12), leather, bevel=.035), "Hips")]
    parts += [(box("BeltBuckle", (0,-.155,1.02), (.16,.055,.10), metal, bevel=.018), "Hips")]
    for side in (-1,1):
        parts += [(box(f"BeltPouch{side}", (side*.25,-.14,.98), (.15,.08,.18), leather, bevel=.025), "Hips")]
    parts += [(box("TunicPanelL", (-.17, -.08, .72), (.28, .08, .72), cloth2, rot=(0.08, 0.06, -.06)), "Hips")]
    parts += [(box("TunicPanelR", (.17, -.08, .72), (.28, .08, .72), cloth2, rot=(0.08, -.06, .06)), "Hips")]
    parts += [(sphere("Head", (0, -.015, 1.82), (.155, .145, .175), skin, segments=48, rings=32), "Head")]
    parts += [(cone("Jaw", (0,-.02,1.70), .115,.15,.16,skin,vertices=24,bevel=.018), "Head")]
    parts += [(box("Nose", (0, -.157, 1.82), (.042, .055, .075), skin, bevel=.018), "Head")]
    eye_mat = mat("Anakin_Eyes", (.035, .055, .065), roughness=.42)
    for side in (-1, 1):
        parts += [(sphere(f"Eye_{side}", (side*.055, -.151, 1.845), (.021, .012, .014), eye_mat, segments=16, rings=10), "Head")]
        parts += [(box(f"Brow_{side}", (side*.056, -.161, 1.885), (.072, .014, .014), hair, rot=(0, side*.08, side*.05), bevel=.006), "Head")]
        parts += [(sphere(f"Ear_{side}", (side*.158,-.005,1.81), (.025,.024,.045), skin, segments=16, rings=10), "Head")]
    parts += [(sphere("HairCap", (0, .015, 1.94), (.175, .16, .105), hair, segments=48, rings=28), "Head")]
    for index, (x, yaw, depth) in enumerate(((-.12,-.12,.34),(.12,.12,.34),(-.17,-.25,.42),(.17,.25,.42),(-.07,-.05,.46),(.07,.05,.46))):
        parts += [(cone(f"HairLock{index}", (x, .045, 1.75), .025, .055, depth, hair, rot=(0, yaw, 0), vertices=12, bevel=.008), "Head")]
    for side, bone in ((-1, "UpperArm.L"), (1, "UpperArm.R")):
        shoulder = (side*.28, 0, 1.48)
        elbow = (side*.61, 0, 1.23)
        hand = (side*.76, -.03, .94)
        parts += [(sphere(f"Shoulder{side}", shoulder, (.17, .15, .17), cloth, segments=24, rings=16), bone)]
        parts += [(cylinder_between(f"UpperArm{side}", shoulder, elbow, .115, cloth, vertices=20), bone)]
        fore_bone = "LowerArm.L" if side < 0 else "LowerArm.R"
        parts += [(sphere(f"Elbow{side}", elbow, (.105, .10, .105), leather, segments=20, rings=12), fore_bone)]
        parts += [(cylinder_between(f"Forearm{side}", elbow, hand, .095, leather, vertices=20), fore_bone)]
        parts += [(sphere(f"Hand{side}", hand, (.078, .068, .10), skin, segments=24, rings=16), fore_bone)]
        for finger in range(3):
            parts += [(cylinder(f"Finger{side}_{finger}", (side*(.79+finger*.006),-.08-finger*.018,.91), .012,.10,skin,rot=(math.pi/2,0,0),vertices=10,bevel=.004), fore_bone)]
    for side, upper, lower, x in ((-1, "UpperLeg.L", "LowerLeg.L", -.2), (1, "UpperLeg.R", "LowerLeg.R", .2)):
        parts += [(cone(f"Thigh{side}", (x, 0, .69), .13, .16, .48, cloth, vertices=12), upper)]
        parts += [(sphere(f"Knee{side}", (x,-.01,.46), (.135,.125,.12), leather, segments=20, rings=12), lower)]
        parts += [(cone(f"Boot{side}", (x, 0, .25), .125, .105, .46, leather, vertices=20), lower)]
        parts += [(box(f"Foot{side}", (x, -.07, .06), (.24, .36, .13), leather, bevel=.045), lower)]
    hilt = cylinder("Authored_Lightsaber_Hilt", (.78, -.08, .79), .055, .34, metal, rot=(math.pi/2, 0, 0), vertices=16, bevel=.018)
    grip = cylinder("Saber_Grip", (.78, -.08, .79), .061, .15, accent, rot=(math.pi/2, 0, 0), vertices=12, bevel=.01)
    emitter = torus("Saber_Emitter", (.78, -.255, .79), .064, .013, metal, rot=(math.pi/2, 0, 0), segments=16)
    parts += [(hilt, "LowerArm.R"), (grip, "LowerArm.R"), (emitter, "LowerArm.R")]
    for obj, bone in parts:
        parent_to_bone(obj, rig, bone)
    anchor = parent_to_bone(empty("SaberBladeAnchor", (.78, -.28, .79)), rig, "LowerArm.R")
    anchor.rotation_euler = (math.pi/2, 0, 0)
    rig["asset"] = "Original grounded-stylized Anakin interpretation"
    add_character_actions(rig, "anakin")
    clear_pose(rig)
    bpy.context.scene.frame_set(1)
    return rig


def build_b1():
    reset()
    tan = mat("B1_BattleTan", (0.46, 0.38, 0.24), metallic=.18, roughness=.68)
    tan2 = mat("B1_WornEdges", (0.62, 0.52, 0.34), metallic=.12, roughness=.58)
    dark = mat("DroidMechanics", (0.035, 0.045, 0.047), metallic=.72, roughness=.38)
    scorch = mat("B1_Scorch", (0.025, 0.018, 0.012), metallic=.2, roughness=.85)
    rig = armature("B1", humanoid_bones(.94))
    parts = []
    parts += [(cone("B1_Chest", (0, 0, 1.24), .23, .16, .48, tan, vertices=8), "Spine")]
    parts += [(box("B1_Backpack", (0, .17, 1.28), (.36, .16, .43), dark, bevel=.025), "Spine")]
    parts += [(box("B1_Head", (0, -.06, 1.72), (.38, .43, .18), tan2, rot=(.10, 0, 0), bevel=.035), "Head")]
    parts += [(box("B1_Snout", (0, -.31, 1.68), (.20, .22, .10), tan, rot=(.08, 0, 0), bevel=.025), "Head")]
    parts += [(box("Photoreceptor", (0, -.425, 1.72), (.24, .025, .035), dark, bevel=.008), "Head")]
    parts += [(cylinder("B1_Neck", (0, 0, 1.54), .055, .22, dark, vertices=8), "Head")]
    parts += [(sphere("B1_Pelvis", (0,0,.86), (.24,.18,.18), dark, segments=12, rings=8), "Hips")]
    for rib_index, (rib_z, rib_width) in enumerate(((1.16,.40),(1.28,.36),(1.39,.30))):
        parts += [(box(f"B1_ChestRib_{rib_index}", (0,-.18,rib_z), (rib_width,.08,.055), tan2, bevel=.014), "Spine")]
    parts += [(cylinder("B1_Antenna", (.13,.01,1.96), .012,.34,dark,rot=(0,.22,0),vertices=6,bevel=0), "Head")]
    for side, upper, lower in ((-1, "UpperArm.L", "LowerArm.L"), (1, "UpperArm.R", "LowerArm.R")):
        shoulder = (side*.28*.94, 0, 1.48*.94)
        elbow = (side*.61*.94, 0, 1.23*.94)
        hand = (side*.76*.94, -.03*.94, .94*.94)
        parts += [(sphere(f"B1_Shoulder{side}", shoulder, (.11,.09,.11), dark, segments=10, rings=6), upper)]
        parts += [(cylinder_between(f"B1_UpperArm{side}", shoulder, elbow, .058, tan, vertices=8), upper)]
        parts += [(sphere(f"B1_Elbow{side}", elbow, (.085, .075, .085), dark, segments=10, rings=6), lower)]
        parts += [(cylinder_between(f"B1_Forearm{side}", elbow, hand, .065, tan2, vertices=8), lower)]
        parts += [(sphere(f"B1_Hand{side}", hand, (.075,.065,.085), dark, segments=8, rings=6), lower)]
    for side, upper, lower, x in ((-1, "UpperLeg.L", "LowerLeg.L", -.14), (1, "UpperLeg.R", "LowerLeg.R", .14)):
        parts += [(cylinder(f"B1_Thigh{side}", (x, 0, .67), .065, .48, tan, vertices=8), upper)]
        parts += [(sphere(f"B1_Knee{side}", (x,0,.46), (.09,.08,.09), dark, segments=10, rings=6), lower)]
        parts += [(cylinder(f"B1_Shin{side}", (x, 0, .27), .06, .5, tan2, vertices=8), lower)]
        parts += [(box(f"B1_Foot{side}", (x, -.12, .055), (.19, .38, .10), tan, bevel=.025), lower)]
    blaster = box("E5_Blaster", (.70, -.25, .92), (.11, .72, .12), dark, rot=(.08, 0, 0), bevel=.025)
    barrel = cylinder("E5_Barrel", (.70, -.64, .90), .026, .42, dark, rot=(math.pi/2, 0, 0), vertices=10)
    scorch_mark = cylinder("ScorchMark", (-.1, -.18, 1.28), .08, .012, scorch, rot=(math.pi/2, 0, 0), vertices=12, bevel=0)
    parts += [(blaster, "LowerArm.R"), (barrel, "LowerArm.R"), (scorch_mark, "Spine")]
    for obj, bone in parts:
        parent_to_bone(obj, rig, bone)
    parent_to_bone(empty("Muzzle_B1", (.70, -.86, .90)), rig, "LowerArm.R")
    rig["asset"] = "Original B1 battle droid benchmark"
    add_character_actions(rig, "b1")
    clear_pose(rig)
    bpy.context.scene.frame_set(1)
    return rig


def build_b2():
    reset()
    armor = mat("B2_SlateArmor", (.11, .16, .19), metallic=.68, roughness=.4)
    edge = mat("B2_WornEdges", (.22, .28, .30), metallic=.72, roughness=.34)
    dark = mat("B2_Mechanics", (.025, .035, .04), metallic=.82, roughness=.3)
    scorch = mat("B2_Scorch", (.018, .012, .01), metallic=.28, roughness=.78)
    rig = armature("B2", humanoid_bones(1.08))
    parts = []
    parts += [(cone("B2_Core", (0, .05, 1.28), .46, .62, .78, armor, vertices=10), "Spine")]
    parts += [(box("B2_ChestPlate", (0, -.25, 1.48), (1.02, .22, .50), edge, rot=(.10, 0, 0), bevel=.08), "Spine")]
    parts += [(box("B2_Head", (0, -.10, 1.88), (.70, .52, .32), armor, rot=(.08, 0, 0), bevel=.07), "Head")]
    parts += [(box("B2_Visor", (0, -.38, 1.89), (.47, .04, .07), dark, bevel=.015), "Head")]
    parts += [(box("B2_Brow", (0, -.39, 1.99), (.62, .05, .08), edge, bevel=.02), "Head")]
    parts += [(box("B2_Jaw", (0,-.35,1.76), (.44,.16,.12), armor, rot=(-.08,0,0), bevel=.035), "Head")]
    for side in (-1,1):
        parts += [(box(f"B2_ChestVent{side}", (side*.25,-.38,1.45), (.18,.045,.20), dark, rot=(0,0,side*.1), bevel=.02), "Spine")]
    for plate_index, plate_z in enumerate((1.18,1.05,.92)):
        parts += [(box(f"B2_AbPlate{plate_index}", (0,-.23,plate_z), (.54-.06*plate_index,.12,.12), edge, bevel=.025), "Spine")]
    for side, upper, lower in ((-1, "UpperArm.L", "LowerArm.L"), (1, "UpperArm.R", "LowerArm.R")):
        shoulder = (side*.28*1.08, 0, 1.48*1.08)
        elbow = (side*.61*1.08, 0, 1.23*1.08)
        hand = (side*.76*1.08, -.03*1.08, .94*1.08)
        parts += [(sphere(f"B2_Shoulder{side}", shoulder, (.34, .31, .34), armor), upper)]
        parts += [(cylinder_between(f"B2_UpperArm{side}", shoulder, elbow, .19, armor, vertices=12, bevel=.025), upper)]
        parts += [(sphere(f"B2_Elbow{side}", elbow, (.22,.20,.22), dark, segments=12, rings=8), lower)]
        parts += [(cylinder_between(f"B2_Forearm{side}", elbow, hand, .22, edge, vertices=12, bevel=.03), lower)]
        parts += [(box(f"B2_Knuckle{side}", hand, (.34,.26,.24), armor, bevel=.05), lower)]
    for side, upper, lower in ((-1, "UpperLeg.L", "LowerLeg.L"), (1, "UpperLeg.R", "LowerLeg.R")):
        parts += [(cone(f"B2_Thigh{side}", (side*.25, 0, .7), .19, .27, .58, armor, vertices=10), upper)]
        parts += [(sphere(f"B2_Knee{side}", (side*.25,0,.48), (.23,.20,.20), dark, segments=12, rings=8), lower)]
        parts += [(cylinder(f"B2_Shin{side}", (side*.25, 0, .28), .19, .56, edge, vertices=10), lower)]
        parts += [(box(f"B2_Foot{side}", (side*.25, -.14, .07), (.42, .62, .14), armor, bevel=.055), lower)]
    cannon = cylinder("B2_ArmCannon", (.82, -.35, .96), .13, .62, dark, rot=(math.pi/2, 0, 0), vertices=12, bevel=.018)
    muzzle_ring = torus("B2_MuzzleRing", (.82, -.67, .96), .135, .025, edge, rot=(math.pi/2, 0, 0), segments=16)
    mark = cylinder("B2_ScorchMark", (.22, -.37, 1.43), .11, .015, scorch, rot=(math.pi/2, 0, 0), vertices=14, bevel=0)
    parts += [(cannon, "LowerArm.R"), (muzzle_ring, "LowerArm.R"), (mark, "Spine")]
    for obj, bone in parts:
        parent_to_bone(obj, rig, bone)
    parent_to_bone(empty("Muzzle_B2", (.82, -.82, .96)), rig, "LowerArm.R")
    rig["asset"] = "Original B2 super battle droid"
    add_character_actions(rig, "b2")
    clear_pose(rig)
    bpy.context.scene.frame_set(1)
    return rig


def add_barrier(index, loc, rotation, metal, accent):
    root = empty(f"Barrier_{index:02}", loc)
    root.rotation_euler[2] = rotation
    for x in (-1.15, 1.15):
        post = box(f"Barrier_{index}_Post_{x}", (loc[0]+x*math.cos(rotation), loc[1]+x*math.sin(rotation), .55), (.18, .18, 1.1), metal, bevel=.035)
        post.rotation_euler[2] = rotation
    rail = box(f"Barrier_{index}_Rail", (loc[0], loc[1], .62), (2.55, .16, .36), accent, rot=(0, 0, rotation), bevel=.045)
    return root, rail


def build_outpost():
    reset()
    rust = mat("RustRock", (.26, .12, .065), roughness=.96)
    rust2 = mat("RockSunward", (.38, .18, .09), roughness=.92)
    ground = mat("DustGround", (.12, .075, .055), roughness=1.0)
    path = mat("CompactedPath", (.26, .16, .105), roughness=.94)
    metal = mat("SeparatistSlate", (.085, .12, .14), metallic=.64, roughness=.46)
    edge = mat("ChippedMetalEdges", (.19, .24, .25), metallic=.7, roughness=.38)
    red = mat("OutpostSignal", (.22, .025, .012), metallic=.25, roughness=.4, emissive=(1.0, .055, .018), emission_strength=3.0)
    cable = mat("Cables", (.018, .022, .024), metallic=.4, roughness=.55)
    box("Ground_Main", (0, -10, -.55), (24, 78, 1), ground, bevel=.08)
    for index in range(13):
        z = 22 - index * 5.3
        slab = box(f"PathSlab_{index:02}", (0, z, .015), (7.4, 4.6, .05), path, rot=(0, 0, .015 if index % 2 == 0 else -.015), bevel=.02)
        slab["module"] = "path"
    rocks = [
        (-8.6,14,1.4, (2.7,2.0,2.1), .42), (9,10,1.1,(2.2,3.2,1.7),-.25),
        (-9.4,-4,1.8,(1.8,3.6,2.7),-.32), (9.5,-10,1.2,(2.1,2.6,1.8),.2),
        (-8.8,-24,1.2,(2.3,3.6,1.8),.3), (9.6,-30,1.5,(2.0,3.1,2.2),-.3),
        (-10.4,23,1.1,(2.4,2.7,1.5),.1), (10.6,-42,1.6,(2.0,2.6,2.4),-.2),
    ]
    for i,(x,y,z,scale,rotation) in enumerate(rocks):
        rock = ico(f"RockFormation_{i+1:02}", (x,y,z), scale, rust if i%2 else rust2, rot=(.08, .15, rotation), subdivisions=2)
        rock["lod_group"] = f"rock-{i+1}"
        if i < 6:
            shard = ico(f"RockShard_{i+1:02}", (x + (1 if i%2 else -1)*1.5, y+.5, .42), (.65,.9,.5), rust, rot=(.2,0,rotation), subdivisions=1)
            shard["set_dressing"] = True
    for x in (-5.7, 5.7):
        box(f"OutpostWall_{x}", (x,-5,1.8), (1.1,8,4.6), metal, bevel=.09)
        for z in (-7.8,-4.8,-2.2):
            box(f"WallTrim_{x}_{z}", (x + (-.57 if x < 0 else .57),z,1.8), (.08,.28,3.9), edge, bevel=.025)
    cylinder("RaisedPlatform", (0,-22,.15), 8.85, .5, metal, vertices=16, bevel=.08)
    torus("PlatformTrim", (0,-22,.42), 8.3, .12, edge, segments=32)
    box("BeaconDeck", (0,-42,-.45), (18,12,.9), metal, bevel=.1)
    for x in (-6.3, 6.3):
        cone(f"AntennaBase_{x}", (x,-39,2.4), 1.1,.65,5.4,metal,vertices=10,bevel=.06)
        cylinder(f"AntennaMast_{x}", (x,-39,5.0), .18,4.4,edge,rot=(0,.62 if x>0 else -.62,0),vertices=10)
    for i,(x,y,r) in enumerate([(-4.8,-31,.05),(4.8,-31,-.05),(-4.7,15,.12),(4.8,-16,-.08)]):
        add_barrier(i+1,(x,y,0),r,metal,edge)
    for i,(x,y) in enumerate([(-5.2,-31),(5.2,-31),(-7.2,-39),(7.2,-39),(-4.5,-17),(4.4,4)]):
        box(f"PowerBox_{i+1:02}", (x,y,.72), (.9,.75,1.45), metal, bevel=.08)
        box(f"PowerPanel_{i+1:02}", (x,y-.39,.82), (.46,.04,.64), red, bevel=.02)
        cylinder(f"PowerCap_{i+1:02}", (x,y,1.5), .29,.14,edge,vertices=10)
    for i,(x,y) in enumerate([(-7.6,18),(7.5,1),(-7.5,-13),(7.2,-26)]):
        for layer in range(2):
            box(f"Crate_{i}_{layer}", (x + layer*.42,y+layer*.18,.34+layer*.62), (.95,.95,.62), metal, rot=(0,0,.08*i), bevel=.06)
            box(f"CrateBand_{i}_{layer}", (x + layer*.42,y-.49+layer*.18,.34+layer*.62), (.58,.04,.34), edge, rot=(0,0,.08*i), bevel=.015)
    curve_pipe("Cable_Main", [(-5.2,-31,.2),(-3,-34,.08),(0,-38,.08),(5.8,-39,.2)], .055, cable)
    curve_pipe("Cable_Platform", [(-6,-20,.47),(-2,-22,.52),(2,-22,.52),(6,-24,.47)], .045, cable)
    # Blender's +Y exports toward runtime -Z. Mirror authored gameplay-Z here so
    # the GLB lands on the existing Three/Rapier coordinates without runtime
    # negative scaling or any collision-layout change.
    for obj in list(bpy.context.scene.objects):
        obj.location.y *= -1
        obj.rotation_euler.z *= -1
        if obj.type == "CURVE":
            for spline in obj.data.splines:
                for point in spline.bezier_points:
                    point.co.y *= -1
    root = empty("OutpostKit_Root", (0,0,0))
    root["asset"] = "Original modular Separatist outpost kit"
    return root


def build_beacon():
    reset()
    metal = mat("BeaconSlate", (.075,.11,.13), metallic=.78, roughness=.34)
    edge = mat("BeaconEdgeWear", (.22,.27,.28), metallic=.82, roughness=.28)
    glow = mat("BeaconGlow", (.22,.018,.008), metallic=.18, roughness=.32, emissive=(1,.035,.012), emission_strength=4.0)
    cable = mat("BeaconCable", (.018,.022,.025), metallic=.45, roughness=.5)
    cylinder("Beacon_Base", (0,0,1.0), 2.8,2.0,metal,vertices=14,bevel=.1)
    cylinder("Beacon_Upper", (0,0,2.05), 1.85,.42,edge,vertices=14,bevel=.06)
    for index, angle in enumerate((0, math.pi/2, math.pi, math.pi*1.5)):
        x,y = math.cos(angle)*2.15, math.sin(angle)*2.15
        box(f"BeaconButtress_{index}", (x,y,.9), (.5,.72,1.65), metal, rot=(0,0,angle), bevel=.06)
        box(f"BeaconGlowPanel_{index}", (x-math.cos(angle)*.28,y-math.sin(angle)*.28,1.05), (.28,.08,.7), glow, rot=(0,0,angle), bevel=.02)
    mast = cylinder("Beacon_Mast", (0,0,3.6), .24,3.0,edge,vertices=12,bevel=.03)
    rings = empty("Beacon_Rings", (0,0,3.3))
    for i,rotation in enumerate(((math.pi/2,0,0),(math.pi/2,0,math.pi/2))):
        ring = torus(f"BeaconRing_{i+1}", (0,0,3.3), 1.55,.10,edge,rot=rotation,segments=28)
        ring.parent = rings
    dish = cone("Beacon_Dish", (0,0,5.05), 1.2,.18,.35,metal,vertices=20,bevel=.04)
    cone("Beacon_Emitter", (0,0,5.35), .22,.1,.42,glow,vertices=12,bevel=.02)
    curve_pipe("BeaconCableA", [(-1.8,0,.2),(-1.2,-.8,.3),(0,-1.1,.35)], .06, cable)
    curve_pipe("BeaconCableB", [(1.8,.2,.2),(1.1,.8,.28),(0,1.15,.35)], .06, cable)
    mast["inactive_state"] = "runtime emissive and beam treatment"
    root = empty("Beacon_Root", (0,0,0))
    root["asset"] = "Original communications beacon"
    return root


BUILDERS = {
    "anakin": (build_anakin, BLEND_ROOT / "characters" / "anakin.blend"),
    "b1": (build_b1, BLEND_ROOT / "characters" / "b1.blend"),
    "b2": (build_b2, BLEND_ROOT / "characters" / "b2.blend"),
    "outpost-kit": (build_outpost, BLEND_ROOT / "environment" / "outpost-kit.blend"),
    "beacon": (build_beacon, BLEND_ROOT / "environment" / "beacon.blend"),
}

EXPECTED_ACTIONS = {
    "anakin": {"Idle","Run","Backpedal","Attack1","Attack2","Attack3","Block","Dodge","Hit","Defeat","Interact"},
    "b1": {"Idle","Move","Fire","Hit","Defeat"},
    "b2": {"Idle","Move","BurstFire","Melee","Hit","Defeat"},
    "outpost-kit": set(),
    "beacon": set(),
}
EXPECTED_NODES = {
    "anakin": {"Anakin_Armature","Authored_Lightsaber_Hilt","SaberBladeAnchor"},
    "b1": {"B1_Armature","B1_Head","E5_Blaster","Muzzle_B1"},
    "b2": {"B2_Armature","B2_Head","B2_ArmCannon","Muzzle_B2"},
    "outpost-kit": {"OutpostKit_Root","RaisedPlatform","PowerBox_01","RockFormation_01"},
    "beacon": {"Beacon_Root","Beacon_Rings","Beacon_Base","Beacon_Emitter"},
}


def add_preview_stage(asset):
    world = bpy.context.scene.world or bpy.data.worlds.new("Dusk World")
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (.018,.025,.04,1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = .3
    bpy.ops.object.light_add(type="AREA", location=(4,-6,7))
    bpy.context.object.data.energy = 1100
    bpy.context.object.data.color = (1,.55,.3)
    bpy.context.object.data.shape = "DISK"
    bpy.context.object.data.size = 5
    bpy.ops.object.light_add(type="AREA", location=(-4,2,5))
    bpy.context.object.data.energy = 850
    bpy.context.object.data.color = (.22,.48,1)
    bpy.context.object.data.size = 4
    if asset in {"outpost-kit"}:
        camera_location, target = (28,42,34), (0,-12,0)
    elif asset == "beacon":
        camera_location, target = (7,-9,6), (0,0,2.4)
    else:
        camera_location, target = (4,-7,3.0), (0,0,1.0)
        box("PreviewGround", (0,0,-.08), (6,6,.12), mat("PreviewGroundMat",(.05,.04,.035),roughness=1), bevel=.02)
    bpy.ops.object.camera_add(location=camera_location)
    camera = bpy.context.object
    camera.name = "PreviewCamera"
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 52
    bpy.context.scene.camera = camera
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_ROOT / f"{asset}.png")
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


def export_glb(path):
    properties = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    requested = {
        "filepath": str(path),
        "export_format": "GLB",
        "export_animations": True,
        "export_animation_mode": "ACTIONS",
        "export_materials": "EXPORT",
        "export_cameras": False,
        "export_lights": False,
        "export_apply": True,
    }
    bpy.ops.export_scene.gltf(**{key:value for key,value in requested.items() if key in properties})


def metrics():
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and not obj.name.startswith("Preview")]
    triangles = sum(len(poly.vertices)-2 for obj in meshes for poly in obj.data.polygons)
    materials = {slot.material.name for obj in meshes for slot in obj.material_slots if slot.material}
    return len(meshes), triangles, len(materials)


def build_and_validate(asset):
    builder, blend_path = BUILDERS[asset]
    blend_path.parent.mkdir(parents=True, exist_ok=True)
    builder()
    mesh_count, triangle_count, material_count = metrics()
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), check_existing=False)
    add_preview_stage(asset)
    bpy.ops.wm.open_mainfile(filepath=str(blend_path))
    tmp_path = TMP_ROOT / f"{asset}.candidate.glb"
    export_glb(tmp_path)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(tmp_path))
    names = {obj.name for obj in bpy.context.scene.objects}
    missing_nodes = EXPECTED_NODES[asset] - names
    imported_actions = {clip.name.split("|")[-1] for clip in bpy.data.actions}
    missing_actions = EXPECTED_ACTIONS[asset] - imported_actions
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if missing_nodes or missing_actions or (asset in {"anakin","b1","b2"} and not armatures):
        raise RuntimeError(f"{asset} clean import failed; nodes={sorted(missing_nodes)} actions={sorted(missing_actions)} armatures={len(armatures)}")
    final_path = MODEL_ROOT / f"{asset}.glb"
    shutil.move(tmp_path, final_path)
    print(f"ASSET_VALIDATED {asset} meshes={mesh_count} triangles={triangle_count} materials={material_count} actions={len(imported_actions)} bytes={final_path.stat().st_size}")


if __name__ == "__main__":
    requested = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["all"]
    assets = list(BUILDERS) if requested == ["all"] else requested
    for asset_name in assets:
        if asset_name not in BUILDERS:
            raise SystemExit(f"Unknown asset {asset_name}; choose {', '.join(BUILDERS)}")
        build_and_validate(asset_name)
    print("ALL_REQUESTED_ASSETS_VALIDATED", ",".join(assets))
