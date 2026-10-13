# Haiyantang hall — high-detail procedural model (headless Blender). Run:
#   blender -b -P hall.py -- out.glb
import sys, math, bpy, bmesh
sys.path.insert(0, '/workspace/blender')
from hylib import *
from mathutils import Vector, Matrix

reset()
mat('marble', (0.80, 0.79, 0.76), 0.78)
mat('trim', (0.90, 0.89, 0.86), 0.55)
mat('roof', (0.10, 0.25, 0.52), 0.32)
mat('ridge', (0.07, 0.15, 0.32), 0.45)
mat('gold', (0.78, 0.58, 0.26), 0.32, 0.9)
mat('glass', (0.02, 0.025, 0.03), 0.15)
mat('dark', (0.06, 0.06, 0.065), 0.9)
mat('iron', (0.04, 0.04, 0.045), 0.45, 0.7)

Y1 = 7.2                     # terrace level (top of podium, base of stairs)
FRONT = (-1, 0, 0)

BALUSTER = lathe_mesh('bal', [(0, 0), (.13, 0), (.13, .07), (.08, .14), (.13, .36), (.07, .58), (.09, .66), (.12, .72), (0, .74)], 8)
URN = lathe_mesh('urn', [(0, 0), (.26, 0), (.26, .1), (.12, .2), (.3, .45), (.31, .58), (.24, .72), (.12, .78), (.2, .84), (.05, .98), (.09, 1.06), (0, 1.16)], 14)
PINNACLE = lathe_mesh('pin', [(0, 0), (.32, 0), (.32, .2), (.2, .3), (.24, .5), (.12, .7), (.2, .95), (.07, 1.15), (.05, 1.9), (.13, 2.0), (.13, 2.12), (0, 2.25)], 12)
BALL = lathe_mesh('ball', [(0, 0), (.08, 0), (.07, .1), (.2, .25), (.24, .4), (.2, .55), (.06, .66), (.04, .8), (0, .82)], 12)

def balustrade(a, b, y, step=0.42, rail=0.36, mname='trim'):
    a, b = Vector(a), Vector(b); d = b - a; L = d.length; n = max(2, round(L / step))
    for i in range(n + 1):
        p = a.lerp(b, i / n); inst(BALUSTER, mname, (p.x, y, p.y))
    ang = math.atan2(-d.y, d.x); m = (a + b) / 2
    box(mname, (m.x, y + 0.8, m.y), (L + 0.3, 0.14, rail), ang)
    box(mname, (m.x, y + 0.03, m.y), (L + 0.3, 0.1, rail), ang)

def volute(M, r0=0.05, r1=0.45, turns=1.6, tube_r=0.07, sign=1, a0=0.0, z=0.0):
    pts = [(x, y, z) for x, y, _ in spiral_pts(r0, r1, turns, 46, a0=a0, sign=sign)]
    radii = [0.45 + 0.9 * i / 46 for i in range(47)]
    tube('trim', pts, tube_r, M=M, radii=radii)

def c_scroll(M, x0, y0, w, h, sign=1, r=0.08, mname='trim'):
    pts = []
    for i in range(41):
        t = i / 40; x = x0 + sign * w * t; y = y0 + h * (0.5 - 0.5 * math.cos(math.pi * t))
        pts.append((x, y, 0.0))
    tube(mname, pts, r, M=M)
    for (cx, cy, sg, a0) in [(x0, y0, -sign, -math.pi / 2), (x0 + sign * w, y0 + h, sign, math.pi / 2)]:
        sp = [(cx + x, cy + y, 0) for x, y, _ in spiral_pts(0.03, 0.22, 1.1, 24, a0=a0, sign=sg)]
        tube(mname, sp, r * 0.9, M=M)

def shell(M, R=1.8, ribs=15, mname='trim', depth=0.35):
    for i in range(ribs):
        a = math.pi * (0.06 + 0.88 * i / (ribs - 1))
        dirv = Vector((math.cos(a), math.sin(a), 0))
        pts = [(dirv.x * R * t, dirv.y * R * t, depth * math.sin(math.pi * t) * 0.9) for t in [j / 10 for j in range(11)]]
        radii = [0.25 + 0.75 * math.sin(math.pi * min(1, j / 10 + 0.15)) for j in range(11)]
        tube(mname, pts, R * 0.075, M=M, radii=radii)
    rim = [(R * math.cos(math.pi * (0.03 + 0.94 * j / 60)), R * math.sin(math.pi * (0.03 + 0.94 * j / 60)), 0.05) for j in range(61)]
    tube(mname, rim, R * 0.05, M=M)
    hinge = [(x, y, 0.1) for x, y in [(-0.35 * R, 0), (-0.2 * R, -0.12 * R), (0.2 * R, -0.12 * R), (0.35 * R, 0)]]
    tube(mname, hinge, R * 0.07, M=M)

def medallion(M, cx, cy, rx, ry, mname='trim', inner_shell=True):
    pts = [(cx + rx * math.cos(2 * math.pi * i / 48), cy + ry * math.sin(2 * math.pi * i / 48), 0.12) for i in range(48)]
    tube(mname, pts, 0.09, M=M, closed=True)
    shape(mname, [(cx + rx * 0.92 * math.cos(2 * math.pi * i / 40), cy + ry * 0.92 * math.sin(2 * math.pi * i / 40)) for i in range(40)], depth=0.12, M=M, offset_z=0.04)
    if inner_shell:
        S = M @ Matrix.Translation((cx, cy - ry * 0.55, 0.12))
        shell(S, R=min(rx, ry) * 1.15, ribs=11, mname=mname, depth=0.15)

def grille(M, x0, y0, w, h, step=0.22):
    n = int(w / step)
    for i in range(1, n + 1):
        x = x0 + i * w / (n + 1); tube('iron', [(x, y0, 0.06), (x, y0 + h, 0.06)], 0.025, M=M, res=1)
    for y in [y0 + h * 0.3, y0 + h * 0.62, y0 + h * 0.92]:
        tube('iron', [(x0, y, 0.07), (x0 + w, y, 0.07)], 0.03, M=M, res=1)

def arch_opening(M, cx, y0, w, h, frame_t=0.22, depth=0.25, dark='glass', iron=False, key=True):
    inner = arch_pts(w, h, 16, cx, y0); outer = arch_pts(w + 2 * frame_t, h + frame_t, 16, cx, y0)
    shape('trim', outer, [inner], depth=depth, M=M, offset_z=depth / 2)
    shape(dark, inner, depth=0.04, M=M, offset_z=-0.05)
    if iron: grille(M, cx - w / 2, y0, w, h - w / 4)
    if key:
        shape('trim', [(cx - 0.22, y0 + h - 0.1), (cx + 0.22, y0 + h - 0.1), (cx + 0.3, y0 + h + frame_t + 0.35), (cx - 0.3, y0 + h + frame_t + 0.35)], depth=depth + 0.12, M=M, offset_z=(depth + 0.12) / 2)

def rect_window(M, cx, y0, w, h, depth=0.22):
    inner = rect_pts(cx - w / 2, y0, cx + w / 2, y0 + h); outer = rect_pts(cx - w / 2 - .22, y0 - .22, cx + w / 2 + .22, y0 + h + .22)
    shape('trim', outer, [inner], depth=depth, M=M, offset_z=depth / 2)
    shape('glass', inner, depth=0.04, M=M, offset_z=-0.05)
    grille(M, cx - w / 2, y0, w, h)
    hood = [(cx - w / 2 - .45, y0 + h + .3), (cx + w / 2 + .45, y0 + h + .3)] + [(cx + (w / 2 + .45) * math.cos(math.pi * i / 12), y0 + h + .3 + 0.55 * math.sin(math.pi * i / 12)) for i in range(1, 12)]
    shape('trim', hood, depth=0.4, M=M, offset_z=0.2)
    shape('trim', rect_pts(cx - w / 2 - .4, y0 - .42, cx + w / 2 + .4, y0 - .22), depth=0.45, M=M, offset_z=0.22)
    c_scroll(M, cx - 0.1, y0 + h + 0.95, 0.5, 0.25, sign=-1, r=0.05); c_scroll(M, cx + 0.1, y0 + h + 0.95, 0.5, 0.25, sign=1, r=0.05)

def pilaster(x, z, y0, y1, w=0.8, d=0.3, n3=FRONT, col=False):
    if col:
        cyl('trim', (x - 0.25, (y0 + y1) / 2, z), 0.3, y1 - y0 - 0.9, seg=18, r2=0.27)
    else:
        box('trim', (x - d / 2, (y0 + y1) / 2, z), (d, y1 - y0 - 0.5, w))
    box('trim', (x - 0.25, y0 + 0.2, z), (0.75, 0.4, w + 0.25))
    box('trim', (x - 0.25, y1 - 0.25, z), (0.8, 0.5, w + 0.3))
    M = frameM((x - 0.62, y1 - 0.38, z), n3)
    for s in (-1, 1):
        volute(M @ Matrix.Translation((s * (w / 2 + 0.05), 0, 0)), 0.03, 0.2, 1.3, 0.05, sign=-s, a0=math.pi / 2)

# ===================== PODIUM / TERRACE =====================
boxr('marble', 0, 14, 0, Y1, -23, 23)
boxr('trim', -0.3, 14.3, 0, 0.6, -23.3, 23.3)
boxr('trim', -0.45, 14.45, Y1 - 0.4, Y1, -23.45, 23.45)
boxr('trim', -0.25, 14.25, Y1 - 0.62, Y1 - 0.4, -23.25, 23.25)
for i in range(10):
    y = 0.8 + i * 0.58
    boxr('marble', -0.06, 0, y, y + 0.46, -23, 23)
boxr('marble', -3.0, 0, 0, Y1, -6.6, 6.6)
boxr('trim', -3.2, 0, Y1 - 0.35, Y1, -6.8, 6.8)
for i in range(10):
    y = 0.8 + i * 0.58; boxr('marble', -3.06, -3.0, y, y + 0.46, -6.6, 6.6)
for (x0, h, w) in [(-3.6, 1.9, 4.6), (-4.1, 1.25, 4.1), (-4.5, 0.62, 3.6)]:
    boxr('trim', x0, -3.0, 0, h, -w, w)
MF = frameM((-3.0, 0, 0), FRONT)
niche = arch_pts(4.6, 4.9, 20, 0, 2.0); niche_o = arch_pts(5.2, 5.2, 20, 0, 1.9)
shape('trim', niche_o, [niche], depth=0.3, M=MF, offset_z=0.15)
shape('marble', niche, depth=0.05, M=MF, offset_z=-0.35)
box('trim', (-3.4, 2.1, 0), (0.9, 0.35, 3.8))
shell(MF @ Matrix.Translation((0, 2.35, -0.1)), R=2.05, ribs=17, depth=0.55)
prof = [(-6.7, 0)]
for i in range(0, 41):
    t = i / 40; u = -6.7 + 13.4 * t; c = abs(u) / 6.7
    v = 0.95 + 0.55 * math.cos(c * math.pi * 1.5) ** 2 * (1 - c) + 1.4 * (1 - c) ** 2.2
    prof.append((u, v))
prof.append((6.7, 0))
MP = frameM((-3.05, Y1, 0), FRONT)
shape('trim', prof, depth=0.5, M=MP, offset_z=-0.1, bevel=0.03)
for s in (-1, 1):
    volute(MP @ Matrix.Translation((s * 6.35, 0.95, 0.2)), 0.05, 0.62, 1.7, 0.1, sign=s, a0=math.pi)
    c_scroll(MP @ Matrix.Translation((0, 0, 0.2)), s * 1.2, 1.2, 3.6, 0.6, sign=s, r=0.08)
    c_scroll(MP @ Matrix.Translation((0, 0, 0.2)), s * 4.6, 0.5, 1.6, 0.55, sign=s, r=0.07)
medallion(MP @ Matrix.Translation((0, 0, 0.18)), 0, 1.45, 0.8, 0.62)
for i in range(9):
    a = math.pi * (0.1 + 0.8 * i / 8)
    sphere('gold', (-3.6, Y1 + 2.7 + 0.35 * math.sin(a), 1.0 * math.cos(a)), 0.32, (0.9, 0.45, 0.35))
sphere('gold', (-3.6, Y1 + 2.65, 0), 0.6, (1.2, 0.5, 1.6))
for s in (-1, 1):
    balustrade((0.2, s * 7.5), (0.2, s * 22.8), Y1)

# ===================== CENTRAL PAVILION =====================
PX = 1.5
boxr('marble', PX, 12, Y1, 13.4, -7.5, 7.5)
boxr('trim', PX - 0.2, 12.2, Y1, Y1 + 0.4, -7.7, 7.7)
MPF = frameM((PX, 0, 0), FRONT)
for z in (-6.9, 6.9): pilaster(PX, z, Y1 + 0.4, 13.4, w=0.9)
for z in (-2.75, -1.75, 1.75, 2.75): pilaster(PX, z, Y1 + 0.4, 13.4, w=0.7, col=True)
arch_opening(MPF, 0, Y1 + 0.4, 2.5, 4.3, iron=True)
for z in (-4.5, 4.5): rect_window(MPF, z, Y1 + 1.4, 1.5, 2.7)
medallion(MPF @ Matrix.Translation((0, 0, 0.3)), 0, 12.65, 0.75, 0.55)
for s in (-1, 1): c_scroll(MPF @ Matrix.Translation((0, 0, 0.3)), s * 0.75, 12.2, 0.85, 0.7, sign=s, r=0.07)
boxr('trim', PX - 0.35, 12.3, 13.4, 14.0, -7.85, 7.85)
boxr('trim', PX - 0.65, 12.6, 14.0, 14.35, -8.15, 8.15)
for i in range(46):
    z = -7.6 + i * (15.2 / 45); box('trim', (PX - 0.48, 13.85, z), (0.22, 0.2, 0.16))
AX = PX + 0.1
boxr('marble', AX, 10.5, 14.35, 16.6, -7.3, 7.3)
boxr('trim', AX - 0.25, 10.7, 16.45, 16.75, -7.5, 7.5)
MA = frameM((AX, 0, 0), FRONT)
for z in (-4.6, 4.6):
    shape('trim', rect_pts(z - 1.25, 14.7, z + 1.25, 16.25), [rect_pts(z - 1.05, 14.9, z + 1.05, 16.05)], depth=0.18, M=MA, offset_z=0.09)
    shape('trim', rect_pts(z - 0.12, 15.0, z + 0.12, 15.95), depth=0.16, M=MA, offset_z=0.08)
    shape('trim', rect_pts(z - 0.55, 15.5, z + 0.55, 15.72), depth=0.16, M=MA, offset_z=0.08)
    for s in (-1, 1): c_scroll(MA @ Matrix.Translation((0, 0, 0.12)), z + s * 0.25, 15.1, 0.6, 0.35, sign=s, r=0.04)
for z in (-6.9, -2.3, 2.3, 6.9):
    boxr('trim', AX - 0.4, AX + 0.6, 14.35, 17.1, z - 0.5, z + 0.5)
    boxr('trim', AX - 0.5, AX + 0.7, 17.0, 17.25, z - 0.6, z + 0.6)
    inst(PINNACLE if abs(z) > 5 else URN, 'trim', (AX + 0.1, 17.25, z), scale=1.15 if abs(z) > 5 else 1.0)
    inst(BALL, 'trim', (AX + 0.1, 17.25 + (2.6 if abs(z) > 5 else 1.33), z), scale=0.9)
for (z0, z1) in [(-6.3, -2.9), (2.9, 6.3)]:
    balustrade((AX + 0.05, z0), (AX + 0.05, z1), 16.75)
crest = []
for i in range(0, 61):
    t = i / 60; u = -2.3 + 4.6 * t; c = abs(u) / 2.3
    v = 16.6 + 1.0 + 2.2 * math.sqrt(max(0, 1 - c ** 2.4)) + 0.4 * math.sin(c * math.pi * 2.0) * (1 - c)
    crest.append((u, v))
crest = [(-2.3, 16.6)] + crest + [(2.3, 16.6)]
shape('trim', crest, depth=0.6, M=MA, offset_z=0.0, bevel=0.04)
medallion(MA @ Matrix.Translation((0, 0, 0.3)), 0, 18.05, 0.85, 1.0)
for s in (-1, 1):
    volute(MA @ Matrix.Translation((s * 2.45, 17.2, 0.25)), 0.05, 0.55, 1.6, 0.11, sign=s, a0=0)
    c_scroll(MA @ Matrix.Translation((0, 0, 0.32)), s * 0.9, 19.2, 1.2, -0.9, sign=s, r=0.07)
inst(URN, 'trim', (AX, 20.0, 0), scale=1.0); inst(BALL, 'trim', (AX, 21.1, 0), scale=1.2)
boxr('marble', AX + 0.6, 12.0, 14.35, 15.6, -7.3, 7.3)

# ===================== WINGS =====================
def hip_roof(x0, x1, w0, w1, yb, H, s, nx=34, nw=46):
    bm = bmesh.new(); dmax = (x1 - x0) / 2; grid = []
    def h(x, w):
        d = min(x - x0, x1 - x, w1 - w); t = max(0.0, min(1.0, d / dmax))
        y = yb + H * t ** 1.45
        for cx in (x0, x1):
            e = math.hypot(x - cx, w - w1); y += 0.55 * math.exp(-(e / 1.6) ** 2)
        return y
    for i in range(nx + 1):
        row = []
        for j in range(nw + 1):
            x = x0 + (x1 - x0) * i / nx; w = w0 + (w1 - w0) * j / nw
            row.append(bm.verts.new(T(x, h(x, w), s * w)))
        grid.append(row)
    for i in range(nx):
        for j in range(nw):
            f = bm.faces.new([grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]]); f.smooth = True
    loops = [[grid[0][j] for j in range(nw + 1)], [grid[i][nw] for i in range(nx + 1)], [grid[nx][j] for j in range(nw, -1, -1)]]
    for Lp in loops:
        low = [bm.verts.new(v.co - Vector((0, 0, 0.32))) for v in Lp]
        for k in range(len(Lp) - 1): bm.faces.new([Lp[k], Lp[k + 1], low[k + 1], low[k]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # make sure top surface faces up
    up = sum((f.normal.z for f in bm.faces if f.smooth), 0.0)
    if up < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm_to_obj(bm, 'roof', Matrix.Identity(4), name='hiproof')
    xm = (x0 + x1) / 2; wr = w1 - dmax
    box('ridge', (xm, yb + H + 0.25, s * (w0 + wr) / 2), (0.5, 0.6, wr - w0))
    for cx in (x0, x1):
        pts = []
        for k in range(13):
            t = k / 12; x = cx + (xm - cx) * t; w = w1 + (wr - w1) * t
            pts.append((x, h(x, w) + 0.12, s * w))
        tube('ridge', pts, 0.16)
    sphere('gold', (xm, yb + H + 0.75, s * wr), 0.32)
    box('ridge', (xm, yb + H + 0.6, s * (wr + 0.15)), (0.35, 0.9, 0.35))

for s in (-1, 1):
    W0, W1 = 7.5, 23.0
    boxr('dark', 3.0, 12.0, Y1, 12.0, *sorted((s * W0, s * W1)))
    boxr('marble', 2.8, 3.0, Y1, 12.0, *sorted((s * W0, s * W1)))
    boxr('marble', 2.0, 12.0, Y1, 12.0, *sorted((s * (W1 - 0.4), s * W1)))
    Mw = frameM((2.4, 0, 0), FRONT)
    n_arch = 5; pitch = (W1 - W0) / n_arch
    us = [s * (W0 + pitch * (i + 0.5)) for i in range(n_arch)]
    lo, hi = sorted((s * W0, s * W1))
    holes = [arch_pts(2.1, 3.3, 16, u, Y1 + 0.35) for u in us]
    shape('marble', rect_pts(lo, Y1, hi, 12.0), holes, depth=0.8, M=Mw)
    for u in us:
        arc = [(u + 1.17 * math.cos(math.pi * k / 20), Y1 + 0.35 + 3.3 - 1.05 + 1.17 * math.sin(math.pi * k / 20), 0.42) for k in range(21)]
        tube('trim', arc, 0.1, M=Mw)
        shape('trim', [(u - 0.2, Y1 + 3.55), (u + 0.2, Y1 + 3.55), (u + 0.28, Y1 + 4.15), (u - 0.28, Y1 + 4.15)], depth=0.62, M=Mw, offset_z=0.3)
        tube('iron', [(u - 1.05, Y1 + 1.25, 0.5), (u + 1.05, Y1 + 1.25, 0.5)], 0.04, M=Mw)
        for k in range(9):
            xx = u - 1.0 + k * 0.25; tube('iron', [(xx, Y1 + 0.35, 0.5), (xx, Y1 + 1.25, 0.5)], 0.02, M=Mw, res=1)
    for i in range(1, n_arch + 1):
        u = s * (W0 + pitch * i)
        boxr('trim', 1.75, 2.05, Y1 + 0.3, 11.3, u - 0.3, u + 0.3)
        boxr('trim', 1.6, 2.05, 11.3, 11.65, u - 0.42, u + 0.42)
        if i < n_arch: medallion(Mw @ Matrix.Translation((0, 0, 0.42)), u, 11.0, 0.32, 0.32, inner_shell=False)
    boxr('trim', 1.55, 12.4, 11.65, 12.2, *sorted((s * W0, s * (W1 + 0.4))))
    boxr('trim', 1.3, 12.6, 12.2, 12.5, *sorted((s * W0, s * (W1 + 0.6))))
    hip_roof(1.0, 13.0, W0 - 0.1, W1 + 0.9, 12.45, 3.3, s)

# ===================== DOUBLE CURVED STAIRCASES =====================
def scroll_block(x, y, z, ang, length=1.1):
    pts = [(-length / 2, 0), (length / 2, 0), (length / 2, 0.32)]
    for k in range(1, 12):
        a = math.pi * k / 11; pts.append((length / 2 - 0.2 + 0.2 * math.cos(a), 0.32 + 0.22 * math.sin(a)))
    pts += [(-length / 2 + 0.1, 0.5), (-length / 2, 0.42)]
    M = Matrix.Translation(T(x, y, z)) @ Matrix.Rotation(ang, 4, 'Z') @ Matrix.Rotation(math.pi / 2, 4, 'X')
    shape('trim', pts, depth=0.44, M=M, bevel=0.03)
    volute(M @ Matrix.Translation((length / 2 - 0.2, 0.32, 0.23)), 0.02, 0.17, 1.2, 0.04, sign=1, a0=0)

N, WIDTH = 42, 2.8
for s in (-1, 1):
    P0, P1, P2 = Vector((-1.9, s * 6.6)), Vector((-1.9, s * 16.8)), Vector((-12.8, s * 16.8))
    Q = lambda t: P0 * (1 - t) ** 2 + P1 * 2 * (1 - t) * t + P2 * t * t
    S = 400; pts = [Q(i / S) for i in range(S + 1)]; cum = [0.0]
    for i in range(1, S + 1): cum.append(cum[-1] + (pts[i] - pts[i - 1]).length)
    L = cum[-1]
    def at(d):
        for i in range(1, S + 1):
            if cum[i] >= d:
                f = (d - cum[i - 1]) / max(1e-6, cum[i] - cum[i - 1]); return pts[i - 1].lerp(pts[i], f)
        return pts[-1]
    seg = L / N
    for i in range(N):
        p, a, b = at((i + 0.5) * seg), at(i * seg), at(min(L, (i + 1) * seg))
        t = (b - a).normalized(); ang = math.atan2(-t.y, t.x)
        yTop = Y1 * (1 - (i + 1) / (N + 1))
        box('marble', (p.x, yTop / 2, p.y), (seg * 1.1, yTop, WIDTH), ang)
        box('trim', (p.x, yTop + 0.03, p.y), (seg * 1.14, 0.1, WIDTH + 0.1), ang)
        nx, nz = -t.y, t.x
        for e in (-1, 1):
            ex, ez = p.x + nx * e * (WIDTH / 2 + 0.2), p.y + nz * e * (WIDTH / 2 + 0.2)
            box('marble', (ex, (yTop + 0.9) / 2, ez), (seg * 1.12, yTop + 0.9, 0.4), ang)
            box('trim', (ex, yTop + 0.92, ez), (seg * 1.14, 0.1, 0.5), ang)
            if i % 3 == 1: scroll_block(ex, yTop + 0.97, ez, ang + math.pi)
        if i == N - 1:
            for e in (-1, 1):
                ex, ez = p.x + nx * e * (WIDTH / 2 + 0.25), p.y + nz * e * (WIDTH / 2 + 0.25)
                boxr('trim', ex - 0.45, ex + 0.45, 0, 1.6, ez - 0.45, ez + 0.45); inst(URN, 'trim', (ex, 1.6, ez), scale=1.1)

objs = join_groups('hy_')
tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs.values())
print('HALL TRIS', tri, {k: len(v.data.polygons) for k, v in objs.items()})
out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '/workspace/blender/hall.glb'
bpy.ops.wm.save_as_mainfile(filepath='/workspace/blender/hall.blend')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_texcoords=False, export_yup=True,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
                          export_draco_position_quantization=14, export_draco_normal_quantization=10)
print('EXPORTED', out)
