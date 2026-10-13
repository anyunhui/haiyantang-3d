import * as THREE from 'three';
import { NOISE } from './noise.js';

// 全局共享 uniform —— 所有建筑材质通过 onBeforeCompile 引用同一对象
export const U = {
  uTime: { value: 0 }, uDissolve: { value: 0 }, uGhost: { value: 0 }, uRim: { value: 0.15 },
  uRimCol: { value: new THREE.Color(1.0, 0.8, 0.55) }, uEdgeCol: { value: new THREE.Color(4, 1.2, 0.25) },
  uWindow: { value: 0 }
};
// 环境（天空/水面共享）
export const ENV = {
  uTime: U.uTime,
  uSkyTop: { value: new THREE.Color(0.12, 0.25, 0.48) }, uSkyHor: { value: new THREE.Color(0.85, 0.72, 0.6) },
  uSunDir: { value: new THREE.Vector3(1, 0.3, 0).normalize() }, uSunCol: { value: new THREE.Color(1, 0.82, 0.6) },
  uFire: { value: 0 }, uStars: { value: 0 }
};

const VERT_COMMON = '#include <common>\nvarying vec3 vWPos; varying vec3 vWNrm;';
const VERT_PROJ = `#include <project_vertex>
{ vec4 hyW = vec4(transformed,1.0);
#ifdef USE_INSTANCING
  hyW = instanceMatrix * hyW;
#endif
  vWPos = (modelMatrix * hyW).xyz; vWNrm = normalize(mat3(modelMatrix) * objectNormal); }`;

// 石材 / 建筑材质补丁：大理石纹理、Fresnel 边缘光、焚毁溶解 + 余烬描边、全息“记忆”扫描线、窗内呼吸光
export function patchStone(mat, o = {}) {
  const opt = Object.assign({ dissolve: false, vein: 0, windowGlow: false, ground: false, paving: false, tiles: false }, o);
  mat.onBeforeCompile = (sh) => {
    for (const k in U) sh.uniforms[k] = U[k];
    sh.vertexShader = sh.vertexShader.replace('#include <common>', VERT_COMMON).replace('#include <project_vertex>', VERT_PROJ);
    const fc = `#include <common>
uniform float uTime,uDissolve,uGhost,uRim,uWindow; uniform vec3 uRimCol,uEdgeCol; varying vec3 vWPos; varying vec3 vWNrm;
${NOISE}`;
    let clip = `#include <clipping_planes_fragment>
float hyN = dissolveField(vWPos); float hyEdge = 0.0;`;
    if (opt.dissolve) clip += `
if(uDissolve>0.001){ if(hyN<uDissolve) discard; hyEdge = 1.0-smoothstep(uDissolve,uDissolve+0.022,hyN); }
if(uGhost>0.001){ float sl=fract(vWPos.y*2.4-uTime*0.25+hyN*0.6); if(sl<uGhost*0.7) discard; }`;
    let col = '#include <color_fragment>';
    if (opt.vein > 0) col += `
{ float vv=fbm3(vWPos*vec3(0.25,0.7,0.25)); diffuseColor.rgb *= 0.92+${opt.vein.toFixed(2)}*0.16*vv; }`;
    if (opt.ground) col += `
{ float g=fbm3(vec3(vWPos.xz*0.035,1.7)); float g2=snoise(vec3(vWPos.xz*0.4,3.1)); diffuseColor.rgb *= 0.72+0.35*g+0.05*g2; }`;
    if (opt.paving) col += `
{ vec2 q=vWPos.xz*0.5; vec2 f=abs(fract(q)-0.5); float l=smoothstep(0.46,0.5,max(f.x,f.y));
  diffuseColor.rgb *= (1.0-0.22*l)*(0.92+0.08*snoise(vec3(floor(q),0.5))); }`;
    if (opt.tiles) col += `
{ vec2 n2=vWNrm.xz; float ln=length(n2);
  if(ln>0.08){ n2/=ln; float along=dot(vWPos.xz,vec2(-n2.y,n2.x)); float ch=0.5+0.5*cos(along*6.2831/0.42);
    float slope=vWPos.y*1.0-dot(vWPos.xz,n2)*0.6; float row=fract(slope*2.6);
    diffuseColor.rgb *= (0.5+0.65*pow(ch,1.6))*(0.75+0.25*smoothstep(0.0,0.12,row)); } }`;
    if (opt.dissolve) col += `
diffuseColor.rgb *= 1.0 - 0.85*(1.0-smoothstep(uDissolve,uDissolve+0.22,hyN))*step(0.001,uDissolve);`;
    let em = `#include <emissivemap_fragment>
{ float hyF=pow(clamp(1.0-abs(dot(normal,normalize(vViewPosition))),0.0,1.0),3.0);
  totalEmissiveRadiance += uRimCol*hyF*uRim;`;
    if (opt.dissolve) em += `
  totalEmissiveRadiance += uEdgeCol*hyEdge*1.5 + uRimCol*hyF*uGhost*3.6 + uRimCol*uGhost*0.06;`;
    if (opt.windowGlow) em += `
  totalEmissiveRadiance += vec3(1.0,0.55,0.22)*uWindow*1.4*(0.75+0.25*sin(uTime*1.7+vWPos.z*0.6+vWPos.y));`;
    em += '\n}';
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', fc)
      .replace('#include <clipping_planes_fragment>', clip)
      .replace('#include <color_fragment>', col)
      .replace('#include <emissivemap_fragment>', em);
  };
  if (o.env === undefined && mat.envMapIntensity === 1) mat.envMapIntensity = 0.3;
  const key = JSON.stringify(opt);
  mat.customProgramCacheKey = () => 'hy-stone' + key;
  return mat;
}

// 红铜兽首：金属 + 清漆 + Fresnel 边缘光 + 喷水时的呼吸脉冲
export function makeBronze() {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xa8653d, metalness: 1, roughness: 0.34, clearcoat: 0.4, clearcoatRoughness: 0.3,
    transparent: true, envMapIntensity: 1.3
  });
  m.userData.u = { uGlow: { value: 0 }, uGlowCol: { value: new THREE.Color(1.0, 0.75, 0.4) } };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uGlow = m.userData.u.uGlow; sh.uniforms.uGlowCol = m.userData.u.uGlowCol;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime,uGlow; uniform vec3 uGlowCol;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{ float f=pow(clamp(1.0-abs(dot(normal,normalize(vViewPosition))),0.0,1.0),2.5);
  totalEmissiveRadiance += vec3(1.0,0.55,0.3)*f*0.35 + uGlowCol*(f*2.0+0.2)*uGlow*(0.8+0.2*sin(uTime*5.0)); }`);
  };
  m.customProgramCacheKey = () => 'hy-bronze';
  return m;
}
