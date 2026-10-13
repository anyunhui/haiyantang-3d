# Shared helpers for headless Blender modelling. Coordinates are given in three.js space
# (X east, Y up, Z south) and converted to Blender (Z up): T(x,y,z) = (x, -z, y).
import bpy, bmesh, math
from mathutils import Vector, Matrix

UP = Vector((0, 0, 1))
def T(x, y, z): return Vector((x, -z, y))
def D(x, y, z): return Vector((x, -z, y))

MATS, GROUPS = {}, {}
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); GROUPS.clear()

def mat(name, color, rough=0.6, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    MATS[name] = m; GROUPS[name] = []; return m

def link(ob, mname):
    bpy.context.scene.collection.objects.link(ob)
    if ob.type == 'MESH' and len(ob.data.materials) == 0: ob.data.materials.append(MATS[mname])
    GROUPS[mname].append(ob); return ob

def bm_to_obj(bm, mname, M=None, smooth=False, name='p'):
    if smooth:
        for f in bm.faces: f.smooth = True
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    if M is not None: ob.matrix_world = M
    return link(ob, mname)

def placeM(pos3, ry=0.0, scale=(1, 1, 1)):
    s = scale if isinstance(scale, (tuple, list)) else (scale, scale, scale)
    # scale given in three axes (sx, sy, sz) -> blender (sx, sz, sy)
    S = Matrix.Diagonal((s[0], s[2], s[1], 1))
    return Matrix.Translation(T(*pos3)) @ Matrix.Rotation(ry, 4, 'Z') @ S

def box(mname, c, s, ry=0.0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    return bm_to_obj(bm, mname, placeM(c, ry, s), name='box')

def boxr(mname, x0, x1, y0, y1, z0, z1):
    return box(mname, ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), (x1 - x0, y1 - y0, z1 - z0))

def cyl(mname, c, r, h, seg=16, r2=None, axis='y', ry=0.0, smooth=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
    M = Matrix.Translation(T(*c)) @ Matrix.Rotation(ry, 4, 'Z')
    if axis == 'x': M = M @ Matrix.Rotation(math.pi / 2, 4, 'Y')
    if axis == 'z': M = M @ Matrix.Rotation(math.pi / 2, 4, 'X')
    ob = bm_to_obj(bm, mname, M, smooth=False, name='cyl')
    if smooth:
        for p in ob.data.polygons: p.use_smooth = len(p.vertices) == 4
    return ob

def sphere(mname, c, r, s=(1, 1, 1), seg=16, ring=10):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=r)
    return bm_to_obj(bm, mname, placeM(c, 0, s), smooth=True, name='sph')

_lathe_cache = {}
def lathe_mesh(key, profile, seg=12):
    if key in _lathe_cache: return _lathe_cache[key]
    bm = bmesh.new()
    vs = [bm.verts.new((max(r, 0.0), 0, h)) for r, h in profile]
    es = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * math.pi, steps=seg, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    for f in bm.faces: f.smooth = True
    me = bpy.data.meshes.new(key); bm.to_mesh(me); bm.free(); _lathe_cache[key] = me; return me

def inst(me, mname, pos3, ry=0.0, scale=1.0):
    ob = bpy.data.objects.new('i', me); ob.matrix_world = placeM(pos3, ry, scale)
    return link(ob, mname)

def frameM(o3, n3):
    """Local frame on a facade: X along facade, Y up, Z = outward normal (three-space vectors)."""
    n = D(*n3).normalized(); X = UP.cross(n).normalized()
    M = Matrix.Identity(4)
    for i in range(3): M[i][0], M[i][1], M[i][2] = X[i], UP[i], n[i]
    M.translation = T(*o3); return M

def _curve_to_mesh(cu, mname, M, smooth=False):
    ob = bpy.data.objects.new('c', cu); bpy.context.scene.collection.objects.link(ob)
    ob.matrix_world = M
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob); bpy.data.curves.remove(cu)
    for p in me.polygons: p.use_smooth = smooth
    o2 = bpy.data.objects.new('cm', me); o2.matrix_world = M
    return link(o2, mname)

def shape(mname, outer, holes=(), depth=0.3, M=None, bevel=0.0, smooth=False, offset_z=0.0):
    """2D polygon(s) in local XY extruded along local Z (centred on offset_z)."""
    cu = bpy.data.curves.new('s', 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'
    cu.extrude = depth / 2; cu.bevel_depth = bevel; cu.bevel_resolution = 1; cu.offset = 0
    for loop in [outer] + list(holes):
        sp = cu.splines.new('POLY'); sp.points.add(len(loop) - 1)
        for i, (x, y) in enumerate(loop): sp.points[i].co = (x, y, offset_z, 1)
        sp.use_cyclic_u = True
    return _curve_to_mesh(cu, mname, M if M is not None else Matrix.Identity(4), smooth)

def tube(mname, pts, r, M=None, closed=False, res=2, radii=None, caps=True):
    """3D poly tube; pts in local coords (if M given) or three-space (if M None)."""
    cu = bpy.data.curves.new('t', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = res; cu.use_fill_caps = caps
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        v = Vector(p) if M is not None else T(*p)
        sp.points[i].co = (v.x, v.y, v.z, 1)
        if radii: sp.points[i].radius = radii[i]
    sp.use_cyclic_u = closed
    return _curve_to_mesh(cu, mname, M if M is not None else Matrix.Identity(4), smooth=True)

# ---- 2D helpers ----
def arch_pts(w, h, n=14, cx=0.0, y0=0.0):
    r = w / 2; pts = [(cx - r, y0), (cx + r, y0), (cx + r, y0 + h - r)]
    for i in range(1, n): a = math.pi * i / n; pts.append((cx + r * math.cos(a), y0 + h - r + r * math.sin(a)))
    pts.append((cx - r, y0 + h - r)); return pts

def rect_pts(x0, y0, x1, y1): return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]

def spiral_pts(r0, r1, turns, n=40, cx=0.0, cy=0.0, a0=0.0, sign=1):
    pts = []
    for i in range(n + 1):
        t = i / n; a = a0 + sign * t * turns * 2 * math.pi; r = r0 + (r1 - r0) * t
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a), 0))
    return pts

def join_groups(prefix):
    out = {}
    for mname, obs in GROUPS.items():
        obs = [o for o in obs if o.name in bpy.data.objects]
        if not obs: continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in obs: o.select_set(True)
        bpy.context.view_layer.objects.active = obs[0]
        if len(obs) > 1: bpy.ops.object.join()
        j = bpy.context.view_layer.objects.active; j.name = prefix + mname; j.data.name = prefix + mname
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        bm = bmesh.new(); bm.from_mesh(j.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005); bm.to_mesh(j.data); bm.free()
        out[mname] = j
    return out
