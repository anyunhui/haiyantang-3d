import sys, math, bpy
sys.path.insert(0, '/workspace/blender')
from hylib import T
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:]
out = args[0]; cam = [float(v) for v in args[1].split(',')]; tgt = [float(v) for v in args[2].split(',')]
w, h = int(args[3]), int(args[4]); lens = float(args[5]) if len(args) > 5 else 24
extra = args[6] if len(args) > 6 else ''
bpy.ops.wm.open_mainfile(filepath='/workspace/blender/hall.blend')
sc = bpy.context.scene
if extra == 'statues':
    # 与 js/zodiac.js 完全相同的布局：两条池边各 6 尊
    keys = ['rat','ox','tiger','rabbit','dragon','snake','horse','goat','monkey','rooster','dog','pig']
    with bpy.data.libraries.load('/workspace/blender/zodiac.blend') as (src, dst):
        dst.objects = [n for n in src.objects if n == 'zbody' or n.startswith('head_')]
    pm = bpy.data.materials.new('ped'); pm.use_nodes = True
    pm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.62, 0.6, 0.55, 1)
    body = [o for o in dst.objects if o.name.startswith('zbody')][0]
    heads = {o.name.split('_')[1].split('.')[0]: o for o in dst.objects if o.name.startswith('head_')}
    E0 = Vector((-4.5, 2.0)); E1 = Vector((-22, 11.5)); SC = 1.1
    for s_ in (1, -1):
        for k in range(6):
            idx = 2 * k if s_ > 0 else 2 * k + 1
            e0 = Vector((E0.x, s_ * E0.y)); e1 = Vector((E1.x, s_ * E1.y))
            d = (e1 - e0).normalized(); n = Vector((-d.y, d.x))
            if n.y * s_ < 0: n = -n
            base = e0.lerp(e1, (k + .5) / 6) + n * 1.6; inw = -n; th = math.atan2(inw.x, inw.y)
            ph = 1.25 + (5 - k) * 0.05
            bpy.ops.mesh.primitive_cube_add(size=1, location=T(base.x, ph / 2, base.y)); c = bpy.context.active_object
            c.scale = (1.4, 1.4, ph); c.rotation_euler = (0, 0, th); c.data.materials.append(pm)
            b = body.copy(); sc.collection.objects.link(b); b.location = T(base.x, ph + .14, base.y); b.rotation_euler = (0, 0, th); b.scale = (SC,) * 3
            hsrc = heads[keys[idx]]; hh = hsrc.copy(); sc.collection.objects.link(hh)
            hh.location = T(base.x, ph + .14 + 1.27 * SC, base.y); hh.rotation_euler = (0, 0, th); hh.scale = (SC,) * 3
elif extra:
    bpy.ops.import_scene.gltf(filepath=extra)
# 大理石风化：噪声 + 污渍（仅渲染用）
for mn in ('marble', 'trim'):
    mm = bpy.data.materials.get(mn)
    if not mm: continue
    nt_ = mm.node_tree; bs = nt_.nodes['Principled BSDF']; base = tuple(bs.inputs['Base Color'].default_value)
    tc = nt_.nodes.new('ShaderNodeTexCoord'); nz = nt_.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.35; nz.inputs['Detail'].default_value = 8
    nt_.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    cr = nt_.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].position = 0.35; cr.color_ramp.elements[1].position = 0.75
    cr.color_ramp.elements[0].color = (base[0] * .55, base[1] * .55, base[2] * .55, 1); cr.color_ramp.elements[1].color = (base[0] * .82, base[1] * .82, base[2] * .82, 1)
    nt_.links.new(nz.outputs['Fac'], cr.inputs['Fac']); nt_.links.new(cr.outputs['Color'], bs.inputs['Base Color'])
# ground + pool
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0))
g = bpy.context.active_object; m = bpy.data.materials.new('ground'); m.use_nodes = True
m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.55, 0.53, 0.5, 1); g.data.materials.append(m)
bpy.ops.mesh.primitive_plane_add(size=1, location=T(-14, 0.3, 0)); p = bpy.context.active_object; p.scale = (20, 20, 1)
wm = bpy.data.materials.new('water'); wm.use_nodes = True; b = wm.node_tree.nodes['Principled BSDF']
b.inputs['Base Color'].default_value = (0.05, 0.12, 0.13, 1); b.inputs['Roughness'].default_value = 0.05; p.data.materials.append(wm)
# camera
cd = bpy.data.cameras.new('cam'); cd.lens = lens; co = bpy.data.objects.new('cam', cd); sc.collection.objects.link(co)
co.location = T(*cam); d = T(*tgt) - co.location; co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); sc.camera = co
# sky + sun
wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True; nt = wd.node_tree
sky = nt.nodes.new('ShaderNodeTexSky'); sky.sky_type = 'NISHITA'; sky.sun_disc = False; sky.sun_elevation = math.radians(38); sky.sun_rotation = math.radians(150)
nt.links.new(sky.outputs[0], nt.nodes['Background'].inputs[0]); nt.nodes['Background'].inputs[1].default_value = 0.22
sd = bpy.data.lights.new('sun', 'SUN'); sd.energy = 6.0; sd.angle = math.radians(2); so = bpy.data.objects.new('sun', sd); sc.collection.objects.link(so)
so.rotation_euler = T(0.75, -0.85, 0.8).normalized().to_track_quat('-Z', 'Y').to_euler()
sc.render.engine = 'CYCLES'; sc.cycles.samples = int(args[7]) if len(args) > 7 else 48; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
sc.render.resolution_x = w; sc.render.resolution_y = h; sc.render.filepath = out
sc.view_settings.exposure = -1.3; sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
bpy.ops.render.render(write_still=True)
