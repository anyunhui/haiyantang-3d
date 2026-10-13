import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { patchStone } from './materials.js';

// ---------- 几何收集器：同材质构件合并为单一网格，减少 draw call ----------
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _m = new THREE.Matrix4();
class Bin {
  constructor() { this.list = []; }
  addMatrix(geo, m) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    this.list.push(g); return this;
  }
  add(geo, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    return this.addMatrix(geo, _m);
  }
  addQ(geo, pos, quat, scl = new THREE.Vector3(1, 1, 1)) { _m.compose(pos, quat, scl); return this.addMatrix(geo, _m); }
  mesh(mat, shadow = true) {
    if (!this.list.length) return new THREE.Group();
    const m = new THREE.Mesh(mergeGeometries(this.list, false), mat);
    m.castShadow = shadow; m.receiveShadow = true; return m;
  }
}
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
export const BALUSTER = lathe([[0, 0], [.12, 0], [.12, .08], [.07, .15], [.12, .38], [.06, .6], [.08, .68], [.11, .74], [0, .75]], 8);
export const URN = lathe([[0, 0], [.25, 0], [.25, .1], [.12, .2], [.3, .45], [.28, .65], [.15, .75], [.2, .8], [.05, .95], [.09, 1.05], [0, 1.15]], 12);
const Y = new THREE.Vector3(0, 1, 0);
function cylBetween(bin, a, b, r, seg = 8) {
  const d = new THREE.Vector3().subVectors(b, a); const len = d.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
  bin.addQ(g, a.clone().add(b).multiplyScalar(.5), new THREE.Quaternion().setFromUnitVectors(Y, d.normalize()));
}
function archShape(w, h) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0); return s;
}
function archFrame(w, h, t = 0.25) {
  const s = archShape(w + t * 2, h + t); const hole = archShape(w, h);
  s.holes.push(new THREE.Path(hole.getPoints(24))); return s;
}
// 立面：face = {at(u, y) -> Vector3, ry}
const FACES = (W, D) => ({
  front: { at: (u, y) => new THREE.Vector3(0, y, u), ry: -Math.PI / 2, n: new THREE.Vector3(-1, 0, 0) },
  back: { at: (u, y) => new THREE.Vector3(D, y, u), ry: Math.PI / 2, n: new THREE.Vector3(1, 0, 0) },
  south: { at: (u, y) => new THREE.Vector3(u, y, W / 2), ry: 0, n: new THREE.Vector3(0, 0, 1) },
  north: { at: (u, y) => new THREE.Vector3(u, y, -W / 2), ry: Math.PI, n: new THREE.Vector3(0, 0, -1) },
});
function addWindow(bins, face, u, bottom, w, h, opts = {}) {
  const p = face.at(u, bottom);
  const frame = new THREE.ExtrudeGeometry(archFrame(w, h, 0.22), { depth: 0.22, bevelEnabled: false, curveSegments: 10 });
  bins.trim.add(frame, p.x + face.n.x * 0.01, p.y, p.z + face.n.z * 0.01, face.ry);
  const glass = new THREE.ShapeGeometry(archShape(w, h), 10);
  bins.glass.add(glass, p.x + face.n.x * 0.02, p.y, p.z + face.n.z * 0.02, face.ry);
  // 拱心石 + 窗楣
  const k = face.at(u, bottom + h + 0.2);
  bins.trim.add(B(0.32, 0.5, 0.3), k.x + face.n.x * 0.2, k.y, k.z + face.n.z * 0.2, face.ry);
  if (opts.hood) { const hd = face.at(u, bottom + h + 0.55); bins.trim.add(B(w + 0.9, 0.16, 0.42), hd.x + face.n.x * 0.2, hd.y, hd.z + face.n.z * 0.2, face.ry); }
  // 窗台
  const sl = face.at(u, bottom - 0.06); bins.trim.add(B(w + 0.6, 0.14, 0.4), sl.x + face.n.x * 0.18, sl.y, sl.z + face.n.z * 0.18, face.ry);
}
function addColumn(bins, x, y0, y1, z, r = 0.34) {
  const h = y1 - y0;
  bins.trim.add(B(0.95, 0.32, 0.95), x, y0 + 0.16, z);
  bins.trim.add(new THREE.CylinderGeometry(r * 0.88, r, h - 0.72, 16), x, y0 + 0.32 + (h - 0.72) / 2, z);
  bins.trim.add(B(1.0, 0.18, 1.0), x, y1 - 0.31, z);
  bins.trim.add(B(1.12, 0.22, 1.12), x, y1 - 0.11, z);
  // 爱奥尼式涡卷（简化）
  for (const s of [-1, 1]) bins.trim.add(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 10), x + s * 0.0, y1 - 0.33, z + s * 0.42, 0, 0, Math.PI / 2, 1, 1, 1);
}
function balustrade(bins, a, b, y, step = 0.5, railW = 0.42) {
  const d = new THREE.Vector3().subVectors(b, a); const len = d.length(); const n = Math.max(2, Math.round(len / step));
  for (let i = 0; i <= n; i++) { const p = a.clone().lerp(b, i / n); bins.trim.add(BALUSTER, p.x, y, p.z); }
  const ang = Math.atan2(-d.z, d.x);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  bins.trim.add(B(len + 0.3, 0.16, railW), mid.x, y + 0.83, mid.z, ang);
  bins.trim.add(B(len + 0.3, 0.12, railW), mid.x, y + 0.02, mid.z, ang);
}

function roofTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.scale(2, 2);
  g.fillStyle = '#21434a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) { // 筒瓦
    const x = i * 32; const gr = g.createLinearGradient(x, 0, x + 32, 0);
    gr.addColorStop(0, '#132a30'); gr.addColorStop(0.35, '#3d7a7e'); gr.addColorStop(0.55, '#5f9e9a'); gr.addColorStop(1, '#132a30');
    g.fillStyle = gr; g.fillRect(x + 4, 0, 24, 256);
  }
  for (let j = 0; j < 8; j++) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, j * 32, 256, 3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function roofGeometry(x0, x1, z0, z1, yb, yr, rz) {
  const xm = (x0 + x1) / 2;
  const A = [x0, yb, z0], Bp = [x0, yb, z1], C = [x1, yb, z1], Dp = [x1, yb, z0], R0 = [xm, yr, -rz], R1 = [xm, yr, rz];
  const tris = [[A, Bp, R1, 'z'], [A, R1, R0, 'z'], [C, Dp, R0, 'z'], [C, R0, R1, 'z'], [Bp, C, R1, 'x'], [Dp, A, R0, 'x']];
  const pos = [], uv = [];
  for (const [a, b, c, ax] of tris) for (const v of [a, b, c]) {
    pos.push(...v); uv.push((ax === 'z' ? v[2] : v[0]) * 0.5, (v[1] - yb) * 0.75);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); return { g, corners: { A, Bp, C, Dp, R0, R1 } };
}

// ================= 海晏堂主楼（十一间楼，面西） =================
export const HALL = { W: 46, D: 14, NB: 11, Y0: 1.2, Y1: 7.2, Y2: 12.6 };
export function buildHall() {
  const { W, D, NB, Y0, Y1, Y2 } = HALL; const BAY = W / NB;
  const bins = { wall: new Bin(), trim: new Bin(), glass: new Bin(), roof: new Bin(), gold: new Bin() };
  const F = FACES(W, D);
  // 墙体与水平线脚
  bins.wall.add(B(D, Y2 - Y0, W), D / 2, (Y0 + Y2) / 2, 0);
  bins.trim.add(B(D + 1.4, Y0, W + 1.4), D / 2, Y0 / 2, 0);
  bins.trim.add(B(D + 0.8, 0.45, W + 0.8), D / 2, Y1 + 0.1, 0);
  bins.trim.add(B(D + 0.9, 0.9, W + 0.9), D / 2, Y2 + 0.45, 0);
  bins.trim.add(B(D + 1.5, 0.3, W + 1.5), D / 2, Y2 + 1.05, 0);
  for (let z = -W / 2; z <= W / 2 + 0.01; z += 0.92) { bins.trim.add(B(0.32, 0.2, 0.24), -0.58, Y2 + 0.8, z); bins.trim.add(B(0.32, 0.2, 0.24), D + 0.58, Y2 + 0.8, z); }
  // 前立面：十二根壁柱 × 两层
  for (let i = 0; i <= NB; i++) {
    const z = -W / 2 + i * BAY;
    addColumn(bins, -0.05, Y0, Y1 - 0.12, z); addColumn(bins, -0.05, Y1 + 0.33, Y2, z, 0.3);
    addColumn(bins, D + 0.05, Y0, Y1 - 0.12, z); addColumn(bins, D + 0.05, Y1 + 0.33, Y2, z, 0.3);
  }
  for (const x of [D / 3, 2 * D / 3]) for (const s of [-1, 1]) { addColumn(bins, x, Y0, Y1 - 0.12, s * (W / 2 + 0.05)); addColumn(bins, x, Y1 + 0.33, Y2, s * (W / 2 + 0.05), 0.3); }
  // 门窗
  for (let i = 0; i < NB; i++) {
    const zc = -W / 2 + BAY * (i + 0.5); const center = i === 5;
    for (const f of [F.front, F.back]) {
      if (center) { addWindow(bins, f, zc, Y0 + 0.15, 2.4, 4.6, { hood: true }); addWindow(bins, f, zc, Y1 + 0.4, 2.3, 3.9); }
      else { addWindow(bins, f, zc, Y0 + 1.0, 1.8, 3.4, { hood: true }); addWindow(bins, f, zc, Y1 + 0.85, 1.7, 3.0); }
    }
  }
  for (const f of [F.south, F.north]) for (const xc of [D / 6, D / 2, 5 * D / 6]) { addWindow(bins, f, xc, Y0 + 1.0, 1.7, 3.4, { hood: true }); addWindow(bins, f, xc, Y1 + 0.85, 1.6, 3.0); }
  // 巴洛克式山花（正中）
  const ped = new THREE.Shape(); ped.moveTo(-3.6, 0); ped.lineTo(-3.6, 1.0); ped.quadraticCurveTo(-3.6, 2.3, -1.7, 2.5);
  ped.quadraticCurveTo(0, 3.7, 1.7, 2.5); ped.quadraticCurveTo(3.6, 2.3, 3.6, 1.0); ped.lineTo(3.6, 0); ped.lineTo(-3.6, 0);
  ped.holes.push(new THREE.Path().absarc(0, 1.55, 0.62, 0, Math.PI * 2, true));
  bins.trim.add(new THREE.ExtrudeGeometry(ped, { depth: 0.6, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2, curveSegments: 18 }), -0.2, Y2 + 1.2, 0, -Math.PI / 2);
  bins.gold.add(new THREE.TorusGeometry(0.66, 0.11, 10, 32), -0.9, Y2 + 2.75, 0, Math.PI / 2);
  bins.glass.add(new THREE.CircleGeometry(0.62, 24), -0.5, Y2 + 2.75, 0, -Math.PI / 2);
  bins.trim.add(URN, -0.5, Y2 + 4.3, 0, 0, 0, 0, 1.2, 1.2, 1.2);
  for (const s of [-1, 1]) bins.trim.add(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 14), -0.6, Y2 + 1.7, s * 3.3, 0, 0, Math.PI / 2);
  // 女儿墙栏杆 + 瓶饰
  const yP = Y2 + 1.2, o = 0.5;
  const c = [new THREE.Vector3(-o, 0, -W / 2 - o), new THREE.Vector3(-o, 0, W / 2 + o), new THREE.Vector3(D + o, 0, W / 2 + o), new THREE.Vector3(D + o, 0, -W / 2 - o)];
  // 前立面栏杆在山花处断开
  balustrade(bins, c[0], new THREE.Vector3(-o, 0, -3.9), yP); balustrade(bins, new THREE.Vector3(-o, 0, 3.9), c[1], yP);
  balustrade(bins, c[1], c[2], yP); balustrade(bins, c[2], c[3], yP); balustrade(bins, c[3], c[0], yP);
  for (let i = 0; i <= NB; i++) { const z = -W / 2 + i * BAY; if (Math.abs(z) < 4) continue; bins.trim.add(B(0.6, 1.0, 0.6), -o, yP + 0.5, z); bins.trim.add(URN, -o, yP + 1.0, z, 0, 0, 0, 0.8, 0.8, 0.8); }
  // 二层平台（与双弧楼梯相接）
  const BX = -3.8;
  bins.trim.add(B(3.9, 0.45, 13.0), BX / 2, Y1 - 0.05, 0);
  bins.trim.add(B(4.1, 0.2, 13.2), BX / 2, Y1 + 0.25, 0);
  for (const z of [-5.8, -2.2, 2.2, 5.8]) addColumn(bins, BX + 0.35, 0, Y1 - 0.28, z, 0.3);
  balustrade(bins, new THREE.Vector3(BX + 0.15, 0, -6.3), new THREE.Vector3(BX + 0.15, 0, 6.3), Y1 + 0.35);
  // 屋顶
  const roof = roofGeometry(0.8, D - 0.8, -W / 2 + 0.8, W / 2 - 0.8, yP - 0.05, 19.4, 15.5);
  bins.roof.addMatrix(roof.g, new THREE.Matrix4());
  const k = roof.corners; const V = a => new THREE.Vector3(...a);
  cylBetween(bins.gold, V(k.R0), V(k.R1), 0.32, 10);
  for (const [a, b] of [[k.A, k.R0], [k.Dp, k.R0], [k.Bp, k.R1], [k.C, k.R1]]) cylBetween(bins.gold, V(a), V(b), 0.18, 8);
  for (const r of [k.R0, k.R1]) { bins.gold.add(new THREE.SphereGeometry(0.55, 14, 10), r[0], r[1] + 0.4, r[2]); bins.gold.add(new THREE.ConeGeometry(0.25, 1.2, 10), r[0], r[1] + 1.3, r[2]); }
  // 双弧楼梯
  buildStairs(bins, Y1 + 0.3);

  const mats = {
    wall: patchStone(new THREE.MeshStandardMaterial({ color: 0xe6dccb, roughness: 0.72 }), { dissolve: true, vein: 1 }),
    trim: patchStone(new THREE.MeshStandardMaterial({ color: 0xf3ece0, roughness: 0.55 }), { dissolve: true, vein: 0.6 }),
    glass: patchStone(new THREE.MeshPhysicalMaterial({ color: 0x0c1418, roughness: 0.06, metalness: 0.3, clearcoat: 1, envMapIntensity: 1.5 }), { dissolve: true, windowGlow: true }),
    roof: patchStone(new THREE.MeshStandardMaterial({ map: roofTexture(), roughness: 0.38, metalness: 0.15, envMapIntensity: 1.2 }), { dissolve: true }),
    gold: patchStone(new THREE.MeshStandardMaterial({ color: 0xc9a050, roughness: 0.3, metalness: 0.9, envMapIntensity: 1.4 }), { dissolve: true }),
  };
  const group = new THREE.Group(); group.name = 'hall';
  for (const k2 in bins) group.add(bins[k2].mesh(mats[k2], k2 !== 'glass'));
  return { group, mats };
}

function buildStairs(bins, topY) {
  const N = 46, width = 2.8;
  for (const s of [-1, 1]) {
    const P0 = new THREE.Vector2(-1.9, s * 6.6), P1 = new THREE.Vector2(-1.9, s * 16.8), P2 = new THREE.Vector2(-12.8, s * 16.8);
    const Q = t => new THREE.Vector2().addScaledVector(P0, (1 - t) * (1 - t)).addScaledVector(P1, 2 * (1 - t) * t).addScaledVector(P2, t * t);
    // 弧长重参数化
    const S = 400, cum = [0], pts = [Q(0)];
    for (let i = 1; i <= S; i++) { pts.push(Q(i / S)); cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1])); }
    const L = cum[S];
    const at = d => { let i = cum.findIndex(c => c >= d); if (i <= 0) i = 1; const f = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1); return pts[i - 1].clone().lerp(pts[i], f); };
    const seg = L / N; const railL = [], railR = [];
    for (let i = 0; i < N; i++) {
      const p = at((i + 0.5) * seg), a = at(i * seg), b = at(Math.min(L, (i + 1) * seg));
      const t = b.clone().sub(a).normalize(); const ang = Math.atan2(-t.y, t.x);
      const yTop = topY * (1 - (i + 1) / (N + 1));
      bins.wall.add(B(seg * 1.08, yTop, width), p.x, yTop / 2, p.y, ang);
      bins.trim.add(B(seg * 1.12, 0.09, width + 0.2), p.x, yTop + 0.02, p.y, ang);
      const nx = -t.y, nz = t.x;
      for (const e of [-1, 1]) {
        const ex = p.x + nx * e * (width / 2 + 0.05), ez = p.y + nz * e * (width / 2 + 0.05);
        if (i % 1 === 0) bins.trim.add(BALUSTER, ex, yTop + 0.05, ez);
        (e < 0 ? railL : railR).push(new THREE.Vector3(ex, yTop + 0.86, ez));
      }
      if (i === N - 1) for (const e of [-1, 1]) { const ex = p.x + nx * e * (width / 2 + 0.1), ez = p.y + nz * e * (width / 2 + 0.1); bins.trim.add(B(0.7, 1.4, 0.7), ex, 0.7, ez, ang); bins.trim.add(URN, ex, 1.4, ez); }
    }
    for (const r of [railL, railR]) bins.trim.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r), 120, 0.11, 6, false));
  }
}

// ================= 蓄水楼（工字形）与“锡海” =================
export function buildReservoir() {
  const bins = { wall: new Bin(), trim: new Bin(), glass: new Bin(), tin: new Bin(), wood: new Bin() };
  // 两翼 + 中段 + 连廊
  bins.wall.add(B(3.6, 12, 26), 17.8, 6, 0); bins.wall.add(B(3.6, 12, 26), 29.8, 6, 0);
  bins.wall.add(B(8.4, 11.6, 8), 23.8, 5.8, 0); bins.wall.add(B(2.4, 8, 5), 15, 4, 0);
  for (const x of [17.8, 29.8]) { bins.trim.add(B(4.2, 0.45, 26.6), x, 12.0, 0); bins.trim.add(B(4.0, 1.0, 26.4), x, 0.5, 0); bins.trim.add(B(4.0, 0.3, 26.3), x, 6.1, 0); }
  bins.trim.add(B(8.8, 0.4, 8.4), 23.8, 11.6, 0);
  // 东西立面窗与壁柱
  const fW = { at: (u, y) => new THREE.Vector3(16, y, u), ry: -Math.PI / 2, n: new THREE.Vector3(-1, 0, 0) };
  const fE = { at: (u, y) => new THREE.Vector3(31.6, y, u), ry: Math.PI / 2, n: new THREE.Vector3(1, 0, 0) };
  for (let i = 0; i < 7; i++) { const u = -13 + 26 / 7 * (i + 0.5); if (Math.abs(u) < 3 && i === 3) { } for (const f of [fE, fW]) { if (f === fW && Math.abs(u) < 3) continue; addWindow(bins, f, u, 1.6, 1.5, 3.0); addWindow(bins, f, u, 7.0, 1.4, 2.8); } }
  for (let i = 0; i <= 7; i++) { const u = -13 + 26 / 7 * i; for (const x of [15.95, 31.65]) { bins.trim.add(B(0.4, 11.2, 0.7), x, 6.2, u); } }
  for (const s of [-1, 1]) {
    const fS = { at: (u, y) => new THREE.Vector3(u, y, s * 4), ry: s > 0 ? 0 : Math.PI, n: new THREE.Vector3(0, 0, s) };
    for (const u of [21.2, 23.8, 26.4]) { addWindow(bins, fS, u, 1.4, 1.3, 2.8); addWindow(bins, fS, u, 6.8, 1.3, 2.6); }
  }
  // 锡海：顶部锡板蓄水池
  bins.tin.add(B(14.4, 0.3, 5.2), 23.8, 12.15, 0);
  for (const s of [-1, 1]) { bins.tin.add(B(14.4, 1.3, 0.25), 23.8, 12.9, s * 2.55); bins.tin.add(B(0.25, 1.3, 5.2), 23.8 + s * 7.1, 12.9, 0); }
  // 东侧盘旋楼梯
  bins.trim.add(new THREE.CylinderGeometry(0.45, 0.45, 13, 12), 34.2, 6.5, 0);
  for (let i = 0; i < 52; i++) { const a = i * 0.42, y = i * 0.235; bins.trim.add(B(2.3, 0.16, 0.7), 34.2 + Math.cos(a) * 1.4, y + 0.1, Math.sin(a) * 1.4, -a); }
  // 水车（蒋友仁设计；此处为示意）
  const wheel = new THREE.Group();
  const wb = new Bin();
  wb.add(new THREE.TorusGeometry(2.3, 0.12, 8, 40)); wb.add(new THREE.TorusGeometry(1.4, 0.08, 8, 30));
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; wb.add(B(0.1, 2.3, 0.1), Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0, 0, 0, a - Math.PI / 2); wb.add(B(0.5, 0.5, 0.6), Math.cos(a) * 2.35, Math.sin(a) * 2.35, 0, 0, 0, a); }
  const woodMat = patchStone(new THREE.MeshStandardMaterial({ color: 0x5a3b24, roughness: 0.8 }), { dissolve: true });
  const wm = wb.mesh(woodMat); wheel.add(wm); wheel.position.set(31.9, 8.6, -8); wheel.rotation.y = Math.PI / 2;
  const mats = {
    wall: patchStone(new THREE.MeshStandardMaterial({ color: 0xe2d6c2, roughness: 0.75 }), { dissolve: true, vein: 1 }),
    trim: patchStone(new THREE.MeshStandardMaterial({ color: 0xf0e8da, roughness: 0.55 }), { dissolve: true, vein: 0.5 }),
    glass: patchStone(new THREE.MeshPhysicalMaterial({ color: 0x0c1418, roughness: 0.06, metalness: 0.3, clearcoat: 1 }), { dissolve: true, windowGlow: true }),
    tin: patchStone(new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.22, metalness: 1.0, envMapIntensity: 1.6 }), { dissolve: true }),
  };
  const group = new THREE.Group(); group.name = 'reservoir';
  for (const k in mats) group.add(bins[k].mesh(mats[k], k !== 'glass'));
  group.add(wheel);
  return { group, wheel, tinCenter: new THREE.Vector3(23.8, 12.8, 0) };
}

// ================= 大水法遗址（东侧，背景语境） =================
export function buildDashuifa(stoneMat) {
  const bin = new Bin(); const X = 66;
  const arch = new THREE.Shape(); arch.moveTo(-4.5, 0); arch.lineTo(4.5, 0); arch.lineTo(4.5, 8.5); arch.quadraticCurveTo(4.5, 11.5, 0, 12.2); arch.quadraticCurveTo(-4.5, 11.5, -4.5, 8.5); arch.lineTo(-4.5, 0);
  const hole = archShape(4.4, 8.2); arch.holes.push(new THREE.Path(hole.getPoints(30)));
  bin.add(new THREE.ExtrudeGeometry(arch, { depth: 1.6, bevelEnabled: false, curveSegments: 20 }), X, 0.6, 0, -Math.PI / 2);
  bin.add(B(4, 0.6, 24), X - 0.8, 0.3, 0);
  for (const s of [-1, 1]) {
    bin.add(B(1.8, 6.5, 1.8), X - 0.8, 3.85, s * 6.5); bin.add(B(1.5, 3.2, 1.5), X - 0.8, 2.2, s * 9.8, 0.2);
    bin.add(new THREE.CylinderGeometry(0.6, 0.65, 4.2, 14), X - 0.8, 2.7, s * 11.8);
    bin.add(new THREE.CylinderGeometry(0.6, 0.6, 2.2, 14), X - 4, 0.6, s * 7.5, 0.3, 0, Math.PI / 2);
    bin.add(B(1.2, 0.8, 2.2), X - 3, 0.4, s * 3.6, 0.5);
    bin.add(URN, X - 0.8, 7.1, s * 6.5, 0, 0, 0.3 * s, 1.2, 1.2, 1.2);
  }
  // 水法池残迹
  bin.add(B(9, 0.5, 0.6), X - 6.5, 0.25, 4.5); bin.add(B(9, 0.5, 0.6), X - 6.5, 0.25, -4.5); bin.add(B(0.6, 0.5, 9.6), X - 11, 0.25, 0);
  const m = bin.mesh(stoneMat); m.name = 'dashuifa'; return { mesh: m, anchor: new THREE.Vector3(X, 13.5, 0) };
}

// ================= 地面、铺装、树木、瓦砾 =================
export function buildGround() {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2),
    patchStone(new THREE.MeshStandardMaterial({ color: 0x7d7c62, roughness: 0.95 }), { ground: true }));
  ground.receiveShadow = true; g.add(ground);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(76, 64).rotateX(-Math.PI / 2),
    patchStone(new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 0.85 }), { paving: true }));
  plaza.position.set(2, 0.02, 0); plaza.receiveShadow = true; g.add(plaza);
  // 柏树 + 阔叶树（程序化分布）
  const rnd = mulberry(7);
  const cyp = new THREE.InstancedMesh(new THREE.ConeGeometry(1.3, 7, 7), new THREE.MeshStandardMaterial({ color: 0x1f3a2a, roughness: 0.9, flatShading: true }), 220);
  const bro = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3.2, 1), new THREE.MeshStandardMaterial({ color: 0x2c4a2c, roughness: 0.9, flatShading: true }), 140);
  const m = new THREE.Matrix4(); let ci = 0, bi = 0;
  while (ci < 220 || bi < 140) {
    const a = rnd() * Math.PI * 2, r = 58 + rnd() * 110; const x = Math.cos(a) * r + 10, z = Math.sin(a) * r;
    if (x > 45 && x < 85 && Math.abs(z) < 25) continue;
    const s = 0.7 + rnd() * 0.8;
    if (rnd() < 0.6 && ci < 220) { m.compose(new THREE.Vector3(x, 3.5 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s * (1 + rnd() * 0.6), s)); cyp.setMatrixAt(ci++, m); }
    else if (bi < 140) { m.compose(new THREE.Vector3(x, 3.6 * s, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(), rnd(), rnd())), new THREE.Vector3(s, s * 0.85, s)); bro.setMatrixAt(bi++, m); }
  }
  cyp.castShadow = bro.castShadow = true; g.add(cyp, bro);
  return g;
}
export function buildRubble(stoneMat) {
  const rnd = mulberry(21); const n = 320;
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stoneMat, n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    let x, z; if (i < 220) { x = -3 + rnd() * 36; z = (rnd() - 0.5) * 50; } else { x = -14 + rnd() * 12; z = (rnd() < 0.5 ? -1 : 1) * (8 + rnd() * 10); }
    const s = 0.3 + rnd() * 1.4;
    m.compose(new THREE.Vector3(x, s * 0.3, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 0.6, rnd() * 3, rnd() * 0.6)), new THREE.Vector3(s * (1 + rnd()), s * 0.6, s));
    im.setMatrixAt(i, m);
  }
  im.castShadow = im.receiveShadow = true; im.name = 'rubble'; return im;
}
export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ================= Blender 高精度主楼（GLB, Draco 压缩） =================
// 网格按材质名分组（marble/trim/roof/ridge/gold/glass/dark/iron），此处替换为带溶解/边缘光等补丁的材质
export function hallFromGLB(gltf) {
  const P = (m, o) => patchStone(m, Object.assign({ dissolve: true }, o));
  const mats = {
    marble: P(new THREE.MeshStandardMaterial({ color: 0xe4dccd, roughness: 0.74 }), { vein: 1 }),
    trim: P(new THREE.MeshStandardMaterial({ color: 0xf4eee3, roughness: 0.52 }), { vein: 0.5 }),
    roof: P(new THREE.MeshStandardMaterial({ color: 0x3a6fbf, roughness: 0.28, metalness: 0.1, envMapIntensity: 1.1 }), { tiles: true }),
    ridge: P(new THREE.MeshStandardMaterial({ color: 0x1e3a6e, roughness: 0.35, metalness: 0.1 }), {}),
    gold: P(new THREE.MeshStandardMaterial({ color: 0xc9a050, roughness: 0.3, metalness: 0.9, envMapIntensity: 1.4 }), {}),
    glass: P(new THREE.MeshPhysicalMaterial({ color: 0x0c1418, roughness: 0.06, metalness: 0.3, clearcoat: 1, envMapIntensity: 1.5 }), { windowGlow: true }),
    dark: P(new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.9 }), { windowGlow: true }),
    iron: P(new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.45, metalness: 0.7, envMapIntensity: 1.0 }), {}),
  };
  const group = new THREE.Group(); group.name = 'hall';
  const meshes = [];
  gltf.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    const key = (o.material && o.material.name) || o.name.replace('hy_', '');
    const m = new THREE.Mesh(o.geometry, mats[key] || mats.marble);
    o.updateWorldMatrix(true, false); m.applyMatrix4(o.matrixWorld);
    m.castShadow = key !== 'glass' && key !== 'iron'; m.receiveShadow = true; m.name = 'hall_' + key;
    group.add(m);
  }
  return { group, mats };
}
