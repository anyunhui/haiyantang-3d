import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// 自定义收尾通道：屏幕空间径向“上帝光” + 色差 + 轻度对比/饱和调色 + 胶片颗粒 + 暗角
export const FinalShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.05 }, uCA: { value: 0.003 }, uVig: { value: 0.9 },
    uGod: { value: 0 }, uSun: { value: new THREE.Vector2(0.5, 0.5) }, uGodCol: { value: new THREE.Color(1, 0.85, 0.6) }, uRes: { value: new THREE.Vector2(1, 1) }, uContrast: { value: 1.08 }, uSat: { value: 1.1 }, uSharp: { value: 0.32 }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime,uGrain,uCA,uVig,uGod,uContrast,uSat,uSharp; uniform vec2 uSun,uRes; uniform vec3 uGodCol; varying vec2 vUv;
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
void main(){
  vec2 uv=vUv; vec2 d=uv-0.5; float r=dot(d,d);
  vec2 off=d*uCA*(r*3.0); // 色差只出现在画面边缘，中心无偏移
  vec3 c0=texture2D(tDiffuse,uv).rgb;
  vec3 col=vec3(texture2D(tDiffuse,uv-off).r, c0.g, texture2D(tDiffuse,uv+off).b);
  // 轻度锐化（4 邻域反锐化掩模，按物理像素）
  vec2 px=1.0/uRes;
  vec3 nb=(texture2D(tDiffuse,uv+vec2(px.x,0.0)).rgb+texture2D(tDiffuse,uv-vec2(px.x,0.0)).rgb+texture2D(tDiffuse,uv+vec2(0.0,px.y)).rgb+texture2D(tDiffuse,uv-vec2(0.0,px.y)).rgb)*0.25;
  col=max(col+(c0-nb)*uSharp,0.0);
  if(uGod>0.001){
    vec2 dl=(uv-uSun)*(0.92/36.0); vec2 c=uv; float dec=1.0; vec3 acc=vec3(0.0);
    float jit=h21(uv*uRes+uTime);
    c-=dl*jit;
    for(int i=0;i<36;i++){ c-=dl; vec3 s=texture2D(tDiffuse,clamp(c,0.0,1.0)).rgb; float l=max(max(s.r,max(s.g,s.b))-0.86,0.0); acc+=s*l*dec; dec*=0.955; }
    col+=acc*uGodCol*uGod*(3.0/36.0);
  }
  float lum=dot(col,vec3(0.2126,0.7152,0.0722)); col=mix(vec3(lum),col,uSat);
  col=max((col-0.5)*uContrast+0.5+0.02,0.0);
  float g=h21(uv*uRes+fract(uTime*7.31)*91.7)-0.5; col+=g*uGrain*(1.0-0.5*dot(col,vec3(0.33)));
  col*=1.0-uVig*smoothstep(0.12,0.62,r*1.5);
  gl_FragColor=vec4(col,1.0);
}`
};

export function createPost(renderer, scene, camera, low, pr, samples, hideInDepth) {
  const size = renderer.getSize(new THREE.Vector2());
  // 合成器渲染目标：按设备像素比分配，并启用 MSAA（WebGL2 多重采样），解决几何锯齿与发虚
  const rt = new THREE.WebGLRenderTarget(Math.round(size.x * pr), Math.round(size.y * pr), { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(pr); composer.setSize(size.x, size.y);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 30, aperture: 0.0002, maxblur: 0.008 });
  // 景深深度通道中隐藏加色粒子 / 光柱，避免它们写入深度
  const orig = bokeh.render.bind(bokeh);
  bokeh.render = (...a) => { const v = hideInDepth.map(o => o.visible); hideInDepth.forEach(o => o.visible = false); orig(...a); hideInDepth.forEach((o, i) => o.visible = v[i]); };
  // 注意：上面在整个 bokeh.render 内隐藏，但合成仅用到 readBuffer，因此粒子颜色仍保留在画面中
  if (!low) composer.addPass(bokeh);
  // NaN/Inf 防护：避免个别像素的非法值经景深/后续通道扩散成黑块
  const sanitize = new ShaderPass({ uniforms: { tDiffuse: { value: null } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c=texture2D(tDiffuse,vUv);
      if(any(isnan(c))||any(isinf(c))) c=vec4(0.0,0.0,0.0,1.0); gl_FragColor=vec4(min(c.rgb,vec3(60.0)),1.0); }` });
  composer.addPass(sanitize);
  composer.addPass(new OutputPass());
  const fin = new ShaderPass(FinalShader); composer.addPass(fin);
  return { composer, bokeh, fin };
}
