"""Procedurally builds the game-ready Anakin character.

Run from the repository root:

    blender -b --factory-startup -P art/blender/scripts/anakin_build.py

Outputs:
    art/blender/characters/anakin.blend
    public/models/anakin.glb

Reference art lives in art/concepts/anakin (01-hero-three-quarter.jpg is the
primary appearance target; 02/03/10 are construction references).

Conventions: meters, Z up, the character faces -Y (glTF export turns that into
+Z, which is the game's forward). Character left is +X.
"""

import math
import os
import random
import sys
from math import cos, pi, radians, sin

import bmesh
import bpy
from mathutils import Euler, Matrix, Quaternion, Vector, noise

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)

BLEND_OUT = os.path.join(REPO, "art", "blender", "characters", "anakin.blend")
GLB_OUT = os.path.join(REPO, "public", "models", "anakin.glb")

rng = random.Random(1977)
FWD = Vector((0, -1, 0))
UP = Vector((0, 0, 1))
MB_SCALE = 1 / 0.575  # metaball radius needed for a given surface radius


# ---------------------------------------------------------------------------
# Colors (authored in sRGB, stored linear in the color attribute)
# ---------------------------------------------------------------------------

def lin(hex_color):
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return Vector(out)


PAL = {
    "robe": lin("#4c2d1b"),
    "robe_dark": lin("#2a180e"),
    "robe_light": lin("#71482c"),
    "tunic": lin("#1f1b19"),
    "tunic_light": lin("#302a26"),
    "scarf": lin("#2b2826"),
    "scarf_light": lin("#3d3834"),
    "pants": lin("#1c1918"),
    "leather": lin("#4b2f1d"),
    "leather_dark": lin("#2e1c11"),
    "leather_light": lin("#6d4a30"),
    "boot": lin("#2a1f19"),
    "boot_light": lin("#45352b"),
    "buckle": lin("#9a958c"),
    "skin": lin("#cf9270"),
    "skin_shadow": lin("#a86a4e"),
    "skin_warm": lin("#d68d70"),
    "lip": lin("#b06f5e"),
    "scar": lin("#9c5448"),
    "eye_white": lin("#cbbfb3"),
    "iris": lin("#2c3e52"),
    "brow": lin("#3a2416"),
    "hair": lin("#4e301d"),
    "hair_dark": lin("#2a190f"),
    "hair_light": lin("#74502f"),
    "steel": lin("#383b40"),
    "steel_light": lin("#7a7e85"),
    "steel_dark": lin("#1f2124"),
    "hilt": lin("#b7bcc2"),
    "hilt_dark": lin("#1a1a1b"),
    "blade": lin("#eaf6ff"),
    "glow": lin("#3aa0ff"),
}


def n3(p, scale=1.0, offset=0.0):
    return noise.noise(Vector(p) * scale + Vector((offset, offset * 0.7, offset * 1.3)))


def weathered(base, dark, light, p, scale=18.0, amount=0.55, offset=0.0):
    """Cloth/leather variation: low-frequency blotches plus fine grain."""
    blotch = n3(p, scale * 0.35, offset)
    grain = n3(p, scale * 2.4, offset + 3.1)
    t = blotch * 0.7 + grain * 0.3
    if t < 0:
        return base.lerp(dark, min(1.0, -t * amount * 1.6))
    return base.lerp(light, min(1.0, t * amount))


# ---------------------------------------------------------------------------
# Scene + materials
# ---------------------------------------------------------------------------

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = 30
    scene.unit_settings.system = "METRIC"
    return scene


MATS = {}


def make_material(name, roughness, metallic=0.0, double_sided=False, emission=None):
    mat = bpy.data.materials.new(name)
    try:
        mat.use_nodes = True
    except AttributeError:
        pass
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    vc = nt.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Col"
    nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = 4.0
    mat.use_backface_culling = not double_sided
    MATS[name] = mat
    return mat


def build_materials():
    make_material("Cloth", 0.92, double_sided=True)
    make_material("Leather", 0.58)
    make_material("Skin", 0.55)
    make_material("Hair", 0.62, double_sided=True)
    make_material("Metal", 0.38, metallic=0.55)
    make_material("Hilt", 0.28, metallic=0.75)
    make_material("SaberBlade", 0.5, emission=PAL["blade"])


# ---------------------------------------------------------------------------
# Mesh helpers
# ---------------------------------------------------------------------------

COLLECTION = None
WEIGHTS = {}  # object name -> weight spec


def make_object(name, verts, faces, mat, colors, smooth=True, weight=None, recalc=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    if recalc:
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
    for poly in me.polygons:
        poly.use_smooth = smooth
    attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    for i, c in enumerate(colors):
        attr.data[i].color = (c[0], c[1], c[2], 1.0)
    me.color_attributes.active_color = attr
    me.materials.append(MATS[mat])
    ob = bpy.data.objects.new(name, me)
    COLLECTION.objects.link(ob)
    if weight is not None:
        WEIGHTS[name] = weight
    return ob


def frame_for(t):
    ref = FWD if abs(t.dot(FWD)) < 0.9 else UP
    w = (ref - t * ref.dot(t)).normalized()
    u = w.cross(t).normalized()
    return u, w


def _sgnpow(v, e):
    return math.copysign(abs(v) ** e, v)


def loft(name, sections, segs, mat, color, closed_ring=True, arc=None,
         cap_start=False, cap_end=False, smooth=True, face_keep=None,
         weight=None, hem=None, recalc=True):
    """Sweep cross-sections along a path.

    Each section: c (center), rx, ry, optional n (superellipse exponent),
    arc=(deg0, deg1) override, frame=(u, w) override, t (tangent override).
    Angle 0 points along u, 90 along w (w is "forward" for vertical paths).
    color(p, v, angle_deg) -> linear rgb, where v is 0..1 along the path.
    """
    centers = [Vector(s["c"]) for s in sections]
    count = len(sections)
    ring_open = arc is not None or any("arc" in s for s in sections)
    columns = segs + 1 if ring_open else segs
    verts, meta = [], []
    for i, s in enumerate(sections):
        if "frame" in s:
            u, w = (Vector(s["frame"][0]).normalized(), Vector(s["frame"][1]).normalized())
        else:
            t = Vector(s["t"]).normalized() if "t" in s else (
                centers[min(i + 1, count - 1)] - centers[max(i - 1, 0)]).normalized()
            u, w = frame_for(t)
        a0, a1 = (s.get("arc") or arc or (0, 360))
        exponent = 2.0 / s.get("n", 2.0)
        for j in range(columns):
            a = radians(a0 + (a1 - a0) * j / segs)
            ca, sa = cos(a), sin(a)
            rx, ry = s["rx"], s["ry"]
            if "fn" in s:
                rx, ry = s["fn"](math.degrees(a) % 360, rx, ry)
            p = centers[i] + u * (rx * _sgnpow(ca, exponent)) + w * (ry * _sgnpow(sa, exponent))
            verts.append(p)
            meta.append((i / max(1, count - 1), math.degrees(a) % 360))
    if hem:
        amp, bias = hem
        base = (count - 1) * columns
        for j in range(columns):
            jag = (1.0 if j % 2 else 0.35) * amp * (0.5 + 0.5 * rng.random())
            verts[base + j] = verts[base + j] + Vector((0, 0, bias - jag))
            if count > 1:
                prev = (count - 2) * columns + j
                verts[prev] = verts[prev] + Vector((0, 0, -jag * 0.25))
    faces = []
    for i in range(count - 1):
        for j in range(segs if ring_open else columns):
            j2 = (j + 1) % columns
            a, b = i * columns + j, i * columns + j2
            c, d = (i + 1) * columns + j2, (i + 1) * columns + j
            if face_keep is not None:
                mid = (verts[a] + verts[b] + verts[c] + verts[d]) / 4
                ang = (meta[a][1] + ((meta[b][1] - meta[a][1] + 180) % 360 - 180) / 2) % 360
                if not face_keep(ang, mid):
                    continue
            faces.append((a, b, c, d))
    if cap_start:
        verts.append(centers[0].copy())
        meta.append((0.0, 0.0))
        ci = len(verts) - 1
        for j in range(columns if not ring_open else segs):
            faces.append((ci, (j + 1) % columns, j))
    if cap_end:
        verts.append(centers[-1].copy())
        meta.append((1.0, 0.0))
        ci = len(verts) - 1
        base = (count - 1) * columns
        for j in range(columns if not ring_open else segs):
            faces.append((ci, base + j, base + (j + 1) % columns))
    colors = [color(p, m[0], m[1]) for p, m in zip(verts, meta)]
    return make_object(name, verts, faces, mat, colors, smooth=smooth, weight=weight, recalc=recalc)


def ellipsoid_rot(axis_x, axis_y, axis_z):
    m = Matrix((axis_x, axis_y, axis_z)).transposed()
    return m.to_quaternion()


def metaball_object(name, elements, mat, color, resolution=0.004, threshold=0.6,
                    target_faces=None, weight=None):
    """elements: dicts with co, r (surface radius), optional size (x,y,z factors),
    rot (Quaternion), s (stiffness), neg (bool)."""
    mb = bpy.data.metaballs.new(f"MB{name}")
    mb.resolution = resolution
    mb.render_resolution = resolution
    mb.threshold = threshold
    holder = bpy.data.objects.new(f"MB{name}", mb)
    COLLECTION.objects.link(holder)
    for e in elements:
        el = mb.elements.new(type="ELLIPSOID" if "size" in e else "BALL")
        el.co = Vector(e["co"])
        el.radius = e["r"] * MB_SCALE
        el.stiffness = e.get("s", 2.0)
        if "size" in e:
            el.size_x, el.size_y, el.size_z = e["size"]
        if "rot" in e:
            el.rotation = e["rot"]
        el.use_negative = e.get("neg", False)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(holder.evaluated_get(dg))
    bpy.data.objects.remove(holder)
    bpy.data.metaballs.remove(mb)
    ob = bpy.data.objects.new(name, me)
    COLLECTION.objects.link(ob)
    if target_faces and len(me.polygons) > target_faces:
        mod = ob.modifiers.new("Decimate", "DECIMATE")
        mod.ratio = target_faces / len(me.polygons)
        dg = bpy.context.evaluated_depsgraph_get()
        reduced = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
        ob.modifiers.clear()
        ob.data = reduced
        bpy.data.meshes.remove(me)
        me = reduced
    for poly in me.polygons:
        poly.use_smooth = True
    attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    for v in me.vertices:
        c = color(v.co)
        attr.data[v.index].color = (c[0], c[1], c[2], 1.0)
    me.color_attributes.active_color = attr
    me.materials.append(MATS[mat])
    if weight is not None:
        WEIGHTS[name] = weight
    return ob


def rounded_box(name, center, size, axes, mat, color, n=4.0, weight=None, flap=None):
    """A soft box (superellipse cross-section lofted along its local Z)."""
    ax, ay, az = (Vector(a).normalized() for a in axes)
    c = Vector(center)
    hz = size[2] / 2
    rows = [(-hz, 0.92), (-hz * 0.9, 1.0), (hz * 0.9, 1.0), (hz, 0.92)]
    sections = []
    for dz, k in rows:
        sections.append({"c": c + az * dz, "rx": size[0] / 2 * k, "ry": size[1] / 2 * k,
                         "n": n, "frame": (ax, ay)})
    return loft(name, sections, 16, mat, color, cap_start=True, cap_end=True, weight=weight,
                smooth=True)


def torus(name, center, axis, major, minor, mat, color, segs=14, ring_segs=6, arc=360, weight=None):
    axis = Vector(axis).normalized()
    ref = UP if abs(axis.dot(UP)) < 0.9 else FWD
    e1 = (ref - axis * ref.dot(axis)).normalized()
    e2 = axis.cross(e1)
    closed = arc >= 360
    cols = segs if closed else segs + 1
    verts, faces = [], []
    for i in range(cols):
        a = radians(arc * i / segs)
        radial = e1 * cos(a) + e2 * sin(a)
        ring_c = Vector(center) + radial * major
        for j in range(ring_segs):
            b = 2 * pi * j / ring_segs
            verts.append(ring_c + radial * (minor * cos(b)) + axis * (minor * sin(b)))
    for i in range(segs):
        i2 = (i + 1) % cols
        for j in range(ring_segs):
            j2 = (j + 1) % ring_segs
            faces.append((i * ring_segs + j, i * ring_segs + j2, i2 * ring_segs + j2, i2 * ring_segs + j))
    colors = [color(v) for v in verts]
    return make_object(name, verts, faces, mat, colors, weight=weight)


# ---------------------------------------------------------------------------
# Skeleton layout
# ---------------------------------------------------------------------------

def mirror(v):
    return Vector((-v[0], v[1], v[2]))


JOINTS = {
    "root": ((0, 0, 0), (0, 0, 0.12), None),
    "hips": ((0, 0.01, 0.97), (0, 0.01, 1.08), "root"),
    "spine": ((0, 0.01, 1.08), (0, 0.005, 1.24), "hips"),
    "chest": ((0, 0.005, 1.24), (0, 0.01, 1.44), "spine"),
    "neck": ((0, 0.012, 1.45), (0, 0.004, 1.585), "chest"),
    "head": ((0, 0.004, 1.585), (0, 0.004, 1.84), "neck"),
    "shoulder.L": ((0.025, 0.012, 1.415), (0.175, 0.016, 1.435), "chest"),
    "upper_arm.L": ((0.185, 0.016, 1.425), (0.35, 0.022, 1.19), "shoulder.L"),
    "forearm.L": ((0.35, 0.022, 1.19), (0.497, 0.0, 0.978), "upper_arm.L"),
    "hand.L": ((0.497, 0.0, 0.978), (0.553, -0.005, 0.893), "forearm.L"),
    "thigh.L": ((0.095, 0.012, 0.945), (0.105, 0.004, 0.52), "hips"),
    "shin.L": ((0.105, 0.004, 0.52), (0.11, 0.028, 0.095), "thigh.L"),
    "foot.L": ((0.11, 0.028, 0.095), (0.11, -0.105, 0.022), "shin.L"),
}
for _name in [n for n in JOINTS if n.endswith(".L")]:
    _h, _t, _p = JOINTS[_name]
    JOINTS[_name.replace(".L", ".R")] = (
        tuple(mirror(_h)), tuple(mirror(_t)), _p.replace(".L", ".R") if _p.endswith(".L") else _p)


def J(name, which=0):
    return Vector(JOINTS[name][which])


def along(a, b, t):
    return a.lerp(b, t)


HAND_R_DIR = (J("hand.R", 1) - J("hand.R")).normalized()
GRIP = J("hand.R") + HAND_R_DIR * 0.072  # center of the saber grip
# Blade points (almost) forward in the rest pose, exactly perpendicular to the hand bone so the
# hand bone's Z axis (after align_roll) is the blade direction.
HILT_AXIS = (FWD - HAND_R_DIR * FWD.dot(HAND_R_DIR)).normalized()
JOINTS["saber"] = (tuple(GRIP), tuple(GRIP + HILT_AXIS * 0.2), "hand.R")


# ---------------------------------------------------------------------------
# Body parts
# ---------------------------------------------------------------------------

def c_const(col):
    return lambda p, v=0, a=0: col


def build_legs_and_boots():
    for side, sx in (("L", 1), ("R", -1)):
        hip, knee, ankle = J(f"thigh.{side}"), J(f"shin.{side}"), J(f"shin.{side}", 1)
        pts = [
            (hip + Vector((0, 0, 0.03)), 0.082, 0.084),
            (along(hip, knee, 0.35), 0.08, 0.082),
            (along(hip, knee, 0.75), 0.07, 0.072),
            (knee, 0.064, 0.066),
            (along(knee, ankle, 0.2), 0.062, 0.062),
        ]
        loft(f"Pants.{side}", [{"c": c, "rx": rx, "ry": ry} for c, rx, ry in pts], 14, "Cloth",
             lambda p, v, a: weathered(PAL["pants"], PAL["pants"] * 0.7, PAL["tunic_light"], p, 22),
             weight=("bones", ["hips", f"thigh.{side}", f"shin.{side}"]))

        # Boot shaft: knee cuff down to ankle.
        shaft_z = [(0.545, 0.075, 0.078), (0.52, 0.072, 0.074), (0.47, 0.066, 0.068),
                   (0.36, 0.06, 0.061), (0.24, 0.054, 0.055), (0.15, 0.05, 0.052),
                   (0.095, 0.05, 0.056), (0.055, 0.052, 0.062)]
        sections = []
        for z, rx, ry in shaft_z:
            t = (knee.z - z) / (knee.z - ankle.z) if z < knee.z else 0.0
            c = knee.lerp(ankle, max(0.0, min(1.0, t)))
            c.z = z
            sections.append({"c": c, "rx": rx, "ry": ry})

        def boot_color(p, v, a):
            base = weathered(PAL["boot"], PAL["boot"] * 0.6, PAL["boot_light"], p, 26, 0.6)
            if v < 0.08:
                base = base.lerp(PAL["boot_light"], 0.35)
            return base

        loft(f"BootShaft.{side}", sections, 16, "Leather", boot_color, cap_end=False,
             weight=("bones", [f"shin.{side}", f"foot.{side}"]))

        # Foot: heel to toe along -Y.
        fx = ankle.x
        foot_secs = [
            (0.075, 0.046, 0.030, 0.034),
            (0.055, 0.052, 0.052, 0.050),
            (0.0, 0.055, 0.052, 0.049),
            (-0.06, 0.056, 0.050, 0.043),
            (-0.115, 0.056, 0.049, 0.035),
            (-0.17, 0.05, 0.045, 0.027),
            (-0.215, 0.036, 0.036, 0.021),
        ]
        sections = []
        for y, z, rx, rz in foot_secs:
            sections.append({"c": (fx + sx * 0.004, y + ankle.y - 0.02, z), "rx": rx, "ry": rz,
                             "t": (0, -1, 0),
                             "fn": (lambda a, rx_, ry_: (rx_, ry_ * (0.8 if 180 < a < 360 else 1.0)))})
        sections[-1]["rx"] *= 0.9
        loft(f"BootFoot.{side}", sections, 16, "Leather",
             lambda p, v, a: weathered(PAL["boot"], PAL["boot"] * 0.55, PAL["boot_light"], p, 30, 0.5)
             if p.z > 0.012 else PAL["leather_dark"] * 0.6,
             cap_start=True, cap_end=True, weight=("rigid", f"foot.{side}"))

        # Straps with buckles around the shaft.
        for z in (0.40, 0.25, 0.12):
            t = (knee.z - z) / (knee.z - ankle.z)
            c = knee.lerp(ankle, t)
            c.z = z
            base_r = 0.06 if z > 0.3 else 0.055
            strap = [{"c": c + Vector((0, 0, dz)), "rx": base_r + 0.007 + k, "ry": base_r + 0.009 + k}
                     for dz, k in ((0.013, -0.002), (0.008, 0.0), (-0.008, 0.0), (-0.013, -0.002))]
            loft(f"BootStrap.{side}.{int(z * 100)}", strap, 16, "Leather",
                 lambda p, v, a: PAL["leather_dark"].lerp(PAL["leather_light"], 0.15 + 0.1 * n3(p, 40)),
                 weight=("bones", [f"shin.{side}", f"foot.{side}"]))
            bpos = c + Vector((sx * (base_r + 0.004) * 0.6, -(base_r + 0.01) * 0.8, 0))
            outward = (bpos - c).normalized()
            rounded_box(f"BootBuckle.{side}.{int(z * 100)}", bpos, (0.022, 0.006, 0.02),
                        (outward.cross(UP), outward, UP), "Metal",
                        lambda p, v=0, a=0: PAL["buckle"], weight=("bones", [f"shin.{side}"]))


# Torso ring table shared by robe/tunic/scarf. (z, rx, ry, cy, n)
TORSO = [
    (1.515, 0.085, 0.075, 0.010, 2.0),
    (1.49, 0.128, 0.09, 0.012, 2.4),
    (1.455, 0.178, 0.102, 0.012, 3.0),
    (1.40, 0.192, 0.114, 0.008, 3.0),
    (1.32, 0.18, 0.12, 0.0, 2.5),
    (1.22, 0.16, 0.113, 0.005, 2.2),
    (1.12, 0.15, 0.107, 0.008, 2.0),
    (1.03, 0.148, 0.108, 0.01, 2.0),
]


def torso_sections(inset, arc_fn=None, z_min=None):
    secs = []
    for z, rx, ry, cy, n in TORSO:
        if z_min is not None and z < z_min:
            continue
        s = {"c": (0, cy, z), "rx": rx - inset, "ry": ry - inset, "n": n}
        if arc_fn:
            s["arc"] = arc_fn(z)
        secs.append(s)
    return secs


def build_torso():
    # Inner dark tunic (visible in the V of the robe).
    secs = [{"c": (0, 0.012, 1.56), "rx": 0.06, "ry": 0.058}]
    secs += torso_sections(0.012)
    secs += [{"c": (0, 0.01, 0.97), "rx": 0.14, "ry": 0.1}]

    def tunic_color(p, v, a):
        base = weathered(PAL["tunic"], PAL["tunic"] * 0.7, PAL["tunic_light"], p, 20, 0.6)
        # Wrap-over fold line running diagonally across the chest.
        if p.y < -0.05 and abs(p.x - (p.z - 1.28) * 0.55) < 0.008 and p.z > 1.15:
            base = base * 0.55
        return base

    loft("Tunic", secs, 24, "Cloth", tunic_color,
         weight=("bones", ["hips", "spine", "chest", "neck", "shoulder.L", "shoulder.R"]))

    # Outer brown robe: open V in front, continuous from the collar to the hem.
    robe = [
        (1.515, 0.087, 0.078, 0.010, 2.0, 72),
        (1.49, 0.131, 0.093, 0.012, 2.4, 50),
        (1.455, 0.182, 0.106, 0.012, 3.0, 38),
        (1.40, 0.196, 0.118, 0.008, 3.0, 31),
        (1.32, 0.184, 0.124, 0.0, 2.5, 25),
        (1.22, 0.164, 0.117, 0.005, 2.2, 17),
        (1.12, 0.154, 0.111, 0.008, 2.0, 12),
        (1.03, 0.152, 0.112, 0.01, 2.0, 10),
        (0.95, 0.178, 0.13, 0.012, 2.0, 12),
        (0.85, 0.195, 0.145, 0.012, 2.0, 14),
        (0.72, 0.21, 0.16, 0.012, 2.0, 16),
        (0.58, 0.222, 0.172, 0.012, 2.0, 18),
        (0.45, 0.232, 0.183, 0.012, 2.0, 19),
        (0.34, 0.24, 0.192, 0.012, 2.0, 20),
    ]
    secs = []
    for z, rx, ry, cy, n, gap in robe:
        secs.append({"c": (0, cy, z), "rx": rx, "ry": ry, "n": n, "arc": (90 + gap, 450 - gap)})

    def robe_color(p, v, a):
        base = weathered(PAL["robe"], PAL["robe_dark"], PAL["robe_light"], p, 16, 0.6)
        # Darken toward the hem and at the front edges.
        if p.z < 0.6:
            base = base.lerp(PAL["robe_dark"], min(0.6, (0.6 - p.z) * 1.6))
        edge = min(abs((a - 90 + 180) % 360 - 180), 999)
        if edge < 30 and p.z > 1.1:
            base = base.lerp(PAL["robe_light"], 0.18)
        return base

    def robe_keep(angle, mid):
        # Side and back slits below the knee.
        if mid.z < 0.7:
            for slit in (0, 180, 270):
                if abs((angle - slit + 180) % 360 - 180) < 3.5:
                    return False
        return True

    loft("Robe", secs, 44, "Cloth", robe_color, face_keep=robe_keep, hem=(0.05, 0.01),
         weight=("robe",))

    # Dark tabard hanging at the front opening.
    tab = []
    for z, rx, ry in ((1.035, 0.149, 0.111), (0.9, 0.17, 0.128), (0.72, 0.195, 0.148),
                      (0.55, 0.207, 0.16), (0.36, 0.218, 0.17)):
        tab.append({"c": (0, 0.012, z), "rx": rx * 0.985, "ry": ry * 0.985, "arc": (66, 114)})
    loft("TabardFront", tab, 10, "Cloth",
         lambda p, v, a: weathered(PAL["tunic"], PAL["tunic"] * 0.6, PAL["tunic_light"], p, 18, 0.7),
         hem=(0.04, 0.0), weight=("robe",))
    back = []
    for z, rx, ry in ((1.035, 0.145, 0.108), (0.85, 0.185, 0.14), (0.6, 0.205, 0.16), (0.4, 0.215, 0.168)):
        back.append({"c": (0, 0.012, z), "rx": rx * 0.97, "ry": ry * 0.97, "arc": (240, 300)})
    loft("TabardBack", back, 10, "Cloth",
         lambda p, v, a: weathered(PAL["tunic"], PAL["tunic"] * 0.6, PAL["tunic_light"], p, 18, 0.7),
         hem=(0.03, 0.0), weight=("robe",))
    # Brown sash tail hanging off the belt on the left front.
    sash = []
    for z, rx, ry in ((1.02, 0.157, 0.117), (0.85, 0.2, 0.15), (0.62, 0.215, 0.168), (0.47, 0.225, 0.177)):
        sash.append({"c": (0, 0.012, z), "rx": rx, "ry": ry, "arc": (62, 80)})
    loft("SashTail", sash, 4, "Cloth",
         lambda p, v, a: weathered(PAL["robe"], PAL["robe_dark"], PAL["robe_light"], p, 20, 0.6),
         hem=(0.03, 0.0), weight=("robe",))

    # Scarf / cowl bunched around the neck.
    scarf = [(1.565, 0.064, 0.062, 0.01), (1.545, 0.083, 0.082, 0.012), (1.52, 0.108, 0.1, 0.014),
             (1.495, 0.135, 0.114, 0.016), (1.47, 0.155, 0.12, 0.016), (1.448, 0.162, 0.113, 0.014)]

    def scarf_fn(a, rx, ry):
        wobble = 1 + 0.06 * sin(radians(a) * 5) + 0.03 * sin(radians(a) * 11)
        return rx * wobble, ry * wobble

    loft("Scarf", [{"c": (0, cy, z), "rx": rx, "ry": ry, "fn": scarf_fn} for z, rx, ry, cy in scarf],
         28, "Cloth",
         lambda p, v, a: weathered(PAL["scarf"], PAL["scarf"] * 0.6, PAL["scarf_light"], p, 30, 0.8),
         weight=("bones", ["chest", "neck"]))

    # Hood lying down across the upper back.
    hood = [(1.53, 0.12, 0.1), (1.5, 0.165, 0.15), (1.455, 0.19, 0.175), (1.4, 0.19, 0.165),
            (1.35, 0.17, 0.14), (1.31, 0.15, 0.118)]
    loft("Hood", [{"c": (0, 0.02, z), "rx": rx, "ry": ry, "arc": (200, 340)} for z, rx, ry in hood], 16,
         "Cloth", lambda p, v, a: weathered(PAL["robe"], PAL["robe_dark"], PAL["robe_light"], p, 22, 0.7).lerp(PAL["robe_dark"], 0.25 + 0.3 * v),
         weight=("bones", ["chest", "neck"]))

    # Belts.
    def belt_color(p, v, a):
        base = weathered(PAL["leather"], PAL["leather_dark"], PAL["leather_light"], p, 30, 0.5)
        if v < 0.15 or v > 0.85:
            base = base.lerp(PAL["leather_light"], 0.3)
        return base

    for name, z0, z1, grow in (("BeltUpper", 1.075, 1.02, 0.0), ("BeltLower", 1.012, 0.972, 0.006)):
        secs = []
        for z, k in ((z0, 0.0), (z0 - 0.004, 0.006), (z1 + 0.004, 0.006), (z1, 0.0)):
            rx = 0.152 + grow + k + (1.03 - z) * 0.18
            ry = 0.113 + grow + k + (1.03 - z) * 0.14
            secs.append({"c": (0, 0.01, z), "rx": rx, "ry": ry})
        loft(name, secs, 32, "Leather", belt_color, weight=("rigid", "hips"))

    rounded_box("Buckle", (0, 0.01 - 0.13, 1.048), (0.058, 0.014, 0.046), ((1, 0, 0), (0, -1, 0), (0, 0, 1)),
                "Metal", lambda p, v=0, a=0: PAL["buckle"].lerp(PAL["steel_light"], 0.3), n=6,
                weight=("rigid", "hips"))
    rounded_box("BuckleLower", (0.05, 0.01 - 0.132, 0.992), (0.03, 0.01, 0.03), ((1, 0, 0), (0, -1, 0), (0, 0, 1)),
                "Metal", lambda p, v=0, a=0: PAL["buckle"], n=6, weight=("rigid", "hips"))

    # Pouches around the belt (angle measured from +X toward forward).
    for i, (ang, w, h) in enumerate(((122, 0.05, 0.058), (146, 0.046, 0.052), (38, 0.046, 0.05),
                                     (200, 0.044, 0.05), (325, 0.05, 0.052))):
        a = radians(ang)
        rx, ry = 0.168, 0.128
        pos = Vector((rx * cos(a), 0.01 - ry * sin(a), 1.035))
        normal = Vector((cos(a) / rx, -sin(a) / ry, 0)).normalized()
        tangent = UP.cross(normal).normalized()
        rounded_box(f"Pouch{i}", pos + normal * 0.012, (w, 0.03, h), (tangent, normal, UP), "Leather",
                    lambda p, v=0, a=0: weathered(PAL["leather"], PAL["leather_dark"], PAL["leather_light"], p, 40, 0.6),
                    weight=("rigid", "hips"))
        rounded_box(f"PouchFlap{i}", pos + normal * 0.03 + UP * 0.016, (w * 1.04, 0.008, h * 0.45),
                    (tangent, normal, UP), "Leather",
                    lambda p, v=0, a=0: PAL["leather_dark"].lerp(PAL["leather"], 0.4),
                    weight=("rigid", "hips"))
    # Utility canister on the right hip.
    a = radians(165)
    pos = Vector((0.172 * cos(a), 0.01 - 0.13 * sin(a), 1.0)) + Vector((-0.02, 0, 0))
    loft("Canister", [{"c": pos + Vector((0, 0, dz)), "rx": r, "ry": r}
                      for dz, r in ((0.035, 0.012), (0.03, 0.015), (-0.03, 0.015), (-0.035, 0.012))],
         10, "Metal", lambda p, v, a: PAL["steel_light"] if 0.3 < v < 0.7 else PAL["steel"],
         cap_start=True, cap_end=True, weight=("rigid", "hips"))

    # Shoulder strap with a clasp (right shoulder toward the left hip).
    strap_pts = [Vector((-0.12, -0.075, 1.44)), Vector((-0.06, -0.118, 1.34)),
                 Vector((0.02, -0.128, 1.22)), Vector((0.09, -0.118, 1.1))]
    # Flat against the chest: u runs across the strap, w points outward.
    across = Vector((0.84, 0.0, 0.54)).normalized()
    secs = [{"c": c, "rx": 0.018, "ry": 0.004, "frame": (across, FWD)} for c in strap_pts]
    loft("ChestStrap", secs, 8, "Leather",
         lambda p, v, a: weathered(PAL["leather"], PAL["leather_dark"], PAL["leather_light"], p, 40),
         weight=("bones", ["spine", "chest"]))
    rounded_box("StrapClasp", (-0.1, -0.1, 1.405), (0.024, 0.01, 0.03), ((0.84, 0, 0.54), (0, -1, 0), (-0.54, 0, 0.84)),
                "Metal", lambda p, v=0, a=0: PAL["buckle"], n=5, weight=("rigid", "chest"))


def arm_path(side):
    s, e, w = J(f"upper_arm.{side}"), J(f"forearm.{side}"), J(f"hand.{side}")
    return s, e, w


def build_arms():
    for side, sx in (("L", 1), ("R", -1)):
        s, e, w = arm_path(side)
        top = s + Vector((-sx * 0.035, 0, 0.015))
        # Inner dark sleeve.
        pts = [(top, 0.07), (along(s, e, 0.3), 0.066), (along(s, e, 0.75), 0.061), (e, 0.058)]
        if side == "L":
            pts += [(along(e, w, 0.45), 0.054), (along(e, w, 0.82), 0.05), (along(e, w, 0.93), 0.047)]
        else:
            pts += [(along(e, w, 0.2), 0.054)]
        allowed = [f"shoulder.{side}", f"upper_arm.{side}", f"forearm.{side}", "chest"]
        loft(f"Sleeve.{side}", [{"c": c, "rx": r, "ry": r} for c, r in pts], 14, "Cloth",
             lambda p, v, a: weathered(PAL["tunic"], PAL["tunic"] * 0.65, PAL["tunic_light"], p, 22, 0.7),
             cap_end=side == "L", weight=("bones", allowed))
        # Brown over-sleeve (short, wide, flared) from the robe.
        over = [(top + Vector((-sx * 0.02, 0, 0.018)), 0.078, 0.07),
                (along(s, e, 0.15), 0.088, 0.083),
                (along(s, e, 0.5), 0.097, 0.092),
                (along(s, e, 0.8), 0.112, 0.105),
                (along(s, e, 0.9), 0.118, 0.11)]

        def oversleeve_color(p, v, a):
            base = weathered(PAL["robe"], PAL["robe_dark"], PAL["robe_light"], p, 16, 0.6)
            return base.lerp(PAL["robe_dark"], 0.35) if v > 0.9 else base

        loft(f"OverSleeve.{side}", [{"c": c, "rx": rx, "ry": ry} for c, rx, ry in over], 16, "Cloth",
             oversleeve_color, hem=(0.03, 0.0), weight=("bones", [f"shoulder.{side}", f"upper_arm.{side}", "chest"]))

    # Left hand: bare skin, relaxed.
    s, e, w = arm_path("L")
    d = (J("hand.L", 1) - J("hand.L")).normalized()
    across = FWD.copy()
    normal = d.cross(across).normalized()  # palm faces toward the body (-X-ish)
    if normal.x > 0:
        normal = -normal
    rot = ellipsoid_rot(normal, across, d)
    palm = w + d * 0.05
    fingers = w + d * 0.11 + normal * 0.01
    thumb = w + d * 0.045 + across * 0.035 + normal * 0.012
    elems = [
        {"co": w + d * 0.01, "r": 0.03, "size": (0.8, 1.0, 1.0), "rot": rot},
        {"co": palm, "r": 0.045, "size": (0.42, 0.95, 1.0), "rot": rot},
        {"co": fingers, "r": 0.045, "size": (0.42, 0.9, 1.05), "rot": ellipsoid_rot(normal, across, (d + normal * 0.45).normalized())},
        {"co": thumb, "r": 0.03, "size": (0.55, 0.5, 1.2), "rot": ellipsoid_rot(normal, across, (d - across * 0.5).normalized())},
    ]
    metaball_object("HandL", elems, "Skin",
                    lambda p: PAL["skin"].lerp(PAL["skin_shadow"], 0.25 + 0.2 * n3(p, 60)),
                    resolution=0.004, target_faces=500, weight=("bones", ["forearm.L", "hand.L"]))

    # Right arm: mechanical forearm + armored fist around the saber grip.
    s, e, w = arm_path("R")
    fdir = (w - e).normalized()
    plates = []
    t_values = [0.0, 0.06, 0.12, 0.14, 0.34, 0.36, 0.56, 0.58, 0.8, 0.82, 1.0]
    radii = [0.05, 0.052, 0.05, 0.047, 0.049, 0.045, 0.047, 0.043, 0.044, 0.038, 0.036]
    for t, r in zip(t_values, radii):
        plates.append({"c": along(e, w, t) + fdir * 0.0, "rx": r, "ry": r * 1.05, "n": 2.3})

    def steel_color(p, v, a):
        base = PAL["steel"].lerp(PAL["steel_dark"], 0.3 + 0.3 * n3(p, 50))
        if 60 < a < 120:
            base = base.lerp(PAL["steel_light"], 0.35)
        return base

    loft("MechForearm", plates, 12, "Metal", steel_color, cap_end=True, smooth=False,
         weight=("bones", ["forearm.R", "hand.R"]))
    elbow = e
    loft("MechElbow", [{"c": elbow + Vector((0, 0, dz)), "rx": r, "ry": r}
                       for dz, r in ((0.035, 0.02), (0.022, 0.045), (0.0, 0.052), (-0.022, 0.045), (-0.035, 0.02))],
         12, "Metal", steel_color, cap_start=True, cap_end=True,
         weight=("bones", ["upper_arm.R", "forearm.R"]))

    d = HAND_R_DIR
    # Back of the hand plate.
    back_dir = d.cross(HILT_AXIS).normalized()
    if back_dir.x > 0:
        back_dir = -back_dir  # outward (character right is -X)
    rounded_box("MechHandBack", w + d * 0.045 + back_dir * 0.006, (0.062, 0.022, 0.07),
                (HILT_AXIS, back_dir, d), "Metal", steel_color, n=3.2, weight=("rigid", "hand.R"))
    # Fingers wrapped around the grip.
    for i, off in enumerate((-0.027, -0.009, 0.009, 0.027)):
        torus(f"MechFinger{i}", GRIP + HILT_AXIS * off, HILT_AXIS, 0.024, 0.0085, "Metal",
              lambda p: PAL["steel"].lerp(PAL["steel_light"], 0.25), segs=12, ring_segs=6, arc=300,
              weight=("rigid", "hand.R"))
    thumb_c = GRIP + HILT_AXIS * (-0.04) + back_dir * 0.012
    rounded_box("MechThumb", thumb_c, (0.016, 0.018, 0.04), (back_dir.cross(d), back_dir, d), "Metal",
                steel_color, n=3, weight=("rigid", "hand.R"))


def gauss(p, c, sigma):
    d = Vector(((p.x - c[0]) / sigma[0], (p.y - c[1]) / sigma[1], (p.z - c[2]) / sigma[2]))
    return math.exp(-d.length_squared)


def build_head():
    hz = 1.715
    C = Vector((0, 0.002, hz + 0.002))
    R = Vector((0.079, 0.097, 0.119))
    lat_n, lon_n = 26, 36
    verts = []
    for i in range(lat_n + 1):
        lat = -pi / 2 + pi * i / lat_n
        for j in range(lon_n):
            lon = 2 * pi * j / lon_n
            p = C + Vector((R.x * cos(lat) * sin(lon), -R.y * cos(lat) * cos(lon), R.z * sin(lat)))
            below = smoothstep(C.z, C.z - 0.1, p.z)
            front = smoothstep(0.0, -0.07, p.y)
            # V-shaped jaw toward the chin, fuller cranium above.
            p.x *= 1 - 0.24 * below * (0.35 + 0.65 * front)
            # Tuck the back of the lower head into the neck.
            if p.y > 0:
                p.y *= 1 - 0.45 * below
            # Flatten the face plane a touch and push the cheekbones.
            p.y += 0.006 * front * smoothstep(C.z + 0.06, C.z - 0.02, p.z)
            p.x += math.copysign(0.005, p.x) * gauss(p, (math.copysign(0.05, p.x), -0.06, hz - 0.01), (0.02, 0.03, 0.022))
            # Chin, nose, brow ridge, eye sockets.
            p.y -= 0.012 * gauss(p, (0, -0.08, hz - 0.1), (0.022, 0.05, 0.016))
            p.y -= 0.026 * gauss(p, (0, -0.1, hz - 0.03), (0.01, 0.05, 0.022))
            p.y -= 0.008 * gauss(p, (0, -0.1, hz + 0.004), (0.007, 0.05, 0.02))
            p.y -= 0.005 * gauss(p, (0, -0.09, hz + 0.028), (0.05, 0.05, 0.009))
            for sx in (1, -1):
                p.y += 0.009 * gauss(p, (sx * 0.032, -0.094, hz + 0.006), (0.016, 0.05, 0.011))
            # Lips.
            p.y -= 0.004 * gauss(p, (0, -0.094, hz - 0.064), (0.018, 0.05, 0.008))
            verts.append(p)
    faces = []
    for i in range(lat_n):
        for j in range(lon_n):
            j2 = (j + 1) % lon_n
            faces.append((i * lon_n + j, i * lon_n + j2, (i + 1) * lon_n + j2, (i + 1) * lon_n + j))

    def skin_color(p):
        base = PAL["skin"]
        if p.y < -0.05 and abs(p.x) > 0.025 and hz - 0.06 < p.z < hz:
            base = base.lerp(PAL["skin_warm"], 0.3)
        if p.z < hz - 0.085:
            base = base.lerp(PAL["skin_shadow"], min(0.45, (hz - 0.085 - p.z) * 8))
        # Scar through the right brow and under the eye (character right is -X).
        if -0.05 < p.x < -0.025 and p.y < -0.06 and hz - 0.03 < p.z < hz + 0.05:
            if abs((p.x + 0.037) - (p.z - hz - 0.01) * 0.12) < 0.0032:
                base = PAL["scar"]
        return base + Vector((1, 1, 1)) * 0.012 * n3(p, 80)

    colors = [skin_color(v) for v in verts]
    make_object("Head", verts, faces, "Skin", colors, weight=("bones", ["neck", "head"]))
    loft("Neck", [{"c": (0, 0.012, z), "rx": r, "ry": r * 1.02} for z, r in ((1.47, 0.056), (1.54, 0.05), (1.61, 0.05), (1.65, 0.045))],
         14, "Skin", lambda p, v, a: PAL["skin"].lerp(PAL["skin_shadow"], 0.35),
         weight=("bones", ["chest", "neck", "head"]))

    for side, sx in (("L", 1), ("R", -1)):
        eye_c = Vector((sx * 0.032, -0.083, hz + 0.006))
        metaball_object(f"Eye{side}", [{"co": eye_c, "r": 0.011, "size": (1.0, 0.62, 0.58)}],
                        "Skin", lambda p, c=eye_c: PAL["iris"] if (p - c).y < -0.0035 and abs((p - c).x) < 0.0062 and abs((p - c).z) < 0.0062 else PAL["eye_white"],
                        resolution=0.0015, target_faces=120, weight=("rigid", "head"))
        brow_c = Vector((sx * 0.034, -0.098, hz + 0.027))
        metaball_object(f"Brow{side}", [{"co": brow_c, "r": 0.021, "size": (1.0, 0.28, 0.24),
                                         "rot": Quaternion(Vector((0, 1, 0)), radians(-8 * sx))}],
                        "Hair", lambda p: PAL["brow"], resolution=0.0015, target_faces=80,
                        weight=("rigid", "head"))
        # Ears peeking through the hair.
        metaball_object(f"Ear{side}", [{"co": (sx * 0.079, 0.004, hz - 0.004), "r": 0.024, "size": (0.42, 0.7, 1.0)}],
                        "Skin", lambda p: PAL["skin_warm"], resolution=0.002, target_faces=80,
                        weight=("rigid", "head"))
    metaball_object("Lips", [{"co": (0, -0.097, hz - 0.064), "r": 0.015, "size": (1.0, 0.32, 0.26)}],
                    "Skin", lambda p: PAL["lip"], resolution=0.0015, target_faces=80, weight=("rigid", "head"))


def build_hair():
    hz = 1.715
    elems = [
        # Voluminous crown, sitting slightly high and back.
        {"co": (0, 0.016, hz + 0.047), "r": 0.112, "size": (0.097 / 0.112, 1.0, 0.1 / 0.112)},
        {"co": (0, 0.062, hz - 0.045), "r": 0.1, "size": (0.9, 0.62, 1.0)},
        {"co": (0.08, 0.03, hz - 0.04), "r": 0.088, "size": (0.43, 0.8, 1.0)},
        {"co": (-0.08, 0.03, hz - 0.04), "r": 0.088, "size": (0.43, 0.8, 1.0)},
        {"co": (0, 0.056, hz - 0.13), "r": 0.085, "size": (1.0, 0.62, 0.55)},
        {"co": (0.07, 0.028, hz - 0.12), "r": 0.055, "size": (0.72, 0.95, 0.95)},
        {"co": (-0.07, 0.028, hz - 0.12), "r": 0.055, "size": (0.72, 0.95, 0.95)},
        # Carve the face opening.
        {"co": (0, -0.122, hz - 0.045), "r": 0.1, "size": (0.72, 0.62, 0.9), "neg": True, "s": 2.4},
        {"co": (0, -0.075, hz - 0.17), "r": 0.1, "size": (0.55, 0.55, 0.55), "neg": True, "s": 2.4},
    ]

    def hair_color(p):
        t = n3(p, 45) * 0.6 + n3(p * Vector((3, 3, 0.4)), 30) * 0.4
        base = PAL["hair"].lerp(PAL["hair_dark"], max(0, -t) * 0.9)
        return base.lerp(PAL["hair_light"], max(0, t) * 0.8)

    metaball_object("HairMass", elems, "Hair", hair_color, resolution=0.004, target_faces=1300,
                    weight=("rigid", "head"))

    # Thick wavy clumps that hug the mass and fall to the jaw / neck.
    center = Vector((0, 0.016, hz + 0.047))
    radii = Vector((0.1, 0.114, 0.101))

    def surface(phi, theta, grow=1.0):
        d = Vector((sin(phi) * cos(theta), -cos(phi) * cos(theta), sin(theta)))
        return center + Vector((d.x * radii.x, d.y * radii.y, d.z * radii.z)) * grow

    clumps = []
    count = 22
    for i in range(count):
        phi = radians(-146 + 292 * (i + 0.3 + rng.random() * 0.4) / count)
        if abs(math.degrees(phi)) < 42:
            continue
        back = abs(math.degrees(phi)) > 120
        clumps.append((phi, radians(rng.uniform(22, 42)),
                       rng.uniform(1.525, 1.56) if back else rng.uniform(1.56, 1.6)))
    for i in range(6):
        phi = radians(rng.uniform(150, 180)) * (1 if i % 2 else -1)
        clumps.append((phi, radians(rng.uniform(20, 35)), rng.uniform(1.515, 1.54)))

    def clump_points(phi, theta0, end_z, phase):
        pts = []
        steps = 10
        for s in range(steps):
            t = s / (steps - 1)
            if t < 0.3:
                theta = theta0 * (1 - t / 0.3)
                p = surface(phi, theta, 1.035)
            else:
                tt = (t - 0.3) / 0.7
                top = surface(phi, 0, 1.035)
                z = top.z + (end_z - top.z) * tt
                out = Vector((sin(phi), -cos(phi) * 0.85, 0)).normalized()
                flare = 0.006 + 0.016 * tt + 0.022 * max(0.0, tt - 0.72) / 0.28
                wave = 0.011 * sin(tt * 3.0 * pi + phase)
                side = Vector((cos(phi), sin(phi), 0))
                p = Vector((top.x, top.y, z)) + out * flare + side * wave
            pts.append(p)
        return pts

    strands = [clump_points(phi, th, ez, rng.random() * 2 * pi) + [(0.046, 0.017)] for phi, th, ez in clumps]
    # Middle-parted fringe sweeping over each side of the forehead.
    for sx in (1, -1):
        for k in range(3):
            start = Vector((sx * (0.006 + 0.014 * k), -0.07 + 0.01 * k, hz + 0.1 - 0.004 * k))
            mid = Vector((sx * (0.052 + 0.01 * k), -0.103 + 0.006 * k, hz + 0.058 - 0.01 * k))
            end = Vector((sx * (0.086 + 0.004 * k), -0.07 + 0.012 * k, hz - 0.03 - 0.025 * k))
            pts = [(1 - t) ** 2 * start + 2 * (1 - t) * t * mid + t ** 2 * end for t in (i / 8 for i in range(9))]
            strands.append(pts + [(0.034, 0.012)])

    for idx, entry in enumerate(strands):
        pts, (width, thick) = entry[:-1], entry[-1]
        secs = []
        n = len(pts)
        for s, p in enumerate(pts):
            t = (pts[min(s + 1, n - 1)] - pts[max(s - 1, 0)]).normalized()
            radial = Vector((p.x, p.y - 0.016, (p.z - hz) * 0.4))
            radial = radial.normalized() if radial.length > 1e-4 else Vector((0, 1, 0))
            radial = (radial - t * radial.dot(t)).normalized()
            across = t.cross(radial).normalized()
            taper = 1 - (s / (n - 1)) ** 1.8 * 0.8
            secs.append({"c": p, "rx": width * 0.5 * taper, "ry": thick * 0.5 * taper, "frame": (across, radial)})
        loft(f"Strand{idx}", secs, 6, "Hair",
             lambda p, v, a, o=idx: PAL["hair_dark"].lerp(PAL["hair"], 0.35 + 0.65 * v).lerp(
                 PAL["hair_light"], max(0.0, n3(p, 40, o) * 0.7)),
             cap_end=True, weight=("rigid", "head"))


def build_saber():
    parts = []
    hilt_rings = [
        (0.108, 0.010, "hilt"), (0.105, 0.016, "hilt"), (0.095, 0.018, "hilt"), (0.075, 0.017, "hilt"),
        (0.066, 0.0158, "dark"), (0.05, 0.0158, "dark"), (0.045, 0.0165, "hilt"), (0.04, 0.0158, "dark"),
        (0.02, 0.0158, "dark"), (0.015, 0.0165, "hilt"), (0.01, 0.0158, "dark"), (-0.01, 0.0158, "dark"),
        (-0.015, 0.0165, "hilt"), (-0.02, 0.0158, "dark"), (-0.05, 0.0158, "dark"), (-0.058, 0.017, "hilt"),
        (-0.09, 0.0175, "hilt"), (-0.1, 0.0195, "dark"), (-0.118, 0.021, "hilt"), (-0.135, 0.0205, "hilt"),
        (-0.14, 0.013, "dark"),
    ]
    secs, cols = [], []
    for off, r, tone in hilt_rings:
        secs.append({"c": GRIP - HILT_AXIS * off, "rx": r, "ry": r, "t": HILT_AXIS})
    tones = {i: t for i, (_, _, t) in enumerate(hilt_rings)}
    count = len(hilt_rings)

    def hilt_color(p, v, a):
        i = round(v * (count - 1))
        base = PAL["hilt"] if tones[i] == "hilt" else PAL["hilt_dark"]
        return base

    hilt = loft("SaberHilt", secs, 14, "Hilt", hilt_color, cap_start=True, cap_end=True, smooth=True)
    # Activation switch detail.
    rounded_box("SaberSwitch", GRIP + HILT_AXIS * 0.075 + Vector((0, 0, 0.018)), (0.008, 0.012, 0.018),
                (Vector((1, 0, 0)), UP, HILT_AXIS), "Hilt", lambda p, v=0, a=0: PAL["hilt_dark"], n=4)
    blade_len = 1.02
    start = GRIP + HILT_AXIS * 0.14
    secs = []
    for t, r in ((0.0, 0.011), (0.02, 0.0125), (0.9, 0.0125), (0.97, 0.011), (1.0, 0.004)):
        secs.append({"c": start + HILT_AXIS * (blade_len * t), "rx": r, "ry": r, "t": HILT_AXIS})
    loft("SaberBlade", secs, 10, "SaberBlade", lambda p, v, a: PAL["blade"], cap_end=True)
    return ["SaberHilt", "SaberSwitch", "SaberBlade"]


# ---------------------------------------------------------------------------
# Rig + weights
# ---------------------------------------------------------------------------

DEFORM_BONES = None


def build_rig():
    arm_data = bpy.data.armatures.new("AnakinRig")
    rig = bpy.data.objects.new("AnakinRig", arm_data)
    COLLECTION.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for name, (head, tail, parent) in JOINTS.items():
        eb = arm_data.edit_bones.new(name)
        eb.head, eb.tail = Vector(head), Vector(tail)
        eb.roll = 0
    for name, (_, _, parent) in JOINTS.items():
        if parent:
            arm_data.edit_bones[name].parent = arm_data.edit_bones[parent]
    # Hand Z axis == blade direction, so animation can aim the blade with a Damped Track.
    arm_data.edit_bones["hand.R"].align_roll(HILT_AXIS)
    for side in ("L", "R"):
        # Elbows/knees bend on the bone X axis.
        arm_data.edit_bones[f"upper_arm.{side}"].align_roll(Vector((0, 1, 0)))
        arm_data.edit_bones[f"forearm.{side}"].align_roll(Vector((0, 1, 0)))
    bpy.ops.object.mode_set(mode="OBJECT")
    arm_data.bones["root"].use_deform = False
    arm_data.bones["saber"].use_deform = False
    return rig


def dist_to_segment(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (a + ab * t - p).length


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def compute_weights(ob, spec):
    kind = spec[0]
    result = []
    for v in ob.data.vertices:
        p = ob.matrix_world @ v.co
        if kind == "rigid":
            result.append({spec[1]: 1.0})
        elif kind == "bones":
            scores = []
            for b in spec[1]:
                d = dist_to_segment(p, J(b), J(b, 1))
                scores.append((1.0 / max(d, 0.012) ** 5, b))
            scores.sort(reverse=True)
            top = scores[:2]
            total = sum(s for s, _ in top)
            ws = {b: s / total for s, b in top if s / total > 0.04}
            total = sum(ws.values())
            result.append({b: w / total for b, w in ws.items()})
        elif kind == "robe":
            # Above the belt: follow the torso. Below: blend hips -> thighs.
            if p.z > 1.08:
                sub = compute_point_weights(p, ["hips", "spine", "chest", "neck", "shoulder.L", "shoulder.R"])
                result.append(sub)
                continue
            leg = smoothstep(1.02, 0.45, p.z) * 0.7
            side = smoothstep(-0.12, 0.12, p.x)
            ws = {"hips": 1 - leg}
            if leg > 0:
                ws["thigh.L"] = leg * side
                ws["thigh.R"] = leg * (1 - side)
            result.append({b: w for b, w in ws.items() if w > 0.01})
    vgroups = {}
    for i, ws in enumerate(result):
        total = sum(ws.values())
        for b, w in ws.items():
            if b not in vgroups:
                vgroups[b] = ob.vertex_groups.new(name=b)
            vgroups[b].add([i], w / total, "REPLACE")


def compute_point_weights(p, bones):
    scores = sorted(((1.0 / max(dist_to_segment(p, J(b), J(b, 1)), 0.012) ** 5, b) for b in bones), reverse=True)[:2]
    total = sum(s for s, _ in scores)
    return {b: s / total for s, b in scores if s / total > 0.04}


def skin_and_join(rig, saber_parts):
    skinned = []
    for ob in list(COLLECTION.objects):
        if ob.type != "MESH" or ob.name in saber_parts:
            continue
        spec = WEIGHTS.get(ob.name)
        if spec is None:
            raise RuntimeError(f"No weight spec for {ob.name}")
        compute_weights(ob, spec)
        skinned.append(ob)
        if os.environ.get("ANAKIN_STATS"):
            print(f"[stats] {ob.name}: {sum(len(p.vertices) - 2 for p in ob.data.polygons)}")
    bpy.ops.object.select_all(action="DESELECT")
    for ob in skinned:
        ob.select_set(True)
    body = next(o for o in skinned if o.name == "Robe")
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    body.name = "AnakinBody"
    body.data.name = "AnakinBody"
    # Merge material slots with identical materials.
    body.parent = rig
    mod = body.modifiers.new("Armature", "ARMATURE")
    mod.object = rig
    # Saber parts ride the saber bone.
    bpy.context.view_layer.update()
    for name in saber_parts:
        ob = bpy.data.objects[name]
        world = ob.matrix_world.copy()
        ob.parent = rig
        ob.parent_type = "BONE"
        ob.parent_bone = "saber"
        bpy.context.view_layer.update()
        ob.matrix_world = world
    return body


def dedupe_material_slots(ob):
    mats = []
    remap = {}
    for i, slot in enumerate(ob.material_slots):
        if slot.material not in mats:
            mats.append(slot.material)
        remap[i] = mats.index(slot.material)
    indices = [remap[poly.material_index] for poly in ob.data.polygons]
    ob.data.materials.clear()
    for m in mats:
        ob.data.materials.append(m)
    for poly, index in zip(ob.data.polygons, indices):
        poly.material_index = index


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def build_character():
    global COLLECTION
    scene = reset_scene()
    COLLECTION = bpy.data.collections.new("Anakin")
    scene.collection.children.link(COLLECTION)
    build_materials()
    build_legs_and_boots()
    build_torso()
    build_arms()
    build_head()
    build_hair()
    saber_parts = build_saber()
    rig = build_rig()
    body = skin_and_join(rig, saber_parts)
    dedupe_material_slots(body)
    tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
    for name in saber_parts:
        tris += sum(len(p.vertices) - 2 for p in bpy.data.objects[name].data.polygons)
    print(f"[anakin] triangles: {tris}, vertices: {len(body.data.vertices)}")
    return scene, rig, body


def export(scene, rig):
    os.makedirs(os.path.dirname(GLB_OUT), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT,
        export_format="GLB",
        export_yup=True,
        export_apply=False,
        export_skins=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_optimize_animation_size=True,
        export_frame_step=1,
        export_vertex_color="ACTIVE",
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )
    print(f"[anakin] exported {GLB_OUT}")


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    scene, rig, body = build_character()
    if "--no-anim" not in argv:
        import anakin_anims
        anakin_anims.build_actions(rig, JOINTS)
    os.makedirs(os.path.dirname(BLEND_OUT), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT, compress=True)
    print(f"[anakin] saved {BLEND_OUT}")
    if "--no-export" not in argv:
        export(scene, rig)
