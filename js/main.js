import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { U, ENV, patchStone } from './materials.js';
import { buildHall, hallFromGLB, buildReservoir, buildDashuifa, buildGround, buildRubble } from './architecture.js';
import { buildZodiac, ZODIAC } from './zodiac.js';
import { buildWater, makeWaterMaterial } from './water.js';
import { buildSky, buildDust, buildAsh, buildShafts, buildPipes, buildDial } from './fx.js';
import { createPost } from './post.js';
import { SLIDES, BASE, NUMERALS } from './slides.js';

const qs = new URLSearchParams(location.search);
// 画质档位：?q=low（1x、无 MSAA/景深/阴影）· 默认 high（≤2x、MSAA×4）· ?q=ultra（≤3x、4K 阴影）
const QUALITY = ['low', 'ultra'].includes(qs.get('q')) ? qs.get('q') : 'high';
const LOW = QUALITY === 'low', ULTRA = QUALITY === 'ultra';
const DPR = window.devicePixelRatio || 1;
const PR_MAX = LOW ? 1 : Math.min(DPR, ULTRA ? 3 : 2);
const PR_MIN = Math.min(PR_MAX, 1);
// 自适应：帧率过低时逐级降低像素比（最低 1x），恢复后再升回；自动化测试或 ?fixed 时锁定
const ADAPT = !navigator.webdriver && !qs.has('fixed') && !LOW;
const loaderBar = document.querySelector('#loader i');
const setLoad = f => { if (loaderBar) loaderBar.style.width = (f * 100).toFixed(0) + '%'; };

// ---------------- 渲染器 ----------------
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
let PR = PR_MAX;
renderer.setPixelRatio(PR); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = !LOW; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);
const labels = new CSS2DRenderer(); labels.setSize(innerWidth, innerHeight); labels.domElement.className = 'labels'; app.appendChild(labels.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.3, 2400);
scene.fog = new THREE.FogExp2(0xcbb8a0, 0.0045);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

// ---------------- 灯光 ----------------
const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x6b5a44, 0.7); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.6); sun.castShadow = true;
sun.shadow.mapSize.set(ULTRA ? 4096 : 2048, ULTRA ? 4096 : 2048); Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 50, bottom: -50, near: 1, far: 260 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
const fireLights = [[4, 6, -10], [6, 10, 6], [24, 9, 0]].map(p => { const l = new THREE.PointLight(0xff6a22, 0, 0, 2); l.position.set(...p); scene.add(l); return l; });

// ---------------- 场景构建 ----------------
const sky = buildSky(); scene.add(sky); setLoad(0.1);
scene.add(buildGround());
// Blender 导出的高精度模型（Draco 压缩 GLB）；加载失败时回退到程序化几何
const draco = new DRACOLoader().setDecoderPath('vendor/draco/'); draco.setDecoderConfig({ type: 'wasm' });
const gl = new GLTFLoader().setDRACOLoader(draco);
const loadGLB = url => gl.loadAsync(url).catch(e => { console.warn('GLB 加载失败，使用程序化回退：', url, e && e.message); return null; });
const [hallGLB, zodGLB] = await Promise.all([loadGLB('models/hall.glb'), loadGLB('models/zodiac.glb')]);
const hall = hallGLB && !qs.has('procedural') ? hallFromGLB(hallGLB) : buildHall(); scene.add(hall.group); setLoad(0.3);
const res = buildReservoir(); scene.add(res.group);
const tinWater = new THREE.Mesh(new THREE.PlaneGeometry(13.9, 4.85).rotateX(-Math.PI / 2), makeWaterMaterial({ deep: 0x2a3036, shallow: 0x8a9298, metal: 0.6 }));
tinWater.position.set(23.8, 13.2, 0); scene.add(tinWater);
const ruinStone = patchStone(new THREE.MeshStandardMaterial({ color: 0xc9c0ae, roughness: 0.85 }), { vein: 1 });
const dsf = buildDashuifa(ruinStone); scene.add(dsf.mesh);
const rubble = buildRubble(ruinStone); scene.add(rubble); setLoad(0.45);
const zod = buildZodiac(scene, qs.has('procedural') ? null : zodGLB && zodGLB.scene); setLoad(0.6);
const rimStone = patchStone(new THREE.MeshStandardMaterial({ color: 0xd6cfbf, roughness: 0.7 }), { vein: 1 });
const water = buildWater(scene, zod.statues, rimStone, { noShell: !!hallGLB && !qs.has('procedural') });
const dust = buildDust(LOW ? 1500 : 3500); scene.add(dust);
const ash = buildAsh(LOW ? 4000 : 9000); scene.add(ash);
const shafts = buildShafts(); scene.add(shafts);
const pipes = buildPipes(zod.statues); scene.add(pipes);
const dial = buildDial(); scene.add(dial.group); setLoad(0.8);
// 地点标签
const placeLabel = (txt, cls, pos) => { const el = document.createElement('div'); el.className = 'lab place ' + cls; el.innerHTML = txt; const o = new CSS2DObject(el); o.position.copy(pos); scene.add(o); };
placeLabel('锡海<small>蓄水楼顶 · 锡板防渗水池</small>', 'xihai', res.tinCenter.clone().add(new THREE.Vector3(0, 2.2, 0)));
placeLabel('大水法遗址<small>海晏堂以东</small>', 'dsf', dsf.anchor);

const post = createPost(renderer, scene, camera, LOW, PR, LOW ? 0 : 4, [water.jets, water.splash, dust, ash, shafts, pipes]);

// ---------------- 参数系统（每页目标值，逐帧阻尼插值） ----------------
const P = structuredClone(BASE); let TGT = structuredClone(BASE);
const RATE = { dissolve: 0.33, ghost: 0.8, diaspora: 0.9, bodies: 1.2 };
function stepParams(dt) {
  for (const k in TGT) {
    const k2 = 1 - Math.exp(-dt * (RATE[k] || 1.6));
    if (Array.isArray(TGT[k])) for (let i = 0; i < TGT[k].length; i++) P[k][i] += (TGT[k][i] - P[k][i]) * k2;
    else P[k] += (TGT[k] - P[k]) * k2;
  }
}
const sunDir = new THREE.Vector3();
const tmpV = new THREE.Vector3(), tmpC = new THREE.Color();
function applyParams(time) {
  renderer.toneMappingExposure = P.exposure;
  post.bokeh.uniforms.aperture.value = P.aperture * 0.7; post.bokeh.uniforms.maxblur.value = P.maxblur * 0.65; // 景深收敛：只柔化远景，主体保持锐利
  post.bokeh.uniforms.focus.value = camera.position.distanceTo(camT);
  const F = post.fin.uniforms; F.uTime.value = time; F.uGrain.value = P.grain * 0.6; F.uCA.value = P.ca * 0.45; F.uVig.value = P.vig;
  sunDir.set(Math.cos(P.sunEl) * Math.cos(P.sunAz), Math.sin(P.sunEl), Math.cos(P.sunEl) * Math.sin(P.sunAz)).normalize();
  ENV.uSunDir.value.copy(sunDir); ENV.uSkyTop.value.setRGB(...P.skyTop); ENV.uSkyHor.value.setRGB(...P.skyHor); ENV.uSunCol.value.setRGB(...P.sunCol);
  ENV.uStars.value = P.stars; ENV.uFire.value = P.fire;
  sun.position.copy(sunDir).multiplyScalar(120); sun.color.setRGB(...P.sunCol); sun.intensity = P.sunI;
  hemi.intensity = P.hemi; hemi.color.setRGB(...P.skyTop).lerp(tmpC.setRGB(...P.skyHor), 0.5); hemi.groundColor.setRGB(0.35, 0.3, 0.24).multiplyScalar(0.6 + P.fire * 0.8);
  scene.fog.color.setRGB(...P.skyHor).multiplyScalar(0.85); scene.fog.density = P.fog;
  // 屏幕空间上帝光：太阳投影位置
  tmpV.copy(camera.position).addScaledVector(sunDir, 500).project(camera);
  const onScreen = tmpV.z < 1 && Math.abs(tmpV.x) < 1.6 && Math.abs(tmpV.y) < 1.6;
  F.uSun.value.set(tmpV.x * 0.5 + 0.5, tmpV.y * 0.5 + 0.5); F.uGod.value = onScreen ? P.god : 0; F.uGodCol.value.setRGB(...P.sunCol);
  U.uDissolve.value = P.dissolve < 0.004 ? 0 : P.dissolve; U.uGhost.value = P.ghost < 0.004 ? 0 : P.ghost; U.uRim.value = P.rim; U.uWindow.value = P.window;
  U.uEdgeCol.value.setRGB(...P.edgeCol); U.uRimCol.value.setRGB(...P.rimCol);
  dust.material.uniforms.uI.value = P.dust; dust.material.uniforms.uCol.value.setRGB(...P.dustCol); dust.material.uniforms.uRise.value = P.dustRise;
  ash.material.uniforms.uI.value = P.ash; ash.visible = P.ash > 0.01;
  shafts.userData.mat.uniforms.uI.value = P.shafts; shafts.userData.mat.uniforms.uCol.value.setRGB(...P.sunCol); shafts.visible = P.shafts > 0.01; shafts.userData.update(sunDir);
  pipes.userData.mat.uniforms.uI.value = P.pipe; pipes.visible = P.pipe > 0.01;
  dial.group.visible = P.dial > 0.01; dial.group.scale.setScalar(Math.max(0.001, P.dial)); dial.group.rotation.y = 0;
  const fl = P.fire; fireLights.forEach((l, i) => l.intensity = fl * 260 * (0.7 + 0.3 * Math.sin(time * 9 + i * 2) * Math.sin(time * 5.3 + i)));
  rubble.visible = P.rubble > 0.02; rubble.scale.set(1, Math.max(0.01, P.rubble), 1);
  zod.bodies.visible = P.bodies > 0.03; zod.bodies.children.forEach(b => b.scale.setScalar(1.1 * Math.max(0.01, P.bodies)));
  for (const m of [water.jets.material, water.splash.material, ash.material, dust.material]) if (m.uniforms.uPR) m.uniforms.uPR.value = PR * innerHeight / 900;
  water.water.material.uniforms.uDeep.value.setHex(0x05222a).lerp(tmpC.setRGB(0.12, 0.02, 0.0), P.fire);
}

// ---------------- 兽首：喷水 / 发光 / 流散 ----------------
const glow = new Array(12).fill(0);
const ringC = new THREE.Vector3(-13, 11.5, 4.5), Yax = new THREE.Vector3(0, 1, 0);
const qFace = new THREE.Quaternion().setFromAxisAngle(Yax, -Math.PI / 2);
function updateHeads(time, dt) {
  zod.statues.forEach((s, i) => {
    const active = water.state.active[i];
    glow[i] += ((active ? 1 : 0) - glow[i]) * (1 - Math.exp(-dt * 3));
    const st = s.status, sp = P.status;
    const u = s.mat.userData.u;
    let g = glow[i], col = [1.0, 0.75, 0.4], op = 1;
    if (sp > 0.02) {
      if (st === 'back') { g = Math.max(g, 0.55 * sp); col = [1.0, 0.72, 0.35]; }
      else if (st === 'doubt') { g = Math.max(g, sp * (0.25 + 0.2 * Math.sin(time * 2.3))); col = [0.8, 0.6, 1.0]; op = 1 - 0.35 * sp; }
      else { g = Math.max(g, 0.25 * sp); col = [0.3, 0.75, 1.3]; op = 1 - 0.7 * sp; }
    }
    u.uGlow.value = g * 1.4; u.uGlowCol.value.setRGB(...col); s.mat.opacity = op;
    s.mat.wireframe = st === 'lost' && sp > 0.5; s.mat.depthWrite = op > 0.9;
    // 流散：离开石身，悬浮成环
    const k = P.diaspora; const a = i / 12 * Math.PI * 2 + time * 0.06;
    const ringP = tmpV.set(ringC.x, ringC.y + Math.cos(a) * 7.2, ringC.z + Math.sin(a) * 7.2);
    const lift = Math.sin(k * Math.PI) * 6;
    s.head.position.lerpVectors(s.homePos, ringP, k).add(new THREE.Vector3((Math.sin(i * 7.1) * 6) * Math.sin(k * Math.PI), lift, 0));
    const spin = new THREE.Quaternion().setFromAxisAngle(Yax, Math.sin(time * 0.5 + i) * 0.35 * k);
    s.head.quaternion.slerpQuaternions(s.homeQuat, qFace, k).multiply(spin);
    s.head.scale.setScalar(1.1 * (1 + k * 0.5));
    s.labZ.classList.toggle('on', active);
  });
}

// ---------------- 喷水调度（时辰） ----------------
let clockT0 = 0, clockIdx = -1;
const dynEl = () => document.getElementById('dyn');
function scheduleJets(time) {
  const mode = SLIDES[cur].mode; const want = new Array(13).fill(false);
  if (mode === 'cycle') { want[Math.floor(time / 3.4) % 12] = true; want[12] = true; }
  else if (mode === 'clock') {
    const k = Math.floor((time - clockT0) / 2.6) % 12; want[k] = true;
    if (k !== clockIdx) { clockIdx = k; const z = ZODIAC[k]; const el = dynEl(); if (el) el.innerHTML = `<span class="big">${z.z}时</span><span>${z.t}</span><span class="an">${z.a}首喷水</span>`; }
    dial.segs.forEach((m, j) => { m.material.emissive.setRGB(j === k ? 1.6 : 0.02, j === k ? 0.9 : 0.04, j === k ? 0.35 : 0.08); });
    dial.labels.forEach((el, j) => el.classList.toggle('on', j === k));
    const ta = dial.angleOf(k) - Math.PI / 2; let cy = dial.hand.rotation.y; let d = ta - cy; d = Math.atan2(Math.sin(d), Math.cos(d)); dial.hand.rotation.y = cy + d * 0.12;
  } else if (mode === 'all') { want.fill(true); }
  for (let i = 0; i < 13; i++) water.set(i, want[i], time);
}

// ---------------- 镜头 ----------------
let cur = 0; let trans = null;
const camP = new THREE.Vector3(...SLIDES[0].cam.p), camT = new THREE.Vector3(...SLIDES[0].cam.t); let camFov = SLIDES[0].cam.fov;
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function updateCamera(time) {
  if (trans) {
    const t = Math.min(1, (time - trans.t0) / trans.dur); const e = ease(t);
    const a = trans.fp, b = trans.tp, m = trans.mp;
    camP.set(0, 0, 0).addScaledVector(a, (1 - e) * (1 - e)).addScaledVector(m, 2 * (1 - e) * e).addScaledVector(b, e * e);
    camT.lerpVectors(trans.ft, trans.tt, ease(Math.min(1, t * 1.15)));
    camFov = THREE.MathUtils.lerp(trans.ff, trans.tf, e);
    if (t >= 1) trans = null;
  }
  const off = tmpV.copy(camP).sub(camT); off.applyAxisAngle(Yax, Math.sin(time * 0.07) * 0.045);
  camera.position.copy(camT).add(off); camera.position.y += Math.sin(time * 0.13) * 0.25;
  camera.fov = camFov; camera.updateProjectionMatrix(); camera.lookAt(camT);
}

// ---------------- 文字层 ----------------
const panel = document.getElementById('panel'), chapter = document.getElementById('chapter'), dots = document.getElementById('dots');
SLIDES.forEach((s, i) => { const b = document.createElement('button'); b.title = s.title; b.setAttribute('aria-label', `第 ${i + 1} 页：${s.title}`); b.onclick = e => { e.stopPropagation(); go(i); }; dots.appendChild(b); });
let panelTimer = 0;
function renderPanel(i) {
  const s = SLIDES[i]; let n = 0; const L = (html, cls = '') => `<div class="ln ${cls}" style="--d:${(n++) * 0.09 + 0.1}s">${html}</div>`;
  let h = L(`<span class="idx">${String(i + 1).padStart(2, '0')} / ${SLIDES.length}</span>${s.kicker}`, 'kicker');
  h += L(s.title, i === 0 ? 'title hero' : 'title'); h += L(s.sub, 'sub'); h += L('', 'rule');
  (s.body || []).forEach(t => h += L(t, 'body'));
  if (s.list) h += L('<ul>' + s.list.map(t => `<li>${t}</li>`).join('') + '</ul>', 'list');
  if (s.dyn) h += L('<div id="dyn"></div>', 'dynw');
  if (s.sources) h += L('资料来源：故宫博物院 · 北京市文物局 · 中新网 · 澎湃新闻 · 维基百科（详见 README）', 'src');
  panel.classList.remove('show'); clearTimeout(panelTimer);
  panelTimer = setTimeout(() => { panel.innerHTML = h; panel.className = 'p' + i; void panel.offsetWidth; panel.classList.add('show'); clockIdx = -1; }, 380);
  chapter.textContent = NUMERALS[i];
  [...dots.children].forEach((b, j) => b.classList.toggle('on', j === i));
  const ls = s.labels || []; for (const k of ['zodiac', 'dial', 'status', 'xihai', 'dsf']) document.body.classList.toggle('L-' + k, ls.includes(k));
}
function go(i, instant = false) {
  i = Math.max(0, Math.min(SLIDES.length - 1, i)); const s = SLIDES[i];
  const prev = cur; cur = i; TGT = Object.assign(structuredClone(BASE), structuredClone(s.fx || {}));
  if (s.mode === 'clock') { clockT0 = clock.getElapsedTime(); clockIdx = -1; }
  const tp = new THREE.Vector3(...s.cam.p), tt = new THREE.Vector3(...s.cam.t);
  if (instant) { Object.assign(P, structuredClone(TGT)); camP.copy(tp); camT.copy(tt); camFov = s.cam.fov; trans = null; }
  else {
    const mp = camP.clone().add(tp).multiplyScalar(0.5); mp.y += camP.distanceTo(tp) * 0.22 + 4;
    trans = { fp: camP.clone(), tp, mp, ft: camT.clone(), tt, ff: camFov, tf: s.cam.fov, t0: clock.getElapsedTime(), dur: prev === i ? 0.01 : 3.0 };
  }
  renderPanel(i);
  history.replaceState(null, '', '#' + (i + 1));
}
window.addEventListener('keydown', e => {
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(cur + 1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(cur - 1); }
  else if (e.key === 'Home') go(0); else if (e.key === 'End') go(SLIDES.length - 1);
  else if (/^[0-9]$/.test(e.key)) go(e.key === '0' ? 9 : +e.key - 1);
  else if (e.key === 'f' || e.key === 'F') { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); }
});
renderer.domElement.addEventListener('click', e => { go(e.clientX > innerWidth * 0.5 ? cur + 1 : cur - 1); });
let tx = null; window.addEventListener('touchstart', e => tx = e.touches[0].clientX, { passive: true });
window.addEventListener('touchend', e => { if (tx == null) return; const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) go(cur + (d < 0 ? 1 : -1)); tx = null; });
function resize() {
  renderer.setPixelRatio(PR); renderer.setSize(innerWidth, innerHeight); labels.setSize(innerWidth, innerHeight);
  post.composer.setPixelRatio(PR); post.composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  post.fin.uniforms.uRes.value.set(innerWidth * PR, innerHeight * PR); // 设备像素分辨率：颗粒/锐化按物理像素计算
}
window.addEventListener('resize', resize); resize();
let adT = 0, adN = 0, adCool = 0;
function adapt(dt) {
  if (!ADAPT) return;
  adT += dt; adN++; adCool -= dt;
  if (adT < 2) return;
  const avg = adT / adN; adT = 0; adN = 0;
  if (adCool > 0) return;
  if (avg > 1 / 28 && PR > PR_MIN) { PR = Math.max(PR_MIN, Math.round((PR - 0.25) * 4) / 4); resize(); adCool = 2; }
  else if (avg < 1 / 55 && PR < PR_MAX) { PR = Math.min(PR_MAX, PR + 0.25); resize(); adCool = 6; }
}

// ---------------- 主循环 ----------------
const clock = new THREE.Clock();
const startIdx = qs.has('slide') ? (+qs.get('slide') - 1) : (location.hash ? (+location.hash.slice(1) - 1) : 0);
go(isNaN(startIdx) ? 0 : startIdx, true);
if (qs.has('slide')) { /* 截图模式：直接到位 */ }
let last = 0, frames = 0;
function frame() {
  const time = clock.getElapsedTime(); const dt = Math.min(0.1, time - last); last = time;
  U.uTime.value = time;
  stepParams(dt); updateCamera(time); applyParams(time);
  scheduleJets(time); water.update(dt); updateHeads(time, dt);
  res.wheel.rotation.x = 0; res.wheel.children[0].rotation.z = time * 0.4;
  sky.position.copy(camera.position);
  post.composer.render(dt); adapt(dt);
  labels.render(scene, camera);
  if (++frames === 2) { document.getElementById('loader')?.classList.add('done'); window.__hyt.ready = true; }
  requestAnimationFrame(frame);
}
window.__hyt = { quality: () => ({ QUALITY, PR, PR_MAX, DPR, buffer: [renderer.domElement.width, renderer.domElement.height] }), go, ready: false, get cur() { return cur; }, warp(t) { Object.assign(P, structuredClone(TGT)); } };
setLoad(1);
requestAnimationFrame(frame);
