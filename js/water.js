import * as THREE from 'three';
import { NOISE } from './noise.js';
import { ENV, patchStone } from './materials.js';

export const WATER_Y = 0.3, G = 5.4, NJ = 13;
export const CENTER = new THREE.Vector3(-15, 2.4, 0);

function poolShape() {
  const s = new THREE.Shape(); s.moveTo(-4.5, -2.0); s.lineTo(-22, -11.5); s.quadraticCurveTo(-28.5, 0, -22, 11.5);
  s.lineTo(-4.5, 2.0); s.quadraticCurveTo(-3.3, 0, -4.5, -2.0); return s;
}
function offset(pts, d) {
  const c = new THREE.Vector2(); pts.forEach(p => c.add(p)); c.multiplyScalar(1 / pts.length); const n = pts.length;
  return pts.map((p, i) => { const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n]; const t = b.clone().sub(a).normalize();
    const nr = new THREE.Vector2(t.y, -t.x); if (nr.dot(p.clone().sub(c)) < 0) nr.negate(); return p.clone().addScaledVector(nr, d); });
}

export function makeWaterMaterial(opts = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: Object.assign({}, ENV, {
      uL: { value: Array.from({ length: NJ }, () => new THREE.Vector3()) }, uRip: { value: new Array(NJ).fill(0) },
      uDeep: { value: new THREE.Color(opts.deep || 0x05222a) }, uShallow: { value: new THREE.Color(opts.shallow || 0x1d6a70) },
      uMetal: { value: opts.metal || 0 }
    }),
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime,uFire,uMetal; uniform vec3 uL[${NJ}]; uniform float uRip[${NJ}];
uniform vec3 uSkyTop,uSkyHor,uSunDir,uSunCol,uDeep,uShallow; varying vec3 vW;
${NOISE}
void main(){
  vec2 p=vW.xz; vec2 g=vec2(0.0); float crest=0.0;
  for(int i=0;i<${NJ};i++){ float I=uRip[i]; if(I<0.002) continue;
    vec2 dv=p-uL[i].xz; float d=length(dv)+1e-3; float ph=d*6.0-uTime*7.5; float env=exp(-d*0.42)*I;
    g+=(6.0*cos(ph)-0.42*sin(ph))*env*0.03*dv/d; crest+=max(sin(ph),0.0)*env; }
  float e=0.15; vec3 q=vec3(p*0.32,uTime*0.22);
  float n0=snoise(q); float nx=snoise(q+vec3(e,0.0,0.0)); float nz=snoise(q+vec3(0.0,e,0.0));
  g+=vec2(nx-n0,nz-n0)/e*0.05;
  vec3 N=normalize(vec3(-g.x,1.0,-g.y)); vec3 V=normalize(cameraPosition-vW);
  float fr=0.02+0.98*pow(clamp(1.0-dot(N,V),0.0,1.0),5.0);
  vec3 R=reflect(-V,N);
  vec3 sky=mix(uSkyHor,uSkyTop,clamp(R.y*1.3,0.0,1.0));
  float spec=pow(max(dot(R,normalize(uSunDir)),0.0),160.0);
  vec3 base=mix(uDeep,uShallow,0.35+0.3*n0);
  base=mix(base,vec3(0.55,0.58,0.62)*sky,uMetal);
  vec3 col=mix(base,sky,clamp(fr+uMetal*0.4,0.0,1.0))+uSunCol*spec*3.0+vec3(0.55,0.85,1.0)*crest*0.22;
  col+=vec3(1.0,0.32,0.06)*uFire*(0.25+0.9*fr);
  gl_FragColor=vec4(col,mix(0.74,0.97,fr));
}`
  });
}

export function buildWater(scene, statues, stoneMat, opts = {}) {
  const shape = poolShape(); const pts = shape.getSpacedPoints(220); pts.pop();
  // 池岸（带厚度的石砌岸）
  const outer = offset(pts, 1.0); const rimS = new THREE.Shape(outer); rimS.holes.push(new THREE.Path(pts));
  const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(rimS, { depth: 1.4, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1 }).rotateX(-Math.PI / 2).translate(0, -0.85, 0), stoneMat);
  rim.castShadow = rim.receiveShadow = true; scene.add(rim);
  // 池底焦散
  const floor = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24).rotateX(-Math.PI / 2).translate(0, -0.6, 0), new THREE.ShaderMaterial({
    uniforms: { uTime: ENV.uTime, uSunCol: ENV.uSunCol, uFire: ENV.uFire },
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime,uFire; uniform vec3 uSunCol; varying vec3 vW; ${NOISE}
void main(){ vec2 q=vW.xz*0.55; float c=pow(max(0.0,1.0-abs(snoise(vec3(q,uTime*0.35)))),7.0)+0.6*pow(max(0.0,1.0-abs(snoise(vec3(q*1.7+3.1,uTime*0.45)))),7.0);
 vec3 col=vec3(0.03,0.08,0.09)+c*vec3(0.22,0.45,0.45)*(0.3+uSunCol*0.5)+vec3(0.4,0.08,0.0)*uFire*c; gl_FragColor=vec4(col,1.0); }`
  }));
  scene.add(floor);
  const water = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24).rotateX(-Math.PI / 2).translate(0, WATER_Y, 0), makeWaterMaterial());
  water.receiveShadow = false; scene.add(water);

  // 中央喷水塔
  const fb = new THREE.Group();
  const lathe = (p, y) => { const m = new THREE.Mesh(new THREE.LatheGeometry(p.map(a => new THREE.Vector2(a[0], a[1])), 32), stoneMat); m.position.set(CENTER.x, y, CENTER.z); m.castShadow = true; fb.add(m); };
  lathe([[0, 0], [1.9, 0], [1.9, 0.55], [1.7, 0.6], [0.5, 0.6], [0, 0.6]], -0.4);
  lathe([[0, 0], [.35, 0], [.25, .5], [.3, .9], [1.3, 1.1], [1.35, 1.25], [1.1, 1.2], [.2, 1.25], [0, 1.25]], 0.2);
  lathe([[0, 0], [.18, 0], [.14, .5], [.7, .65], [.72, .75], [.15, .78], [.12, .95], [0, 1.0]], 1.4);
  scene.add(fb);
  // 池端石雕贝壳（番花）
  const shell = new THREE.Group();
  for (let i = 0; i < 11; i++) {
    const a = (-80 + i * 16) * Math.PI / 180;
    const r = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), stoneMat);
    r.scale.set(0.12, 1.15, 0.3); r.position.set(0, Math.cos(a) * 1.0, Math.sin(a) * 1.0); r.rotation.x = a; r.castShadow = true; shell.add(r);
  }
  const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 10), stoneMat); hinge.scale.set(0.6, 0.5, 1); shell.add(hinge);
  shell.position.set(-5.2, 0.5, 0); shell.rotation.y = 0; shell.scale.setScalar(1.25); if (!opts.noShell) scene.add(shell);

  // ---------------- 喷水粒子系统（GPU 解析轨迹） ----------------
  const O = [], Vv = [], L = [], T = [];
  statues.forEach((s, i) => { O[i] = s.mouthW.clone(); L[i] = s.land.clone(); T[i] = 1.4; });
  O[12] = CENTER.clone(); L[12] = new THREE.Vector3(CENTER.x, WATER_Y, CENTER.z); T[12] = 3.0;
  for (let i = 0; i < NJ; i++) Vv[i] = L[i].clone().sub(O[i]).divideScalar(T[i]).add(new THREE.Vector3(0, 0.5 * G * T[i], 0));
  const shared = {
    uTime: ENV.uTime, uG: { value: G }, uPR: { value: 1 },
    uO: { value: O }, uV: { value: Vv }, uT: { value: T }, uL: { value: L },
    uOn: { value: new Array(NJ).fill(1e9) }, uOff: { value: new Array(NJ).fill(1e9) }, uI: { value: 1 }
  };
  const PER = 760, CEN = 1600, total = PER * 12 + CEN;
  const mkGeo = (count, per, cen) => {
    const g = new THREE.BufferGeometry(); const pos = new Float32Array(count * 3), head = new Float32Array(count), seed = new Float32Array(count), rnd = new Float32Array(count * 3);
    let k = 0; for (let h = 0; h < NJ; h++) { const n = h === 12 ? cen : per; for (let j = 0; j < n; j++, k++) { pos[k * 3 + 1] = -500; head[k] = h; seed[k] = (j + Math.random() * 0.5) / n; rnd[k * 3] = Math.random(); rnd[k * 3 + 1] = Math.random(); rnd[k * 3 + 2] = Math.random(); } }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aHead', new THREE.BufferAttribute(head, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1)); g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4); return g;
  };
  const head = `uniform float uTime,uG,uPR,uI; uniform vec3 uO[${NJ}],uV[${NJ}],uL[${NJ}]; uniform float uT[${NJ}],uOn[${NJ}],uOff[${NJ}];
attribute float aHead,aSeed; attribute vec3 aRand; varying float vA; varying float vK;`;
  const jetMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({ uColor: { value: new THREE.Color(1.5, 1.9, 2.3) }, uSize: { value: 1.5 } }, shared),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `${head} uniform float uSize;
void main(){
  int h=int(aHead+0.5); float T=uT[h];
  float age=fract(uTime/T+aSeed); float t=age*T; float emit=uTime-t;
  float vis=step(uOn[h],emit)*step(emit,uOff[h]);
  vec3 r=aRand*2.0-1.0; vec3 v=uV[h];
  if(h==12){ vec2 rr=normalize(r.xz+1e-4)*(0.15+0.55*abs(r.y)); v.xz+=rr; v.y*=0.9+0.1*aRand.x; }
  else { v+=r*vec3(0.09,0.06,0.09); }
  vec3 p=uO[h]+v*t+vec3(0.0,-0.5*uG*t*t,0.0)+r*0.025*(1.0+t*2.0);
  vec4 mv=viewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
  if(vis*uI<0.5||p.y<0.28) gl_Position=vec4(2.0,2.0,2.0,1.0);
  gl_PointSize=uSize*uPR*(0.55+0.6*aRand.z)*(1.0-age*0.35)*(55.0/-mv.z);
  vA=1.0-age*0.45; vK=age;
}`,
    fragmentShader: `uniform vec3 uColor; varying float vA,vK;
void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); if(d>0.5) discard; float a=(1.0-smoothstep(0.0,0.5,d)); a*=a;
 gl_FragColor=vec4(uColor*(1.0+0.9*(1.0-vK)), a*vA*0.7); }`
  });
  const jets = new THREE.Points(mkGeo(total, PER, CEN), jetMat); jets.frustumCulled = false; scene.add(jets);

  const SPER = 260, SCEN = 700;
  const splashMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({ uColor: { value: new THREE.Color(1.1, 1.4, 1.7) }, uSize: { value: 1.0 } }, shared),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `${head} uniform float uSize;
void main(){
  int h=int(aHead+0.5); float P=0.75;
  float a=fract(uTime/P+aSeed); float t=a*P; float landT=uTime-t; float emitT=landT-uT[h];
  float vis=step(uOn[h],emitT)*step(emitT,uOff[h]);
  vec3 r=aRand*2.0-1.0; vec3 L=uL[h];
  if(h==12){ vec2 dir=normalize(r.xz+1e-4); L.xz+=dir*(0.4+abs(r.x)*1.6); }
  float big=step(0.85,aRand.y);
  vec3 v=vec3(r.x*0.9,0.8+abs(r.y)*2.4,r.z*0.9)*(1.0-big*0.6);
  vec3 p=L+v*t+vec3(0.0,-0.5*uG*1.5*t*t,0.0);
  vec4 mv=viewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
  if(vis*uI<0.5||p.y<0.25) gl_Position=vec4(2.0,2.0,2.0,1.0);
  gl_PointSize=uSize*uPR*(0.5+aRand.z*0.6+big*3.5)*(1.0-a*0.5)*(45.0/-mv.z);
  vA=(1.0-a)*(1.0-big*0.75); vK=a;
}`,
    fragmentShader: jetMat.fragmentShader
  });
  const splash = new THREE.Points(mkGeo(SPER * 12 + SCEN, SPER, SCEN), splashMat); splash.frustumCulled = false; scene.add(splash);

  water.material.uniforms.uL.value = L;
  const state = { active: new Array(NJ).fill(false), rip: new Array(NJ).fill(0) };
  return {
    water, jets, splash, shared, L, O, state,
    set(h, on, time) {
      if (on && !state.active[h]) { shared.uOn.value[h] = time; shared.uOff.value[h] = 1e9; }
      if (!on && state.active[h]) { shared.uOff.value[h] = time; }
      state.active[h] = on;
    },
    update(dt) {
      for (let i = 0; i < NJ; i++) { const tgt = state.active[i] ? 1 : 0; state.rip[i] += (tgt - state.rip[i]) * (1 - Math.exp(-dt * 1.3)); }
      water.material.uniforms.uRip.value = state.rip;
    }
  };
}
