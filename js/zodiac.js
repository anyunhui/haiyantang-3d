import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { patchStone, makeBronze } from './materials.js';

// 十二生肖（按地支顺序）
export const ZODIAC = [
  { k: 'rat', a: '鼠', z: '子', t: '23:00–01:00' }, { k: 'ox', a: '牛', z: '丑', t: '01:00–03:00' },
  { k: 'tiger', a: '虎', z: '寅', t: '03:00–05:00' }, { k: 'rabbit', a: '兔', z: '卯', t: '05:00–07:00' },
  { k: 'dragon', a: '龙', z: '辰', t: '07:00–09:00' }, { k: 'snake', a: '蛇', z: '巳', t: '09:00–11:00' },
  { k: 'horse', a: '马', z: '午', t: '11:00–13:00' }, { k: 'goat', a: '羊', z: '未', t: '13:00–15:00' },
  { k: 'monkey', a: '猴', z: '申', t: '15:00–17:00' }, { k: 'rooster', a: '鸡', z: '酉', t: '17:00–19:00' },
  { k: 'dog', a: '狗', z: '戌', t: '19:00–21:00' }, { k: 'pig', a: '猪', z: '亥', t: '21:00–23:00' },
];
// 兽首现状（据公开报道整理，截至 2026）
export const STATUS = [
  { s: 'back', n: '2013 皮诺家族捐赠 · 中国国家博物馆' },
  { s: 'back', n: '2000 保利购回 · 保利艺术博物馆' },
  { s: 'back', n: '2000 保利购回 · 保利艺术博物馆' },
  { s: 'back', n: '2013 皮诺家族捐赠 · 中国国家博物馆' },
  { s: 'doubt', n: '传在台湾/海外 · 未获官方确认' },
  { s: 'lost', n: '下落不明' },
  { s: 'back', n: '2007 何鸿燊购得 · 2020 入藏圆明园' },
  { s: 'lost', n: '下落不明' },
  { s: 'back', n: '2000 保利购回 · 保利艺术博物馆' },
  { s: 'lost', n: '下落不明' },
  { s: 'lost', n: '下落不明' },
  { s: 'back', n: '2003 何鸿燊出资购回 · 保利艺术博物馆' },
];

const SPH = new THREE.SphereGeometry(1, 24, 18);
function mk(geo, mat, p, s, r) { const m = new THREE.Mesh(geo, mat); if (p) m.position.set(...p); if (s) m.scale.set(...s); if (r) m.rotation.set(...r); m.castShadow = true; return m; }
const sph = (g, m, r, s, p) => g.add(mk(SPH, m, p, [r * s[0], r * s[1], r * s[2]]));
const cone = (g, m, r, h, p, rot) => g.add(mk(new THREE.ConeGeometry(r, h, 14), m, p, null, rot));
const tube = (g, m, pts, rad) => g.add(mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(a => new THREE.Vector3(...a))), 20, rad, 8), m));
const cyl = (g, m, r, h, p, rot) => g.add(mk(new THREE.CylinderGeometry(r, r, h, 18), m, p, null, rot));
const PI = Math.PI;

// 每种兽首的程序化剪影（局部坐标：+z 为面朝方向），返回口部坐标
const HEADS = {
  rat(g, m) { sph(g, m, .24, [1, .95, 1.1], [0, .28, 0]); cone(g, m, .13, .32, [0, .24, .3], [PI / 2, 0, 0]); sph(g, m, .045, [1, 1, 1], [0, .25, .46]);
    for (const s of [-1, 1]) { cyl(g, m, .13, .035, [s * .17, .5, -.02], [PI / 2, 0, s * .3]); sph(g, m, .03, [1, 1, 1], [s * .1, .34, .2]); } return [0, .2, .44]; },
  ox(g, m) { sph(g, m, .28, [1.15, 1, 1.05], [0, .3, 0]); sph(g, m, .2, [1.2, .85, 1], [0, .17, .24]);
    for (const s of [-1, 1]) { tube(g, m, [[s * .2, .45, 0], [s * .45, .5, .02], [s * .6, .66, .06], [s * .58, .86, .1]], .05); sph(g, m, .08, [1.3, .6, .6], [s * .34, .38, -.02]); } return [0, .12, .44]; },
  tiger(g, m) { sph(g, m, .3, [1.15, 1, 1], [0, .3, 0]); sph(g, m, .17, [1.3, .8, .9], [0, .21, .26]); sph(g, m, .06, [1, 1, 1], [0, .28, .41]); sph(g, m, .1, [1.6, .45, .8], [0, .44, .18]);
    for (const s of [-1, 1]) { sph(g, m, .09, [1, 1, .5], [s * .2, .55, -.02]); sph(g, m, .13, [1, 1, 1], [s * .25, .2, .1]); } return [0, .14, .4]; },
  rabbit(g, m) { sph(g, m, .22, [1, 1, 1.1], [0, .27, 0]); sph(g, m, .12, [1.1, .9, 1], [0, .21, .2]);
    for (const s of [-1, 1]) g.add(mk(new THREE.CapsuleGeometry(.06, .36, 6, 12), m, [s * .09, .66, -.04], [1, 1, .55], [-.15, 0, -s * .12])); return [0, .15, .32]; },
  dragon(g, m) { sph(g, m, .24, [1.1, .9, 1.2], [0, .32, 0]); g.add(mk(new THREE.BoxGeometry(.3, .17, .5), m, [0, .28, .36])); g.add(mk(new THREE.BoxGeometry(.26, .07, .4), m, [0, .14, .32], null, [.25, 0, 0])); sph(g, m, .08, [1.6, 1, 1], [0, .33, .6]);
    for (const s of [-1, 1]) { tube(g, m, [[s * .1, .48, -.06], [s * .16, .66, -.2], [s * .2, .86, -.42]], .035); tube(g, m, [[s * .15, .66, -.2], [s * .3, .76, -.16]], .025);
      tube(g, m, [[s * .1, .27, .55], [s * .3, .22, .62], [s * .45, .1, .52], [s * .52, -.06, .38]], .014); sph(g, m, .06, [1, .7, 1.2], [s * .13, .43, .17]); }
    for (let i = 0; i < 4; i++) cone(g, m, .05, .18, [0, .5 - i * .06, -.1 - i * .1], [-.9, 0, 0]); return [0, .22, .62]; },
  snake(g, m) { sph(g, m, .2, [1.1, .6, 1.6], [0, .26, .08]); g.add(mk(new THREE.CapsuleGeometry(.12, .3, 6, 12), m, [0, .12, -.12], null, [.5, 0, 0]));
    for (const s of [-1, 1]) sph(g, m, .05, [1, 1, 1], [s * .13, .33, .18]); return [0, .22, .4]; },
  horse(g, m) { g.add(mk(new THREE.CapsuleGeometry(.13, .42, 6, 14), m, [0, .33, .2], null, [-.85, 0, 0])); sph(g, m, .19, [1, 1.1, 1.05], [0, .48, -.04]);
    for (const s of [-1, 1]) { cone(g, m, .05, .2, [s * .09, .72, -.06], [0, 0, -s * .2]); sph(g, m, .035, [1, 1, 1], [s * .06, .16, .45]); }
    g.add(mk(new THREE.BoxGeometry(.06, .5, .14), m, [0, .48, -.22], null, [-.35, 0, 0])); return [0, .1, .44]; },
  goat(g, m) { sph(g, m, .2, [1, 1, 1.2], [0, .32, 0]); sph(g, m, .12, [1, .9, 1.6], [0, .23, .22]);
    for (const s of [-1, 1]) g.add(mk(new THREE.TorusGeometry(.13, .045, 8, 24, PI * 1.5), m, [s * .21, .42, -.06], null, [0, PI / 2, PI * .25]));
    cone(g, m, .05, .22, [0, .06, .26], [PI, 0, 0]); return [0, .17, .4]; },
  monkey(g, m) { sph(g, m, .25, [1, 1, .95], [0, .32, 0]); sph(g, m, .18, [1, 1.05, .5], [0, .28, .17]); sph(g, m, .1, [1.3, .8, .8], [0, .2, .26]); sph(g, m, .12, [1.5, .4, .6], [0, .41, .2]);
    for (const s of [-1, 1]) cyl(g, m, .09, .03, [s * .27, .33, 0], [0, 0, PI / 2]); return [0, .17, .35]; },
  rooster(g, m) { sph(g, m, .18, [1, 1.05, 1.1], [0, .33, 0]); cone(g, m, .06, .2, [0, .3, .25], [PI / 2, 0, 0]);
    for (let i = 0; i < 4; i++) sph(g, m, .065, [.35, 1, 1], [0, .5 + (i % 2) * .03, .12 - i * .08]); sph(g, m, .06, [.5, 1.2, .7], [0, .18, .16]); return [0, .29, .36]; },
  dog(g, m) { sph(g, m, .24, [1, 1, 1.05], [0, .33, 0]); sph(g, m, .13, [1, .85, 1.6], [0, .25, .24]); sph(g, m, .05, [1.2, 1, 1], [0, .29, .44]);
    for (const s of [-1, 1]) g.add(mk(SPH, m, [s * .25, .3, -.02], [.05, .17, .11], [0, 0, s * .25])); return [0, .2, .42]; },
  pig(g, m) { sph(g, m, .3, [1.15, 1, 1.05], [0, .3, 0]); g.add(mk(new THREE.CylinderGeometry(.13, .14, .16, 20), m, [0, .24, .33], null, [PI / 2, 0, 0]));
    for (const s of [-1, 1]) cone(g, m, .1, .2, [s * .2, .54, .05], [.7, 0, -s * .3]); return [0, .15, .4]; },
};

function buildBody(mat) {
  const g = new THREE.Group();
  const prof = [[0, 0], [.62, 0], [.66, .08], [.6, .35], [.52, .6], [.42, .88], [.38, 1.08], [.32, 1.24], [.17, 1.33], [0, 1.35]].map(p => new THREE.Vector2(p[0], p[1]));
  const robe = new THREE.LatheGeometry(prof, 28); robe.scale(1, 1, 0.85);
  g.add(mk(robe, mat));
  g.add(mk(new THREE.CapsuleGeometry(.3, .5, 6, 14), mat, [0, .56, .24], [1, 1, 1.1], [0, 0, PI / 2]));
  for (const s of [-1, 1]) {
    const a = new THREE.Vector3(s * .34, 1.12, .02), b = new THREE.Vector3(s * .09, .8, .42);
    const d = b.clone().sub(a); const c = new THREE.Mesh(new THREE.CapsuleGeometry(.11, d.length(), 6, 12), mat);
    c.position.copy(a).add(b).multiplyScalar(.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); c.castShadow = true; g.add(c);
  }
  g.add(mk(SPH, mat, [0, .8, .46], [.16, .12, .12]));
  g.add(mk(new THREE.TorusGeometry(.17, .05, 8, 20), mat, [0, 1.3, 0], null, [PI / 2, 0, 0]));
  return g;
}

// 两岸“八字”排列：南岸（+z）子寅辰午申戌，北岸（-z）丑卯巳未酉亥，由内（近楼）向外
export function buildZodiac(scene, zg = null) {
  const zBody = zg && zg.getObjectByName('zbody');
  const stone = patchStone(new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.7 }), { vein: 0.8 });
  const pedMat = patchStone(new THREE.MeshStandardMaterial({ color: 0xcfc8b8, roughness: 0.8 }), { vein: 1 });
  const bodies = new THREE.Group(); bodies.name = 'bodies';
  const pedestals = new THREE.Group();
  const statues = [];
  const E0 = new THREE.Vector2(-4.5, 2.0), E1 = new THREE.Vector2(-22, 11.5);
  const SCALE = 1.1, PED = 1.25;
  for (const s of [1, -1]) for (let k = 0; k < 6; k++) {
    const idx = s > 0 ? 2 * k : 2 * k + 1;
    const e0 = new THREE.Vector2(E0.x, s * E0.y), e1 = new THREE.Vector2(E1.x, s * E1.y);
    const d = e1.clone().sub(e0).normalize(); let n = new THREE.Vector2(-d.y, d.x); if (n.y * s < 0) n.negate();
    const base = e0.clone().lerp(e1, (k + 0.5) / 6).addScaledVector(n, 1.6);
    const inward = n.clone().negate();
    const theta = Math.atan2(inward.x, inward.y);
    // 石台（逐级跌落）
    const ph = PED + (5 - k) * 0.05;
    const ped = new THREE.Mesh(new THREE.BoxGeometry(1.4, ph, 1.4), pedMat); ped.position.set(base.x, ph / 2, base.y); ped.rotation.y = theta;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.14, 1.62), pedMat); cap.position.set(base.x, ph + 0.07, base.y); cap.rotation.y = theta;
    ped.castShadow = cap.castShadow = ped.receiveShadow = true; pedestals.add(ped, cap);
    let body;
    if (zBody) { body = new THREE.Group(); const bm = new THREE.Mesh(zBody.geometry, stone); bm.castShadow = bm.receiveShadow = true; body.add(bm); }
    else body = buildBody(stone);
    body.position.set(base.x, ph + 0.14, base.y); body.rotation.y = theta; body.scale.setScalar(SCALE);
    bodies.add(body);
    // 兽首（独立对象，便于“流散”动画）
    const mat = makeBronze();
    const head = new THREE.Group(); let mouth;
    const src = zg && zg.getObjectByName('head_' + ZODIAC[idx].k);
    if (src) {
      const hm = new THREE.Mesh(src.geometry, mat); hm.castShadow = true; head.add(hm);
      const mo = src.getObjectByName('mouth_' + ZODIAC[idx].k); mouth = mo ? mo.position.clone() : new THREE.Vector3(0, 0.2, 0.42);
    } else mouth = new THREE.Vector3(...HEADS[ZODIAC[idx].k](head, mat));
    head.position.set(base.x, ph + 0.14 + (src ? 1.27 : 1.3) * SCALE, base.y); head.rotation.y = theta; head.scale.setScalar(SCALE);
    head.updateMatrixWorld(true);
    const mouthW = head.localToWorld(mouth.clone());
    const land = new THREE.Vector3(base.x + inward.x * 4.6, 0.3, base.y + inward.y * 4.6);
    // 标签
    const lz = document.createElement('div'); lz.className = 'lab zod'; lz.innerHTML = `<b>${ZODIAC[idx].z}</b>${ZODIAC[idx].a}`;
    const oz = new CSS2DObject(lz); oz.position.set(0, 1.05, 0); head.add(oz);
    const ls = document.createElement('div'); ls.className = `lab sta ${STATUS[idx].s}`;
    ls.innerHTML = `<b>${ZODIAC[idx].a}首</b><i>${STATUS[idx].s === 'back' ? '已回归' : STATUS[idx].s === 'doubt' ? '存疑' : '下落不明'}</i><small>${STATUS[idx].n}</small>`;
    const os = new CSS2DObject(ls); os.position.set(0, -0.35, 0); head.add(os);
    scene.add(head);
    statues[idx] = { idx, head, mat, mouthW, land, homePos: head.position.clone(), homeQuat: head.quaternion.clone(), base: new THREE.Vector3(base.x, 0, base.y), labZ: lz, labS: ls, status: STATUS[idx].s };
  }
  scene.add(bodies, pedestals);
  return { statues, bodies, pedestals, stone };
}
