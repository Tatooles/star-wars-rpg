"""Authoring for Anakin's gameplay animations.

Poses are written in armature space (X = character left, -Y = forward, Z = up):
  * FK rotations are Euler degrees applied about the bone's head, expressed in
    armature axes as if the parent were at rest. Useful conventions:
      thigh/upper arm forward swing = negative X, knee bend = positive X,
      spine lean forward = positive X, twist toward the character's left = +Z,
      left arm out to the side = negative Y, right arm out = positive Y.
  * The saber arm is posed with IK: "wrist" (armature-space position of the
    right wrist), "blade" (direction the blade points) and "pole" (where the
    elbow should point). Everything is then baked to plain FK keyframes.

Keys are (time 0..1, pose). Poses are interpolated with Catmull-Rom splines.
Clips are sampled every frame at 30 fps.
"""

import math

import bpy
from mathutils import Euler, Matrix, Quaternion, Vector

FPS = 30
LOWER_BONES = {"root", "hips", "thigh.L", "thigh.R", "shin.L", "shin.R", "foot.L", "foot.R"}


# ---------------------------------------------------------------------------
# Pose helpers
# ---------------------------------------------------------------------------

def mirror_legs(pose):
    """Swap left/right leg and arm FK values (used to build symmetric gait halves)."""
    out = {}
    for k, v in pose.items():
        if k.endswith(".L"):
            out[k[:-2] + ".R"] = mirror_rot(v)
        elif k.endswith(".R"):
            out[k[:-2] + ".L"] = mirror_rot(v)
        elif k in ("hips", "spine", "chest", "neck", "head"):
            out[k] = mirror_rot(v)
        else:
            out[k] = v
    return out


def mirror_rot(v):
    x, y, z = v
    return (x, -y, -z)


def catmull(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)


def as_vec(v):
    return Vector(v) if not isinstance(v, (int, float)) else Vector((v, 0, 0))


def sample(keys, t, loop):
    """Interpolate a sparse pose track at normalized time t."""
    times = [k[0] for k in keys]
    n = len(keys)
    if loop:
        t = t % 1.0
    if t <= times[0]:
        return dict(keys[0][1])
    if t >= times[-1] and not loop:
        return dict(keys[-1][1])
    # locate segment
    i = max(j for j in range(n) if times[j] <= t)
    j = i + 1
    if j >= n:
        # loop wrap: from last key to first key at 1.0
        t0, t1 = times[i], 1.0 + times[0]
        idx = [i - 1, i, 0, 1 % n]
    else:
        t0, t1 = times[i], times[j]
        if loop:
            idx = [(i - 1) % n, i, j, (j + 1) % n]
        else:
            idx = [max(i - 1, 0), i, j, min(j + 1, n - 1)]
    u = (t - t0) / (t1 - t0) if t1 > t0 else 0.0
    poses = [keys[k][1] for k in idx]
    names = set()
    for p in poses:
        names.update(p.keys())
    out = {}
    for name in names:
        vals = [as_vec(p[name] if name in p else default_for(name)) for p in poses]
        out[name] = tuple(catmull(vals[0], vals[1], vals[2], vals[3], u))
    return out


def default_for(name):
    if name in ("wrist", "blade", "pole"):
        raise KeyError(f"IK channel {name} must be keyed on every pose")
    return (0.0, 0.0, 0.0)


# ---------------------------------------------------------------------------
# Rig setup for baking
# ---------------------------------------------------------------------------

def add_empty(name):
    ob = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(ob)
    return ob


class Baker:
    def __init__(self, rig):
        self.rig = rig
        self.hand_target = add_empty("IK_Hand_R")
        self.aim_target = add_empty("IK_Aim_R")
        self.pole_target = add_empty("IK_Pole_R")
        for ob in (self.hand_target, self.aim_target, self.pole_target):
            ob.parent = rig
        pb = rig.pose.bones["forearm.R"]
        ik = pb.constraints.new("IK")
        ik.target = self.hand_target
        ik.pole_target = self.pole_target
        ik.chain_count = 2
        ik.use_stretch = False
        self.ik = ik
        track = rig.pose.bones["hand.R"].constraints.new("DAMPED_TRACK")
        track.target = self.aim_target
        track.track_axis = "TRACK_Z"
        self.track = track
        for pb in rig.pose.bones:
            pb.rotation_mode = "QUATERNION"
        self.calibrate_pole()

    def rest(self, name, which="head"):
        bone = self.rig.data.bones[name]
        return (bone.head_local if which == "head" else bone.tail_local).copy()

    def apply_fk(self, pose):
        for pb in self.rig.pose.bones:
            rot = pose.get(pb.name, (0.0, 0.0, 0.0))
            b = pb.bone.matrix_local.to_3x3()
            r = Euler([math.radians(a) for a in rot], "XYZ").to_matrix()
            pb.rotation_quaternion = (b.inverted() @ r @ b).to_quaternion()
            loc = pose.get(pb.name + "@loc")
            pb.location = (b.inverted() @ Vector(loc)) if loc else Vector()

    def apply_ik(self, pose):
        wrist = Vector(pose["wrist"])
        blade = Vector(pose["blade"]).normalized()
        self.hand_target.location = wrist
        self.aim_target.location = wrist + blade * 1.5
        self.pole_target.location = Vector(pose["pole"])

    def evaluate(self):
        bpy.context.view_layer.update()
        out = {}
        for pb in self.rig.pose.bones:
            local = self.rig.convert_space(pose_bone=pb, matrix=pb.matrix, from_space="POSE", to_space="LOCAL")
            loc, rot, _ = local.decompose()
            out[pb.name] = (loc, rot)
        return out

    def calibrate_pole(self):
        shoulder = self.rest("upper_arm.R")
        wrist = shoulder + Vector((-0.12, -0.3, -0.25))
        pole = shoulder + Vector((-0.35, 0.2, -0.25))
        best = None
        for deg in range(-180, 180, 5):
            self.ik.pole_angle = math.radians(deg)
            self.apply_fk({})
            self.apply_ik({"wrist": wrist, "blade": (0, -1, 0), "pole": pole})
            bpy.context.view_layer.update()
            elbow = self.rig.pose.bones["forearm.R"].head
            axis = (wrist - shoulder).normalized()
            e = elbow - shoulder
            e_perp = (e - axis * e.dot(axis)).normalized()
            pl = pole - shoulder
            p_perp = (pl - axis * pl.dot(axis)).normalized()
            err = e_perp.angle(p_perp)
            if best is None or err < best[0]:
                best = (err, deg)
        self.ik.pole_angle = math.radians(best[1])
        print(f"[anims] pole angle {best[1]} deg (err {math.degrees(best[0]):.1f})")

    def cleanup(self):
        self.rig.pose.bones["forearm.R"].constraints.remove(self.ik)
        self.rig.pose.bones["hand.R"].constraints.remove(self.track)
        for ob in (self.hand_target, self.aim_target, self.pole_target):
            bpy.data.objects.remove(ob)


def bake_action(baker, name, keys, frames, loop):
    rig = baker.rig
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data.action = action
    prev = {}
    for f in range(frames + (1 if loop else 1)):
        t = f / frames
        pose = sample(keys, t if not (loop and f == frames) else 0.0, loop)
        baker.apply_fk(pose)
        baker.apply_ik(pose)
        result = baker.evaluate()
        for pb in rig.pose.bones:
            loc, rot = result[pb.name]
            if pb.name in prev and prev[pb.name].dot(rot) < 0:
                rot = -rot
            prev[pb.name] = rot
            pb.rotation_quaternion = rot
            pb.location = loc
        frame = f + 1
        for pb in rig.pose.bones:
            pb.keyframe_insert("rotation_quaternion", frame=frame, group=pb.name)
            pb.keyframe_insert("location", frame=frame, group=pb.name)
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, action)
    track.mute = True
    rig.animation_data.action = None
    print(f"[anims] {name}: {frames + 1} frames")
    return action


# ---------------------------------------------------------------------------
# Clip definitions
# ---------------------------------------------------------------------------

IDLE_LEGS = {
    "hips@loc": (0, 0, -0.012),
    "thigh.L": (-7, -5, 4), "shin.L": (11, 0, 0), "foot.L": (-4, 0, -4),
    "thigh.R": (-1, 5, -10), "shin.R": (7, 0, 0), "foot.R": (-6, 0, 8),
}

IDLE_UPPER = {
    "spine": (3, 0, -5), "chest": (-2, 0, -7), "neck": (0, 0, 5), "head": (2, 0, 5),
    "shoulder.L": (0, 0, 0), "upper_arm.L": (-8, 16, 0), "forearm.L": (-20, 0, 0), "hand.L": (0, 0, 8),
    "shoulder.R": (0, 0, 0),
    "wrist": (-0.33, -0.17, 1.0), "blade": (-0.38, -0.66, -0.64), "pole": (-0.62, 0.25, 1.2),
}


def idle_keys():
    base = {**IDLE_LEGS, **IDLE_UPPER}
    inhale = dict(base)
    inhale.update({"chest": (-3.5, 0, -7), "head": (1, 0, 5), "hips@loc": (0, 0, -0.008),
                   "wrist": (-0.33, -0.175, 1.006), "upper_arm.L": (-9, 15, 0)})
    return [(0.0, base), (0.5, inhale)]


def run_keys():
    upper_common = {"spine": (12, 0, 0), "neck": (-4, 0, 0), "head": (-8, 0, 0)}
    contact = {
        **upper_common,
        "hips@loc": (0, 0, -0.01), "hips": (0, 0, 9),
        "chest": (2, 0, -12),
        "thigh.R": (-38, 0, 0), "shin.R": (14, 0, 0), "foot.R": (-12, 0, 0),
        "thigh.L": (26, 0, 0), "shin.L": (48, 0, 0), "foot.L": (18, 0, 0),
        "upper_arm.L": (-38, 12, 0), "forearm.L": (-78, 0, 0), "hand.L": (0, 0, 0),
        "wrist": (-0.32, 0.12, 1.0), "blade": (-0.42, 0.66, -0.62), "pole": (-0.6, 0.3, 1.3),
    }
    down = {
        **upper_common,
        "hips@loc": (0, 0, -0.035), "hips": (0, 0, 4),
        "chest": (4, 0, -6),
        "thigh.R": (-12, 0, 0), "shin.R": (28, 0, 0), "foot.R": (-8, 0, 0),
        "thigh.L": (10, 0, 0), "shin.L": (80, 0, 0), "foot.L": (14, 0, 0),
        "upper_arm.L": (-12, 12, 0), "forearm.L": (-66, 0, 0),
        "wrist": (-0.32, 0.1, 0.99), "blade": (-0.42, 0.66, -0.62), "pole": (-0.6, 0.3, 1.3),
    }
    passing = {
        **upper_common,
        "hips@loc": (0, 0, 0.012), "hips": (0, 0, 0),
        "chest": (2, 0, 0),
        "thigh.R": (14, 0, 0), "shin.R": (20, 0, 0), "foot.R": (10, 0, 0),
        "thigh.L": (-34, 0, 0), "shin.L": (72, 0, 0), "foot.L": (0, 0, 0),
        "upper_arm.L": (14, 12, 0), "forearm.L": (-50, 0, 0),
        "wrist": (-0.32, 0.08, 1.02), "blade": (-0.42, 0.66, -0.62), "pole": (-0.6, 0.3, 1.3),
    }

    def other_side(p):
        q = mirror_legs(p)
        # Keep the saber arm where it is: only the gait mirrors.
        for k in ("wrist", "blade", "pole"):
            q[k] = p[k]
        q["upper_arm.L"] = {contact["upper_arm.L"]: (22, 12, 0), down["upper_arm.L"]: (18, 12, 0),
                            passing["upper_arm.L"]: (-14, 12, 0)}[p["upper_arm.L"]]
        q["forearm.L"] = {contact["forearm.L"]: (-40, 0, 0), down["forearm.L"]: (-44, 0, 0),
                          passing["forearm.L"]: (-58, 0, 0)}[p["forearm.L"]]
        q["wrist"] = (p["wrist"][0], p["wrist"][1] + 0.05, p["wrist"][2] + 0.02)
        q.pop("upper_arm.R", None)
        q.pop("forearm.R", None)
        return q

    return [(0.0, contact), (0.12, down), (0.3, passing),
            (0.5, other_side(contact)), (0.62, other_side(down)), (0.8, other_side(passing))]


def backpedal_keys():
    guard = {"wrist": (-0.2, -0.26, 1.1), "blade": (0.25, -0.62, 0.74), "pole": (-0.6, 0.2, 1.1),
             "upper_arm.L": (-24, -14, 0), "forearm.L": (-48, 0, 0),
             "spine": (2, 0, -6), "chest": (-1, 0, -6), "head": (0, 0, 10)}
    a = {**guard, "hips@loc": (0, 0, -0.02),
         "thigh.R": (-16, 0, 0), "shin.R": (10, 0, 0), "foot.R": (-4, 0, 0),
         "thigh.L": (18, 0, 0), "shin.L": (24, 0, 0), "foot.L": (4, 0, 0)}
    b = {**guard, "hips@loc": (0, 0, -0.005),
         "thigh.R": (6, 0, 0), "shin.R": (40, 0, 0), "foot.R": (10, 0, 0),
         "thigh.L": (-4, 0, 0), "shin.L": (8, 0, 0), "foot.L": (-2, 0, 0)}
    c = {**guard, "hips@loc": (0, 0, -0.02),
         "thigh.L": (-16, 0, 0), "shin.L": (10, 0, 0), "foot.L": (-4, 0, 0),
         "thigh.R": (18, 0, 0), "shin.R": (24, 0, 0), "foot.R": (4, 0, 0)}
    d = {**guard, "hips@loc": (0, 0, -0.005),
         "thigh.L": (6, 0, 0), "shin.L": (40, 0, 0), "foot.L": (10, 0, 0),
         "thigh.R": (-4, 0, 0), "shin.R": (8, 0, 0), "foot.R": (-2, 0, 0)}
    return [(0.0, a), (0.25, b), (0.5, c), (0.75, d)]


LUNGE_R = {"hips@loc": (0, -0.04, -0.05), "thigh.R": (-30, 4, -8), "shin.R": (30, 0, 0), "foot.R": (0, 0, 8),
           "thigh.L": (20, -6, 6), "shin.L": (22, 0, 0), "foot.L": (-4, 0, -6)}


def attack1_keys():
    """Horizontal slash, right to left."""
    start = {**IDLE_LEGS, **IDLE_UPPER}
    windup = {**IDLE_LEGS, "hips": (0, 0, -10), "spine": (0, 0, -16), "chest": (-4, 0, -22), "head": (0, 0, 26),
              "upper_arm.L": (-30, -24, 0), "forearm.L": (-50, 0, 0),
              "wrist": (-0.4, 0.04, 1.3), "blade": (-0.55, 0.8, 0.22), "pole": (-0.7, 0.35, 1.05)}
    mid = {**LUNGE_R, "hips": (0, 0, 4), "spine": (8, 0, 2), "chest": (2, 0, 6), "head": (-4, 0, -8),
           "upper_arm.L": (-10, -30, 0), "forearm.L": (-30, 0, 0),
           "wrist": (-0.1, -0.45, 1.2), "blade": (-0.05, -1.0, 0.04), "pole": (-0.6, 0.0, 1.2)}
    sweep = {**LUNGE_R, "hips": (0, 0, 8), "spine": (8, 0, 8), "chest": (2, 0, 10), "head": (-4, 0, -18),
             "upper_arm.L": (10, -34, 0), "forearm.L": (-24, 0, 0),
             "wrist": (0.1, -0.38, 1.18), "blade": (0.86, -0.5, 0.0), "pole": (-0.45, 0.1, 1.35)}
    follow = {**LUNGE_R, "hips": (0, 0, 10), "spine": (10, 0, 10), "chest": (4, 0, 12), "head": (-4, 0, -22),
              "upper_arm.L": (18, -36, 0), "forearm.L": (-20, 0, 0),
              "wrist": (0.18, -0.18, 1.14), "blade": (0.8, 0.5, -0.2), "pole": (-0.35, 0.2, 1.45)}
    return [(0.0, start), (0.12, windup), (0.3, mid), (0.44, sweep), (0.62, follow), (0.8, follow), (1.0, start)]


def attack2_keys():
    """Backhand rising diagonal, low left to high right."""
    start = {**IDLE_LEGS, **IDLE_UPPER}
    windup = {**LUNGE_R, "hips": (0, 0, 8), "spine": (10, 0, 10), "chest": (6, 0, 10), "head": (-6, 0, -18),
              "upper_arm.L": (10, -30, 0), "forearm.L": (-30, 0, 0),
              "wrist": (0.18, -0.16, 1.0), "blade": (0.66, 0.28, -0.7), "pole": (-0.35, 0.25, 1.4)}
    rise = {**LUNGE_R, "hips": (0, 0, 2), "spine": (4, 0, 2), "chest": (-2, 0, 0), "head": (0, 0, -4),
            "upper_arm.L": (-10, -30, 0), "forearm.L": (-30, 0, 0),
            "wrist": (0.0, -0.46, 1.25), "blade": (0.1, -0.78, 0.62), "pole": (-0.55, 0.0, 1.0)}
    high = {**LUNGE_R, "hips": (0, 0, -10), "spine": (0, 0, -12), "chest": (-6, 0, -16), "head": (0, 0, 18),
            "upper_arm.L": (-20, -34, 0), "forearm.L": (-40, 0, 0),
            "wrist": (-0.3, -0.3, 1.46), "blade": (-0.72, -0.3, 0.62), "pole": (-0.7, 0.2, 1.2)}
    follow = {**LUNGE_R, "hips": (0, 0, -10), "spine": (-2, 0, -10), "chest": (-8, 0, -12), "head": (0, 0, 18),
              "upper_arm.L": (-24, -36, 0), "forearm.L": (-44, 0, 0),
              "wrist": (-0.38, -0.08, 1.5), "blade": (-0.66, 0.42, 0.62), "pole": (-0.75, 0.3, 1.25)}
    return [(0.0, start), (0.1, windup), (0.32, rise), (0.48, high), (0.64, follow), (0.8, follow), (1.0, start)]


def attack3_keys():
    """Overhead jumping chop."""
    start = {**IDLE_LEGS, **IDLE_UPPER}
    raise_ = {**IDLE_LEGS, "hips@loc": (0, 0.02, 0.01), "spine": (-8, 0, 0), "chest": (-8, 0, 0), "head": (6, 0, 0),
              "upper_arm.L": (-80, -24, 0), "forearm.L": (-70, 0, 0),
              "wrist": (-0.1, 0.02, 1.8), "blade": (0.0, 0.6, 0.8), "pole": (-0.6, 0.1, 1.9)}
    over = {**LUNGE_R, "hips@loc": (0, -0.02, 0.0), "spine": (4, 0, 0), "chest": (2, 0, 0), "head": (0, 0, 0),
            "upper_arm.L": (-70, -22, 0), "forearm.L": (-50, 0, 0),
            "wrist": (-0.08, -0.36, 1.62), "blade": (0.0, -0.55, 0.84), "pole": (-0.6, 0.1, 1.7)}
    impact = {**LUNGE_R, "hips@loc": (0, -0.06, -0.09), "spine": (18, 0, 0), "chest": (10, 0, 0), "head": (-14, 0, 0),
              "upper_arm.L": (-50, -20, 0), "forearm.L": (-30, 0, 0),
              "wrist": (-0.06, -0.5, 1.0), "blade": (0.02, -0.72, -0.7), "pole": (-0.6, 0.0, 1.25)}
    return [(0.0, start), (0.14, raise_), (0.32, over), (0.48, impact), (0.78, impact), (1.0, start)]


def block_keys():
    guard = {"hips@loc": (0, 0, -0.05),
             "thigh.L": (-14, -10, 10), "shin.L": (24, 0, 0), "foot.L": (-8, 0, -10),
             "thigh.R": (10, 8, -14), "shin.R": (24, 0, 0), "foot.R": (-12, 0, 12),
             "spine": (6, 0, -8), "chest": (2, 0, -6), "head": (-4, 0, 12),
             "upper_arm.L": (-30, -40, 0), "forearm.L": (-50, 0, 0), "hand.L": (0, 0, 20),
             "wrist": (-0.16, -0.3, 1.22), "blade": (0.55, -0.36, 0.75), "pole": (-0.65, 0.1, 1.05)}
    shift = dict(guard)
    shift.update({"hips@loc": (0, 0, -0.058), "wrist": (-0.16, -0.31, 1.215), "chest": (3, 0, -6)})
    return [(0.0, guard), (0.5, shift)]


def dodge_keys():
    start = {**IDLE_LEGS, **IDLE_UPPER}
    low = {"hips@loc": (0, -0.05, -0.16),
           "thigh.R": (-60, 6, 0), "shin.R": (70, 0, 0), "foot.R": (-10, 0, 0),
           "thigh.L": (20, -6, 0), "shin.L": (80, 0, 0), "foot.L": (30, 0, 0),
           "spine": (28, 0, 0), "chest": (14, 0, 0), "head": (-26, 0, 0),
           "upper_arm.L": (40, -30, 0), "forearm.L": (-40, 0, 0),
           "wrist": (-0.36, 0.2, 0.9), "blade": (-0.4, 0.7, -0.6), "pole": (-0.6, 0.35, 1.2)}
    return [(0.0, start), (0.3, low), (0.7, low), (1.0, start)]


CLIPS = [
    # name, keys, frames, loop
    ("Idle", idle_keys, 60, True),
    ("Run", run_keys, 20, True),
    ("Backpedal", backpedal_keys, 24, True),
    ("Attack1", attack1_keys, 30, False),
    ("Attack2", attack2_keys, 30, False),
    ("Attack3", attack3_keys, 30, False),
    ("Block", block_keys, 40, True),
    ("Dodge", dodge_keys, 15, False),
]


def build_actions(rig, joints=None, only=None):
    rig.animation_data_create()
    baker = Baker(rig)
    for name, keys_fn, frames, loop in CLIPS:
        if only and name not in only:
            continue
        bake_action(baker, name, keys_fn(), frames, loop)
    baker.cleanup()
    for pb in rig.pose.bones:
        pb.rotation_quaternion = Quaternion()
        pb.location = Vector()
