# 12 zodiac bronze heads + seated robed stone body (headless Blender, voxel-remeshed organic forms)
import sys, math, bpy, bmesh
sys.path.insert(0, '/workspace/blender')
from hylib import *
from mathutils import Vector, Matrix

reset()
mat('bronze', (0.55, 0.30, 0.17), 0.35, 1.0)
mat('stone', (0.80, 0.78, 0.73), 0.7)
PARTS = []
def keep(ob): GROUPS[list(GROUPS)[0]].remove(ob) if ob in GROUPS[list(GROUPS)[0]] else None; PARTS.append(ob); return ob
def E(c, r, s=(1, 1, 1), rot=(0, 0, 0)):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=14, radius=r)
    M = Matrix.Translation(T(*c)) @ (Matrix.Rotation(rot[1], 4, 'Z') @ Matrix.Rotation(rot[0], 4, 'X') @ Matrix.Rotation(-rot[2], 4, 'Y')) @ Matrix.Diagonal((s[0], s[2], s[1], 1))
    return keep(bm_to_obj(bm, 'bronze', M, smooth=True, name='e'))
def _cr(pts, radii, n=10):
    from mathutils import Vector as V
    P = [V(p) for p in pts]; R = radii or [1.0] * len(P)
    if len(P) == 2: P = [P[0], P[0].lerp(P[1], 1/3), P[0].lerp(P[1], 2/3), P[1]]; R = [R[0], R[0] + (R[1]-R[0])/3, R[0] + 2*(R[1]-R[0])/3, R[1]]
    ext = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]; RE = [R[0]] + list(R) + [R[-1]]
    out, orr = [], []
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        for k in range(n):
            t = k / n
            q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
            out.append(tuple(q)); orr.append(RE[i] + (RE[i + 1] - RE[i]) * t)
    out.append(tuple(P[-1])); orr.append(R[-1]); return out, orr
def TU(pts, r, radii=None):
    p2, r2 = _cr(pts, radii)
    return keep(tube('bronze', p2, r, radii=r2, res=4))
def CY(c, r, h, r2=None, rot=(0, 0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=r, radius2=r if r2 is None else r2, depth=h)
    M = Matrix.Translation(T(*c)) @ Matrix.Rotation(rot[1], 4, 'Z') @ Matrix.Rotation(rot[0], 4, 'X') @ Matrix.Rotation(-rot[2], 4, 'Y')
    # cone axis is blender Z (= three Y)
    return keep(bm_to_obj(bm, 'bronze', M, name='c'))
def ear(c, s, tilt=0.3, size=(0.07, 0.16, 0.04), point=True):
    return E(c, 1, size, rot=(-0.2, 0, s * tilt))

def neck_and_collar():
    CY((0, 0.12, 0), 0.15, 0.26, r2=0.12); E((0, .26, -.02), .13, (1, .9, 1))
    pts = [(0.165 * math.cos(2 * math.pi * i / 40), 0.0 + 0.015 * math.sin(2 * math.pi * i * 6 / 40), 0.165 * math.sin(2 * math.pi * i / 40)) for i in range(40)]
    TU(pts + [pts[0]], 0.035)
def eyes(x, y, z, r=0.035, brow=True):
    for s in (-1, 1):
        E((s * x, y, z), r, (1, 0.8, 0.9))
        if brow: E((s * x, y + r * 0.9, z - 0.005), r * 1.4, (1.2, 0.35, 0.7), rot=(0, 0, s * 0.25))

CARVE = {}   # key -> list of (center, radius) to subtract after remesh
def H_rat():
    neck_and_collar(); E((0, .3, 0), .2, (1, .95, 1.15)); E((0, .26, .19), .12, (.9, .8, 1.3)); E((0, .25, .33), .055, (1, .8, 1))
    E((0, .19, .2), .08, (1, .6, 1.2))
    for s in (-1, 1):
        E((s * .17, .48, -.02), 1, (.13, .14, .035), rot=(0, 0, s * .35)); E((s * .12, .17, .27), .04)  # ears, cheeks
    eyes(.09, .34, .17, .03)
    for s in (-1, 1): TU([(s * .05, .25, .33), (s * .2, .26, .36), (s * .3, .25, .34)], .006)  # whiskers
    CARVE['rat'] = [((0, .19, .36), .035)] + [((s * .17, .48, .0), .1) for s in (-1, 1)]
    return (0, .19, .36)
def H_ox():
    neck_and_collar(); E((0, .32, 0), .25, (1.15, 1, 1.05)); E((0, .2, .22), .18, (1.15, .85, 1.0)); E((0, .43, .12), .16, (1.5, .45, .9))
    for s in (-1, 1):
        TU([(s * .18, .47, -.02), (s * .4, .52, .0), (s * .56, .66, .04), (s * .56, .88, .08)], .06, radii=[1, .85, .6, .3])
        E((s * .33, .38, -.04), 1, (.12, .06, .07), rot=(0, 0, s * .3))
        E((s * .07, .16, .38), .04)
    eyes(.17, .36, .16, .04)
    CARVE['ox'] = [((0, .11, .38), .05), ((-.07, .18, .4), .025), ((.07, .18, .4), .025)]
    return (0, .11, .38)
def H_tiger():
    neck_and_collar(); E((0, .32, 0), .27, (1.15, 1, 1)); E((0, .22, .23), .15, (1.35, .8, .9)); E((0, .3, .34), .06, (1.2, .8, 1))
    E((0, .46, .17), .1, (1.7, .45, .8))
    for s in (-1, 1):
        E((s * .2, .55, -.03), 1, (.09, .09, .045)); E((s * .24, .2, .1), .13); E((s * .07, .18, .32), .07)
        for k in range(3): TU([(s * (.12 + k * .05), .52 - k * .04, .08), (s * (.22 + k * .04), .45 - k * .05, .06)], .012)
    eyes(.11, .36, .2, .035)
    CARVE['tiger'] = [((0, .13, .36), .055)]
    return (0, .13, .37)
def H_rabbit():
    neck_and_collar(); E((0, .29, 0), .2, (1, 1, 1.1)); E((0, .22, .18), .11, (1.15, .9, 1)); E((0, .25, .27), .04)
    for s in (-1, 1):
        E((s * .09, .62, -.05), 1, (.065, .25, .035), rot=(-.15, 0, s * .15)); E((s * .06, .17, .25), .05)
    eyes(.11, .34, .13, .035, brow=False)
    CARVE['rabbit'] = [((0, .15, .29), .03)] + [((s * .09, .62, -.02), .05) for s in (-1, 1)]
    return (0, .15, .3)
def H_dragon():
    neck_and_collar(); E((0, .32, 0), .23, (1.1, .9, 1.2)); E((0, .29, .3), .13, (1.1, .65, 1.9)); E((0, .17, .3), .1, (1, .4, 1.6))
    E((0, .31, .54), .075, (1.6, 1, 1))
    for s in (-1, 1):
        TU([(s * .1, .46, -.05), (s * .16, .64, -.2), (s * .2, .84, -.42)], .04, radii=[1, .8, .45])
        TU([(s * .15, .64, -.2), (s * .3, .74, -.15)], .025, radii=[1, .4])
        TU([(s * .08, .27, .55), (s * .28, .22, .62), (s * .44, .1, .52), (s * .5, -.06, .38)], .016, radii=[1, .8, .6, .3])
        E((s * .13, .42, .16), .05, (1, .8, 1.3)); E((s * .14, .38, .3), 1, (.02, .06, .14))
    for k in range(5): E((0, .5 - k * .05, -.12 - k * .08), 1, (.025, .09, .06), rot=(.6, 0, 0))
    eyes(.13, .4, .15, .04)
    CARVE['dragon'] = [((0, .22, .58), .07)]
    return (0, .22, .6)
def H_snake():
    neck_and_collar(); CY((0, .14, 0), .12, .18, r2=.12)
    E((0, .27, .1), .19, (1.1, .62, 1.65)); E((0, .21, .22), .14, (1, .45, 1.5))
    for s in (-1, 1): E((s * .13, .33, .17), .045); E((s * .1, .34, .1), 1, (.06, .02, .12))
    CARVE['snake'] = [((0, .22, .42), .04), ((-.04, .29, .42), .015), ((.04, .29, .42), .015)]
    return (0, .22, .42)
def H_horse():
    neck_and_collar(); E((0, .47, -.04), .18, (1, 1.1, 1.05))
    CY((0, .31, .22), .1, .42, r2=.145, rot=(-.85, 0, 0)); E((0, .17, .38), .11, (1.05, .9, 1.0)); E((0, .43, .05), .15, (1, 1, 1.2))
    for s in (-1, 1):
        E((s * .09, .72, -.07), 1, (.04, .11, .035), rot=(0, 0, s * .2)); E((s * .06, .2, .5), .035)
        E((s * .13, .48, .06), .035)
    for k in range(7): E((0, .62 - k * .07, -.18 - k * .02), 1, (.035, .08, .06), rot=(.4, 0, 0))
    CARVE['horse'] = [((0, .1, .47), .045), ((-.06, .19, .52), .025), ((.06, .19, .52), .025)]
    return (0, .1, .48)
def H_goat():
    neck_and_collar(); E((0, .33, 0), .19, (1, 1, 1.2)); E((0, .24, .2), .11, (1, .9, 1.6))
    for s in (-1, 1):
        pts = [(s * (.15 + .11 * math.cos(a) * 0 + .02 * a), .45 + .13 * math.sin(a), -.05 - .13 * math.cos(a) + .13) for a in [i * 0.42 for i in range(16)]]
        pts = [(s * (.14 + .035 * i), .43 + .14 * math.sin(i * .45), -.02 - .14 * math.sin(i * .45 + 1.57) + .14 * 0) for i in range(15)]
        TU(pts, .045, radii=[1 - i / 18 for i in range(15)])
        E((s * .2, .36, -.05), 1, (.1, .04, .05), rot=(0, 0, s * .4))
    TU([(0, .14, .25), (0, .02, .28), (0, -.08, .25)], .05, radii=[1, .7, .2])
    eyes(.1, .36, .14, .033)
    CARVE['goat'] = [((0, .17, .38), .035)]
    return (0, .17, .4)
def H_monkey():
    neck_and_collar(); E((0, .32, 0), .23, (1, 1, .95)); E((0, .28, .15), .16, (1, 1.05, .55)); E((0, .21, .24), .1, (1.3, .8, .8))
    E((0, .41, .19), .11, (1.6, .4, .6))
    for s in (-1, 1): E((s * .25, .33, 0), 1, (.03, .09, .08)); E((s * .1, .26, .22), .05)
    eyes(.07, .35, .23, .03, brow=False)
    CARVE['monkey'] = [((0, .17, .33), .035), ((-.025, .25, .32), .012), ((.025, .25, .32), .012)] + [((s * .27, .33, 0.0), .055) for s in (-1, 1)]
    return (0, .17, .34)
def H_rooster():
    neck_and_collar(); CY((0, .14, 0), .11, .2, r2=.1); E((0, .33, 0), .17, (1, 1.05, 1.1))
    TU([(0, .32, .14), (0, .3, .3)], .05, radii=[1, .1])
    for k in range(5): E((0, .5 + (k % 2) * .03, .1 - k * .06), 1, (.022, .07, .045))
    E((0, .19, .14), 1, (.03, .08, .05)); eyes(.1, .37, .08, .03, brow=False)
    for k in range(6): E((0, .2 - k * .02, -.12 - k * .03), 1, (.13, .04, .06))
    CARVE['rooster'] = []
    return (0, .29, .33)
def H_dog():
    neck_and_collar(); E((0, .33, 0), .22, (1, 1, 1.05)); E((0, .25, .23), .12, (1, .85, 1.6)); E((0, .29, .4), .05, (1.2, 1, 1))
    E((0, .43, .14), .1, (1.4, .45, .7))
    for s in (-1, 1): E((s * .23, .3, -.02), 1, (.05, .16, .1), rot=(0, 0, s * .3))
    eyes(.09, .37, .17, .033)
    CARVE['dog'] = [((0, .18, .39), .04)]
    return (0, .18, .4)
def H_pig():
    neck_and_collar(); E((0, .3, 0), .27, (1.15, 1, 1.05)); E((0, .21, .18), .14, (1.2, .8, 1)); CY((0, .23, .33), .12, .14, r2=.13, rot=(math.pi / 2, 0, 0))
    for s in (-1, 1): E((s * .2, .53, .06), 1, (.11, .05, .14), rot=(.6, 0, s * .4)); E((s * .19, .2, .16), .09)
    eyes(.11, .36, .2, .03)
    CARVE['pig'] = [((-.045, .23, .41), .03), ((.045, .23, .41), .03), ((0, .12, .33), .04)]
    return (0, .12, .36)

BUILD = dict(rat=H_rat, ox=H_ox, tiger=H_tiger, rabbit=H_rabbit, dragon=H_dragon, snake=H_snake, horse=H_horse, goat=H_goat,
             monkey=H_monkey, rooster=H_rooster, dog=H_dog, pig=H_pig)

def fuse(parts, name, mname, voxel, smooth_it=6, target=6000, disp=0.004, carve=(), folds=0.0):
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active; ob.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    r = ob.modifiers.new('rm', 'REMESH'); r.mode = 'VOXEL'; r.voxel_size = voxel; r.adaptivity = 0
    sm = ob.modifiers.new('sm', 'SMOOTH'); sm.factor = 0.8; sm.iterations = smooth_it
    if disp > 0:
        tex = bpy.data.textures.new(name + 't', 'CLOUDS'); tex.noise_scale = 0.06; tex.noise_depth = 3
        d = ob.modifiers.new('d', 'DISPLACE'); d.texture = tex; d.strength = disp; d.mid_level = 0.5
    if folds > 0:
        tex = bpy.data.textures.new(name + 'w', 'WOOD'); tex.wood_type = 'BANDNOISE'; tex.noise_scale = 0.18; tex.turbulence = 6; tex.noise_basis_2 = 'SIN'
        d = ob.modifiers.new('f', 'DISPLACE'); d.texture = tex; d.strength = folds; d.texture_coords = 'OBJECT'
    for m in list(ob.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    for (c, rad) in carve:
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=rad)
        me = bpy.data.meshes.new('cv'); bm.to_mesh(me); bm.free(); cv = bpy.data.objects.new('cv', me); cv.location = T(*c)
        bpy.context.scene.collection.objects.link(cv)
        b = ob.modifiers.new('b', 'BOOLEAN'); b.operation = 'DIFFERENCE'; b.object = cv; b.solver = 'EXACT'
        bpy.ops.object.modifier_apply(modifier=b.name); bpy.data.objects.remove(cv)
    n = len(ob.data.polygons)
    if n > target:
        dm = ob.modifiers.new('dec', 'DECIMATE'); dm.ratio = target / n; bpy.ops.object.modifier_apply(modifier=dm.name)
    for p in ob.data.polygons: p.use_smooth = True
    ob.data.materials.clear(); ob.data.materials.append(MATS[mname])
    return ob

stats = {}
for k, fn in BUILD.items():
    PARTS.clear(); mouth = fn()
    ob = fuse(list(PARTS), 'head_' + k, 'bronze', 0.0085, carve=CARVE.get(k, []), target=7000)
    em = bpy.data.objects.new('mouth_' + k, None); bpy.context.scene.collection.objects.link(em)
    em.location = T(*mouth); em.parent = ob
    stats[k] = len(ob.data.polygons)

# ---------- seated robed body (stone) ----------
PARTS.clear()
CY((0, .08, 0), .62, .16, r2=.58)                    # hem on plinth
CY((0, .62, -.02), .55, 1.05, r2=.28)                # robe silhouette
E((0, .45, .2), .42, (1.05, .42, 1.0))               # lap / knees
E((0, .88, 0), .3, (1.1, 1.0, .75))                  # torso
E((0, 1.1, 0), .27, (1.3, .42, .8))                  # shoulders
for s in (-1, 1):
    E((s * .33, .95, 0), .14, (.9, 1.6, .9))         # upper arms
    TU([(s * .33, .8, .03), (s * .26, .76, .2), (s * .1, .78, .34)], .1, radii=[1, 1.15, 1.3])   # forearms
    E((s * .2, .6, .3), 1, (.14, .22, .12))          # hanging sleeve
E((0, .8, .4), .1, (1.3, .9, .9))                    # clasped hands
CY((0, .98, .46), .05, .5, r2=.04, rot=(-.3, 0, 0))  # tablet (hu)
TU([(-.16, 1.22, .1), (0, .98, .26), (.16, 1.22, .1)], .035)
CY((0, 1.26, -.02), .16, .1, r2=.15)
body = fuse(list(PARTS), 'zbody', 'stone', 0.012, smooth_it=10, target=9000, disp=0.002, folds=0.006)
stats['body'] = len(body.data.polygons)
print('ZODIAC FACES', stats)
bpy.ops.wm.save_as_mainfile(filepath='/workspace/blender/zodiac.blend')
bpy.ops.export_scene.gltf(filepath='/workspace/blender/zodiac.glb', export_format='GLB', export_apply=True, export_texcoords=False, export_yup=True,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
                          export_draco_position_quantization=14, export_draco_normal_quantization=10)
