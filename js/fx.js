import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { NOISE } from './noise.js';
import { ENV, U } from './materials.js';
import { ZODIAC } from './zodiac.js';
import { HALL } from './architecture.js';

// ---------- 程序化天空：渐变 + 太阳光晕 + fbm 云 + 星空 ----------
export function buildSky() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: ENV,
    vertexShader: `varying vec3 vDir; void main(){ vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uSkyTop,uSkyHor,uSunDir,uSunCol; uniform float uTime,uStars,uFire; varying vec3 vDir; ${NOISE}
void main(){ vec3 d=normalize(vDir); float h=d.y;
  vec3 col=mix(uSkyHor,uSkyTop,pow(clamp(h,0.0,1.0),0.5));
  col=mix(col,uSkyHor*0.55,(1.0-smoothstep(-0.25,0.0,h)));
  float s=max(dot(d,normalize(uSunDir)),0.0);
  col+=uSunCol*(pow(s,900.0)*18.0+pow(s,14.0)*0.35+pow(s,3.0)*0.12);
  if(h>-0.02){ vec2 cp=d.xz/(h+0.22)*1.4; float c=fbm3(vec3(cp+vec2(uTime*0.006,0.0),uTime*0.01)); c=smoothstep(0.0,0.65,c);
    vec3 cc=mix(uSkyHor*1.05,uSunCol*0.9+uSkyHor*0.3,pow(s,4.0)); col=mix(col,cc,c*0.5*smoothstep(-0.02,0.25,h)); }
  float st=pow(max(snoise(d*260.0),0.0),16.0)*uStars*smoothstep(0.0,0.3,h); col+=st*4.0;
  col+=vec3(0.6,0.12,0.02)*uFire*(1.0-smoothstep(0.0,0.35,h))*0.6;
  gl_FragColor=vec4(col,1.0); }`
  }));
  m.frustumCulled = false; m.renderOrder = -10; return m;
}

const dummyGeo = (n, attrs) => {
  const g = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos[i * 3 + 1] = -500;
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  for (const k in attrs) g.setAttribute(k, new THREE.BufferAttribute(attrs[k].data, attrs[k].size));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4); return g;
};
const rand3 = n => { const a = new Float32Array(n * 3); for (let i = 0; i < a.length; i++) a[i] = Math.random(); return a; };
const SOFT_FRAG = `uniform vec3 uCol; uniform float uI; varying float vA; varying vec3 vC;
void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); if(d>0.5) discard; float a=(1.0-smoothstep(0.0,0.5,d)); gl_FragColor=vec4(vC*uCol, a*a*vA*uI); }`;

// ---------- 漂浮尘埃：curl-noise 流场 ----------
export function buildDust(n) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: U.uTime, uPR: { value: 1 }, uI: { value: 0.6 }, uCol: { value: new THREE.Color(1.0, 0.85, 0.6) }, uRise: { value: 0.25 },
      uBoxMin: { value: new THREE.Vector3(-70, 0, -50) }, uBoxSize: { value: new THREE.Vector3(120, 32, 100) } },
    vertexShader: `uniform float uTime,uPR,uRise; uniform vec3 uBoxMin,uBoxSize; attribute vec3 aRand; varying float vA; varying vec3 vC; ${NOISE}
void main(){ vec3 b=uBoxMin+aRand*uBoxSize;
  float fy=fract(aRand.y+uTime*uRise*(0.4+aRand.x)/uBoxSize.y); b.y=uBoxMin.y+fy*uBoxSize.y;
  vec3 p=b+curlNoise(b*0.045+vec3(0.0,0.0,uTime*0.04))*2.6;
  vec4 mv=viewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
  gl_PointSize=uPR*(0.6+aRand.z*1.6)*(28.0/-mv.z);
  vA=smoothstep(0.0,0.1,fy)*(1.0-smoothstep(0.8,1.0,fy))*(0.45+0.55*sin(uTime*1.3+aRand.x*40.0)); vC=vec3(1.0)+vec3(0.6,0.2,-0.2)*aRand.z; }`,
    fragmentShader: SOFT_FRAG
  });
  const p = new THREE.Points(dummyGeo(n, { aRand: { data: rand3(n), size: 3 } }), mat); p.frustumCulled = false; return p;
}

// ---------- 焚毁：余烬 / 灰烬（从溶解边界升起） ----------
export function buildAsh(n) {
  const base = new Float32Array(n * 3); const { W, D } = HALL;
  for (let i = 0; i < n; i++) {
    const r = Math.random(); let x, y, z;
    if (r < 0.35) { x = -0.4; y = 1 + Math.random() * 12.5; z = (Math.random() - 0.5) * W; }
    else if (r < 0.7) { x = 0.8 + Math.random() * (D - 1.6); z = (Math.random() - 0.5) * (W - 3); y = 13.8 + (1 - Math.abs(x - D / 2) / (D / 2 - 0.8)) * 5.6; }
    else if (r < 0.82) { x = Math.random() * D; y = 1 + Math.random() * 12; z = (Math.random() < 0.5 ? -1 : 1) * (W / 2 + 0.2); }
    else { x = 16 + Math.random() * 16; y = 2 + Math.random() * 11; z = (Math.random() - 0.5) * 26; }
    base[i * 3] = x; base[i * 3 + 1] = y; base[i * 3 + 2] = z;
  }
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: U.uTime, uDissolve: U.uDissolve, uPR: { value: 1 }, uI: { value: 0 }, uCol: { value: new THREE.Color(1, 1, 1) } },
    vertexShader: `uniform float uTime,uPR,uDissolve; attribute vec3 aBase; attribute vec3 aRand; varying float vA; varying vec3 vC; ${NOISE}
void main(){ float n=dissolveField(aBase); float burning=step(n,uDissolve+0.07);
  float life=3.0+aRand.x*4.0; float age=fract(uTime/life+aRand.y); float t=age*life;
  vec3 p=aBase+vec3(t*0.7,t*(1.0+aRand.z*2.6),0.0)+curlNoise(aBase*0.07+vec3(0.0,t*0.12,uTime*0.05))*t*0.8;
  vec4 mv=viewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
  vA=burning*smoothstep(0.0,0.04,age)*(1.0-age)*0.55;
  float hot=1.0-smoothstep(0.05,0.55,age);
  vC=mix(vec3(0.22,0.2,0.19),vec3(2.4,0.75,0.16),hot);
  gl_PointSize=uPR*(0.7+aRand.z*1.8+hot*2.0)*(30.0/-mv.z);
  if(vA<0.002) gl_Position=vec4(2.0,2.0,2.0,1.0); }`,
    fragmentShader: SOFT_FRAG
  });
  const p = new THREE.Points(dummyGeo(n, { aBase: { data: base, size: 3 }, aRand: { data: rand3(n), size: 3 } }), mat); p.frustumCulled = false; return p;
}

// ---------- 体积光柱（几何光锥 + 噪声条纹 + Fresnel 衰减） ----------
export function buildShafts() {
  const g = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: U.uTime, uI: { value: 0.3 }, uCol: { value: new THREE.Color(1, 0.85, 0.6) } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime,uI; uniform vec3 uCol; varying vec2 vUv; varying vec3 vN; varying vec3 vW; ${NOISE}
void main(){ vec3 V=normalize(cameraPosition-vW); float edge=pow(clamp(abs(dot(normalize(vN),V)),0.0,1.0),3.0);
  float st=0.55+0.45*snoise(vec3(vUv.x*10.0,vUv.y*3.0-uTime*0.06,uTime*0.04));
  float fade=smoothstep(0.0,0.3,vUv.y)*(1.0-smoothstep(0.55,1.0,vUv.y));
  gl_FragColor=vec4(uCol*edge*st*fade*uI*0.35,1.0); }`
  });
  const anchors = [[-12, 0, 6], [-10, 0, -7], [-2, 0, -15], [-22, 0, 9], [-4, 0, 14], [-30, 0, -4], [-18, 0, -12]];
  const shafts = anchors.map((a, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.2 + i % 3 * 0.6, 3.5 + (i % 2) * 2, 80, 28, 1, true), mat); m.userData.anchor = new THREE.Vector3(...a); g.add(m); return m; });
  const Yv = new THREE.Vector3(0, 1, 0);
  g.userData.update = (sunDir) => { const q = new THREE.Quaternion().setFromUnitVectors(Yv, sunDir); for (const m of shafts) { m.quaternion.copy(q); m.position.copy(m.userData.anchor).addScaledVector(sunDir, 40); } };
  g.userData.mat = mat; return g;
}

// ---------- 供水管网（X 光式流动光脉冲） ----------
export function buildPipes(statues) {
  const geos = [];
  for (const s of statues) {
    const side = Math.sign(s.base.z);
    const pts = [[23.8, 12.6, 0], [18, 11.5, 0], [15, 6, side * 0.5], [14, 0.2, side * 1], [6, -1.2, side * 1.5], [-3, -1.2, side * 2.2],
      [s.base.x + 1.5, -1.2, s.base.z * 0.9], [s.base.x, -1.0, s.base.z], [s.base.x, 0.6, s.base.z], [s.mouthW.x, s.mouthW.y, s.mouthW.z]].map(a => new THREE.Vector3(...a));
    geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3), 160, 0.07, 6, false));
  }
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: U.uTime, uI: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime,uI; varying vec2 vUv;
void main(){ float f=fract(vUv.x*7.0-uTime*0.55); float pulse=smoothstep(0.0,0.06,f)*(1.0-smoothstep(0.06,0.32,f));
 vec3 c=vec3(0.25,0.75,1.0)*(0.18+pulse*2.2); gl_FragColor=vec4(c*uI,1.0); }`
  });
  const group = new THREE.Group(); for (const g of geos) group.add(new THREE.Mesh(g, mat));
  group.renderOrder = 5; group.userData.mat = mat; return group;
}

// ---------- 十二时辰透射玻璃盘（MeshPhysicalMaterial transmission） ----------
export function buildDial() {
  const group = new THREE.Group(); group.position.set(-14.5, 6.2, 0);
  const segs = [], labels = [];
  const R = 4.6, r = 3.3;
  for (let k = 0; k < 12; k++) {
    const a0 = (k * 30 + 2) * Math.PI / 180 - Math.PI / 2 - Math.PI / 12, a1 = ((k + 1) * 30 - 2) * Math.PI / 180 - Math.PI / 2 - Math.PI / 12;
    const s = new THREE.Shape(); s.moveTo(R * Math.cos(a0), R * Math.sin(a0)); s.absarc(0, 0, R, a0, a1, false); s.lineTo(r * Math.cos(a1), r * Math.sin(a1)); s.absarc(0, 0, r, a1, a0, true);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 12 }).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xd8ecff, transmission: 1, thickness: 0.6, roughness: 0.07, ior: 1.42, metalness: 0, emissive: 0x000000, iridescence: 0.6, iridescenceIOR: 1.3, envMapIntensity: 1.5 });
    const m = new THREE.Mesh(geo, mat); group.add(m); segs.push(m);
    const am = (a0 + a1) / 2; const el = document.createElement('div'); el.className = 'lab dl'; el.innerHTML = `<b>${ZODIAC[k].z}</b><small>${ZODIAC[k].t.replace(/:00/g, '')}</small>`;
    const o = new CSS2DObject(el); o.position.set(Math.cos(am) * (R + 0.9), 0.2, -Math.sin(am) * (R + 0.9)); group.add(o); labels.push(el);
  }
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, R - 0.2).translate(0, 0.2, -(R - 0.2) / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2, 1) }));
  group.add(hand);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 3), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, thickness: 1.2, roughness: 0, ior: 1.6 }));
  core.position.y = 0.3; group.add(core);
  return { group, segs, labels, hand, angleOf: k => ((k * 30 + 15) * Math.PI / 180 - Math.PI / 2 - Math.PI / 12) };
}
