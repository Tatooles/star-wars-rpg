"""Renders turnaround / pose previews of the built Anakin character.

    blender -b art/blender/characters/anakin.blend -P art/blender/scripts/anakin_preview.py -- \
        --out /tmp/anakin-preview [--action Run --frames 1,6,11] [--views front,three_quarter]
"""

import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    if name in argv:
        return argv[argv.index(name) + 1]
    return default


OUT = arg("--out", "/tmp/anakin-preview")
ACTION = arg("--action")
FRAMES = [int(f) for f in arg("--frames", "1").split(",")]
VIEWS = arg("--views", "front,three_quarter,side,back,head").split(",")
RES = int(arg("--res", "900"))
os.makedirs(OUT, exist_ok=True)

scene = bpy.context.scene
try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except TypeError:
    scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = RES
scene.render.resolution_y = int(RES * 1.25)
scene.render.film_transparent = False
scene.view_settings.view_transform = "Standard"

world = bpy.data.worlds.new("PreviewWorld")
scene.world = world
try:
    world.use_nodes = True
except AttributeError:
    pass
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (0.06, 0.065, 0.075, 1)
bg.inputs["Strength"].default_value = 1.0


def add_light(name, kind, energy, loc, color, size=1.0):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = color
    if kind == "AREA":
        data.size = size
    ob = bpy.data.objects.new(name, data)
    scene.collection.objects.link(ob)
    ob.location = loc
    direction = Vector((0, 0, 1.1)) - Vector(loc)
    ob.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return ob


add_light("Key", "AREA", 420, (1.8, -2.6, 2.8), (1.0, 0.92, 0.82), 2.0)
add_light("Fill", "AREA", 140, (-2.4, -1.6, 1.4), (0.72, 0.82, 1.0), 2.5)
add_light("Rim", "AREA", 260, (0.4, 2.8, 2.4), (0.8, 0.88, 1.0), 1.5)

cam_data = bpy.data.cameras.new("PreviewCam")
cam = bpy.data.objects.new("PreviewCam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

rig = bpy.data.objects.get("AnakinRig")
if ACTION and rig:
    rig.animation_data_create()
    for track in rig.animation_data.nla_tracks:
        track.mute = True
    action = bpy.data.actions[ACTION]
    rig.animation_data.action = action
    if hasattr(rig.animation_data, "action_slot") and action.slots:
        rig.animation_data.action_slot = action.slots[0]

VIEW_SETUP = {
    # yaw degrees around the character (0 = in front), height, distance, look-at z, lens
    "front": (0, 1.0, 4.6, 0.95, 50),
    "three_quarter": (-28, 1.15, 4.6, 0.95, 50),
    "side": (90, 1.0, 4.6, 0.95, 50),
    "back": (180, 1.1, 4.6, 0.95, 50),
    "head": (-22, 1.72, 0.9, 1.69, 60),
    "game": (180, 2.4, 4.6, 1.0, 40),
    "top": (0, 5.5, 0.35, 1.0, 38),
}

for frame in FRAMES:
    scene.frame_set(frame)
    for view in VIEWS:
        yaw, height, dist, look_z, lens = VIEW_SETUP[view]
        a = math.radians(yaw)
        cam.location = (math.sin(a) * dist, -math.cos(a) * dist, height)
        cam_data.lens = lens
        direction = Vector((0, 0, look_z)) - cam.location
        cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        suffix = f"{ACTION}-{frame:03d}-" if ACTION else ""
        scene.render.filepath = os.path.join(OUT, f"{suffix}{view}.png")
        bpy.ops.render.render(write_still=True)
print("[preview] done", OUT)

# Optional contact sheet: --sheet name.png (tiles every rendered image in order)
SHEET = arg("--sheet")
if SHEET:
    import numpy as np

    files = []
    for frame in FRAMES:
        for view in VIEWS:
            suffix = f"{ACTION}-{frame:03d}-" if ACTION else ""
            files.append(os.path.join(OUT, f"{suffix}{view}.png"))
    tiles = []
    for f in files:
        img = bpy.data.images.load(f)
        w, h = img.size
        px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
        tiles.append(px)
    cols = int(arg("--cols", str(len(tiles))))
    rows = (len(tiles) + cols - 1) // cols
    h, w = tiles[0].shape[:2]
    sheet = np.zeros((rows * h, cols * w, 4), dtype=np.float32)
    for i, t in enumerate(tiles):
        r, c = divmod(i, cols)
        # image pixel rows start at the bottom
        sheet[(rows - 1 - r) * h:(rows - r) * h, c * w:(c + 1) * w] = t
    out = bpy.data.images.new("sheet", cols * w, rows * h, alpha=True)
    out.pixels = sheet.ravel()
    out.filepath_raw = os.path.join(OUT, SHEET)
    out.file_format = "PNG"
    out.save()
    print("[preview] sheet", out.filepath_raw)
