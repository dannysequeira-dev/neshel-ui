// Phase 016 (research R1–R4, ADR 0031): GPU driver spike for the Advanced 3D & Distortion family (D01–D11).
// Self-contained pages (no package code) measure, per engine: driver availability (WebGL2, WebGL1, WebGPU), the
// live-context ceiling, shader compile/link time, CPU time per frame spent submitting the effect's work (JS) and
// rAF interval statistics for page-curl meshes (small/medium/large/max) at DPR 1 and 2, the ripple, displacement
// and depth-parallax fragment shaders, a Canvas 2D page-curl approximation, and the CSS candidates (3D flip,
// hinged fold, glitch slices, perspective grid floor, tilt-shift with `backdrop-filter` and with `filter` layers).
// Local observations only: headless engines rasterise WebGL in software (SwiftShader in headless Chromium), so GPU
// figures are NOT representative of real hardware and are reported as such.
//
//   node scripts/bench-animations-spike-016.mjs [--engines chromium,firefox,webkit] [--frames 120] [--json out.json]
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const engines = opt("engines", "chromium,firefox,webkit").split(",");
const FRAMES = Number(opt("frames", "120"));
const jsonOut = opt("json", undefined);

const PAGE = String.raw`<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;background:#0b1020;color:#e2e8f0;font:16px system-ui}
canvas{display:block;width:480px;height:360px}
.content{width:800px;height:500px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px;box-sizing:border-box}
.content div{background:linear-gradient(135deg,#1e3a8a,#7c3aed);border-radius:6px;padding:8px}
.stage{position:relative;width:800px;height:500px;overflow:hidden}
.band{position:absolute;left:0;right:0;pointer-events:none}
.flipper{display:inline-block;width:160px;height:110px;margin:6px;perspective:600px}
.flip{position:relative;width:100%;height:100%;transform-style:preserve-3d;animation:flip 1.2s linear infinite}
.flip>div{position:absolute;inset:0;backface-visibility:hidden;background:#334155;border-radius:6px}
.flip>div+div{transform:rotateY(180deg);background:#7c3aed}
@keyframes flip{to{transform:rotateY(360deg)}}
.fold{position:relative;width:240px;height:180px;display:inline-block;margin:8px}
.fold>div{position:absolute;inset:0;background:linear-gradient(135deg,#1e3a8a,#7c3aed);border-radius:6px}
.fold>.base{clip-path:polygon(0 0,60% 0,100% 40%,100% 100%,0 100%)}
.fold>.flap{clip-path:polygon(60% 0,100% 0,100% 40%);transform-origin:60% 0;animation:flap 1s ease-in-out infinite alternate}
@keyframes flap{to{transform:rotate3d(1,1,0,70deg)}}
.glitch{position:relative;display:inline-block;font:700 48px system-ui;margin:12px}
.glitch>span{position:absolute;inset:0;mix-blend-mode:screen;animation:slice .333s steps(1) infinite}
.glitch>span:first-child{color:#ff004c;transform:translate(-2px,0)}
.glitch>span:last-child{color:#00e5ff;transform:translate(2px,0);animation-delay:-.16s}
@keyframes slice{0%{clip-path:inset(10% 0 60% 0)}50%{clip-path:inset(55% 0 20% 0)}}
.floor{position:relative;width:800px;height:500px;overflow:hidden;perspective:320px;perspective-origin:50% 35%}
.plane{position:absolute;left:-100%;right:-100%;top:35%;height:200%;transform-origin:50% 0;transform:rotateX(72deg);
background-image:linear-gradient(rgba(124,58,237,.8) 2px,transparent 2px),linear-gradient(90deg,rgba(124,58,237,.8) 2px,transparent 2px);
background-size:48px 48px}
.plane>i{position:absolute;inset:0;background:inherit;animation:run 1s linear infinite}
@keyframes run{to{transform:translateY(48px)}}
</style><body><div id="root"></div><script>
function stats(xs){if(!xs.length)return null;const s=[...xs].sort((a,b)=>a-b);const mean=s.reduce((a,b)=>a+b,0)/s.length;return{mean:+mean.toFixed(3),p95:+s[Math.floor(s.length*0.95)].toFixed(3),max:+s[s.length-1].toFixed(3)}}
function frames(n, step){return new Promise(res=>{const js=[],iv=[];let last;let i=0;function f(t){if(last!==undefined)iv.push(t-last);last=t;const a=performance.now();step(t,i);js.push(performance.now()-a);if(++i<n)requestAnimationFrame(f);else res({js:stats(js.slice(10)),interval:stats(iv.slice(10))})}requestAnimationFrame(f)})}
function reset(){const r=document.getElementById('root');r.innerHTML='';return r}
function texCanvas(w,h,hue){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,'hsl('+hue+',70%,35%)');g.addColorStop(1,'hsl('+(hue+60)+',70%,55%)');x.fillStyle=g;x.fillRect(0,0,w,h);x.strokeStyle='rgba(255,255,255,.2)';for(let i=0;i<=w;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke()}for(let i=0;i<=h;i+=32){x.beginPath();x.moveTo(0,i);x.lineTo(w,i);x.stroke()}x.fillStyle='#fff';x.font='bold 40px system-ui';x.fillText('Neshel',30,70);return c}
function depthCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');const g=x.createRadialGradient(w/2,h/2,10,w/2,h/2,w/2);g.addColorStop(0,'#fff');g.addColorStop(1,'#000');x.fillStyle=g;x.fillRect(0,0,w,h);return c}
function gl2(dpr){const c=document.createElement('canvas');c.width=480*dpr;c.height=360*dpr;reset().appendChild(c);return [c,c.getContext('webgl2',{antialias:false,premultipliedAlpha:true,alpha:true})]}
function program(gl,vs,fs){const t0=performance.now();const mk=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s};const p=gl.createProgram();const a=mk(gl.VERTEX_SHADER,vs),b=mk(gl.FRAGMENT_SHADER,fs);gl.attachShader(p,a);gl.attachShader(p,b);gl.linkProgram(p);const ok=gl.getProgramParameter(p,gl.LINK_STATUS);const ms=performance.now()-t0;if(!ok)throw new Error(gl.getProgramInfoLog(p)||gl.getShaderInfoLog(a)||gl.getShaderInfoLog(b));return [p,ms]}
function texture(gl,unit,src){const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
const CURL_VS='#version 300 es\nin vec2 aP;uniform vec2 uSize;uniform vec2 uCorner;uniform vec2 uDir;uniform float uS;uniform float uR;out vec2 vUv;out float vShade;\n'+
'void main(){vec2 p=aP*uSize;float u=dot(p-uCorner,uDir);float t=uS-u;vec3 q=vec3(p,0.);float nz=1.;if(t>0.){if(t<3.14159265*uR){float th=t/uR;q.xy=p+uDir*((uS-uR*sin(th))-u);q.z=uR*(1.-cos(th));nz=cos(th);}else{q.xy=p+uDir*((uS+(t-3.14159265*uR))-u);q.z=2.*uR;nz=-1.;}}\n'+
'vUv=aP;vShade=.55+.45*abs(nz);vec2 ndc=q.xy/uSize*2.-1.;gl_Position=vec4(ndc.x,-ndc.y,-q.z/(4.*uR+1.),1.);}';
const CURL_FS='#version 300 es\nprecision mediump float;in vec2 vUv;in float vShade;uniform sampler2D uFront;uniform vec3 uBack;out vec4 o;void main(){o=gl_FrontFacing?vec4(texture(uFront,vUv).rgb*vShade,1.):vec4(uBack*vShade,1.);}';
const QUAD_VS='#version 300 es\nin vec2 aP;out vec2 vUv;void main(){vUv=aP;gl_Position=vec4(aP*2.-1.,0.,1.);}';
const RIPPLE_FS='#version 300 es\nprecision highp float;in vec2 vUv;uniform sampler2D uT;uniform vec4 uImp[8];uniform float uTime;uniform float uAspect;out vec4 o;\n'+
'void main(){vec2 off=vec2(0.);for(int i=0;i<8;i++){vec4 m=uImp[i];float age=uTime-m.z;if(age<0.||m.w<=0.)continue;vec2 d=vUv-m.xy;d.x*=uAspect;float r=length(d);float front=age*.45;float env=exp(-12.*abs(r-front))*exp(-2.5*age)*m.w;off+=(r>1e-4?d/r:vec2(0.))*sin(60.*(r-front))*env*.02;}o=texture(uT,clamp(vUv+off,0.,1.));}';
const DISP_FS='#version 300 es\nprecision highp float;in vec2 vUv;uniform sampler2D uT;uniform sampler2D uMap;uniform float uK;out vec4 o;void main(){vec2 d=(texture(uMap,vUv).rg-.5)*2.;o=texture(uT,clamp(vUv+d*uK*.08,0.,1.));}';
const DEPTH_FS='#version 300 es\nprecision highp float;in vec2 vUv;uniform sampler2D uT;uniform sampler2D uD;uniform vec2 uP;uniform float uK;out vec4 o;\n'+
'void main(){vec2 uv=(vUv-.5)/(1.+uK*2.)+.5;vec2 cur=uv;for(int i=0;i<8;i++){float d=texture(uD,cur).r;cur=uv+uP*(d-.5)*uK;}o=texture(uT,clamp(cur,0.,1.));}';
function quad(gl,p){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),gl.STATIC_DRAW);const l=gl.getAttribLocation(p,'aP');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0)}
window.bench = {
  probe(){
    const c=document.createElement('canvas');const g2=c.getContext('webgl2');const g1=document.createElement('canvas').getContext('webgl');
    const info=g2&&g2.getExtension('WEBGL_debug_renderer_info');
    const out={webgl2:!!g2,webgl1:!!g1,webgpu:typeof navigator.gpu!=='undefined',renderer:g2?String(info?g2.getParameter(info.UNMASKED_RENDERER_WEBGL):g2.getParameter(g2.RENDERER)):null,maxTexture:g2?g2.getParameter(g2.MAX_TEXTURE_SIZE):null,
      backdropFilter:CSS.supports('backdrop-filter','blur(2px)')||CSS.supports('-webkit-backdrop-filter','blur(2px)'),preserve3d:CSS.supports('transform-style','preserve-3d'),maskImage:CSS.supports('mask-image','linear-gradient(#000,transparent)')||CSS.supports('-webkit-mask-image','linear-gradient(#000,transparent)')};
    g2?.getExtension('WEBGL_lose_context')?.loseContext();g1?.getExtension('WEBGL_lose_context')?.loseContext();
    return out},
  async webgpu(){if(!navigator.gpu)return{available:false};try{const a=await navigator.gpu.requestAdapter();return{available:!!a,adapter:!!a}}catch(e){return{available:false,error:String(e)}}},
  async contexts(n){const list=[];let lost=0;for(let i=0;i<n;i++){const c=document.createElement('canvas');c.width=c.height=8;c.addEventListener('webglcontextlost',()=>lost++);const g=c.getContext('webgl2');if(!g)break;g.clearColor(0,0,0,1);g.clear(g.COLOR_BUFFER_BIT);list.push(g)}
    await new Promise(r=>setTimeout(r,300));const alive=list.filter(g=>!g.isContextLost()).length;for(const g of list)g.getExtension('WEBGL_lose_context')?.loseContext();return{created:list.length,alive,lostEvents:lost}},
  async curl(cols,rows,dpr){const [c,gl]=gl2(dpr);if(!gl)return{unsupported:true};let p,ms;try{[p,ms]=program(gl,CURL_VS,CURL_FS)}catch(e){return{error:String(e)}}gl.useProgram(p);
    const v=[];for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)v.push(x/cols,y/rows);const idx=[];for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+1,cc=a+cols+1,d=cc+1;idx.push(a,cc,b,b,cc,d)}
    const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);const l=gl.getAttribLocation(p,'aP');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);
    const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);
    const t0=performance.now();texture(gl,0,texCanvas(512,384,220));const upload=performance.now()-t0;
    const U=n=>gl.getUniformLocation(p,n);gl.uniform2f(U('uSize'),480,360);gl.uniform2f(U('uCorner'),480,0);const L=Math.hypot(480,360);gl.uniform2f(U('uDir'),-480/L,360/L);gl.uniform1f(U('uR'),40);gl.uniform3f(U('uBack'),.9,.9,.92);gl.uniform1i(U('uFront'),0);
    gl.enable(gl.DEPTH_TEST);gl.viewport(0,0,c.width,c.height);const us=U('uS');
    const res=await frames(${FRAMES},(t,i)=>{gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform1f(us,(i%60)/60*(L+130));gl.drawElements(gl.TRIANGLES,idx.length,gl.UNSIGNED_SHORT,0)});
    gl.finish();res.compileMs=+ms.toFixed(2);res.uploadMs=+upload.toFixed(2);res.vertices=v.length/2;res.textureBytes=512*384*4;res.drawingBufferBytes=c.width*c.height*4*2;gl.getExtension('WEBGL_lose_context')?.loseContext();return res},
  async frag(kind,dpr){const [c,gl]=gl2(dpr);if(!gl)return{unsupported:true};const fs={ripple:RIPPLE_FS,disp:DISP_FS,depth:DEPTH_FS}[kind];let p,ms;try{[p,ms]=program(gl,QUAD_VS,fs)}catch(e){return{error:String(e)}}gl.useProgram(p);quad(gl,p);
    texture(gl,0,texCanvas(512,384,180));const U=n=>gl.getUniformLocation(p,n);gl.uniform1i(U('uT'),0);
    if(kind==='disp'){texture(gl,1,depthCanvas(256,192));gl.uniform1i(U('uMap'),1)}if(kind==='depth'){texture(gl,1,depthCanvas(512,384));gl.uniform1i(U('uD'),1)}
    if(kind==='ripple'){const imp=new Float32Array(32);for(let i=0;i<8;i++){imp[i*4]=(i*37%100)/100;imp[i*4+1]=(i*61%100)/100;imp[i*4+2]=i*.1;imp[i*4+3]=1}gl.uniform4fv(U('uImp'),imp);gl.uniform1f(U('uAspect'),480/360)}
    gl.viewport(0,0,c.width,c.height);
    const res=await frames(${FRAMES},(t,i)=>{if(kind==='ripple')gl.uniform1f(U('uTime'),(i%90)/60);if(kind==='disp')gl.uniform1f(U('uK'),Math.abs(Math.sin(i/20)));if(kind==='depth'){gl.uniform2f(U('uP'),Math.sin(i/25)*.5,Math.cos(i/25)*.5);gl.uniform1f(U('uK'),.04)}gl.drawArrays(gl.TRIANGLE_STRIP,0,4)});
    gl.finish();res.compileMs=+ms.toFixed(2);gl.getExtension('WEBGL_lose_context')?.loseContext();return res},
  async curl2d(strips,dpr){const c=document.createElement('canvas');c.width=480*dpr;c.height=360*dpr;reset().appendChild(c);const x=c.getContext('2d');const tex=texCanvas(512,384,220);const sw=480/strips;
    return frames(${FRAMES},(t,i)=>{const s=(i%60)/60*480;x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,480,360);for(let k=0;k<strips;k++){const u=480-k*sw;const tt=s-(480-u);if(tt<=0){x.drawImage(tex,(u-sw)/480*512,0,sw/480*512,384,u-sw,0,sw,360);continue}const th=Math.min(Math.PI,tt/40);x.globalAlpha=.55+.45*Math.abs(Math.cos(th));const nu=480-(s-40*Math.sin(th));x.drawImage(tex,(u-sw)/480*512,0,sw/480*512,384,nu-sw,0,sw,360);x.globalAlpha=1}})},
  async css(kind,count){const r=reset();
    if(kind==='flip'){for(let i=0;i<count;i++){const w=document.createElement('div');w.className='flipper';w.innerHTML='<div class="flip"><div></div><div></div></div>';w.firstChild.style.animationDelay=(-i*.1)+'s';r.appendChild(w)}}
    else if(kind==='fold'){for(let i=0;i<count;i++){const w=document.createElement('div');w.className='fold';w.innerHTML='<div class="base"></div><div class="flap"></div>';r.appendChild(w)}}
    else if(kind==='glitch'){for(let i=0;i<count;i++){const w=document.createElement('div');w.className='glitch';w.innerHTML='<span aria-hidden="true">Neshel</span>Neshel<span aria-hidden="true">Neshel</span>';r.appendChild(w)}}
    else if(kind==='floor'){for(let i=0;i<count;i++){const w=document.createElement('div');w.className='floor';w.innerHTML='<div class="plane"><i></i></div>';r.appendChild(w)}}
    else if(kind==='backdrop'||kind==='filter'){const st=document.createElement('div');st.className='stage';const content=document.createElement('div');content.className='content';for(let i=0;i<24;i++){const d=document.createElement('div');d.textContent='Item '+i;content.appendChild(d)}st.appendChild(content);
      for(let b=0;b<count;b++){const top=b<count/2;const k=(b%(count/2))+1;const band=document.createElement('div');band.className='band';band.style[top?'top':'bottom']='0';band.style.height=(40-k*6)+'%';
        if(kind==='backdrop'){band.style.backdropFilter=band.style.webkitBackdropFilter='blur('+(k*2)+'px)';band.style.maskImage=band.style.webkitMaskImage='linear-gradient('+(top?'#000,transparent':'transparent,#000')+')'}
        else{const copy=content.cloneNode(true);copy.setAttribute('aria-hidden','true');copy.style.position='absolute';copy.style[top?'top':'bottom']='0';copy.style.filter='blur('+(k*2)+'px)';band.appendChild(copy);band.style.overflow='hidden';band.style.maskImage=band.style.webkitMaskImage='linear-gradient('+(top?'#000,transparent':'transparent,#000')+')'}
        st.appendChild(band)}
      r.appendChild(st);let y=0;return frames(${FRAMES},()=>{y=(y+1)%40;content.style.transform='translateY('+(-y)+'px)'})}
    return frames(${FRAMES},()=>{})},
};
</script>`;

const CASES = [
  ["probe", []],
  ["webgpu", []],
  ["contexts", [24]],
  ["curl", [16, 12, 1]],
  ["curl", [32, 24, 1]],
  ["curl", [64, 48, 1]],
  ["curl", [128, 96, 1]],
  ["curl", [32, 24, 2]],
  ["curl", [64, 48, 2]],
  ["frag", ["ripple", 1]],
  ["frag", ["ripple", 2]],
  ["frag", ["disp", 1]],
  ["frag", ["disp", 2]],
  ["frag", ["depth", 1]],
  ["frag", ["depth", 2]],
  ["curl2d", [64, 1]],
  ["curl2d", [64, 2]],
  ["css", ["flip", 12]],
  ["css", ["fold", 6]],
  ["css", ["glitch", 6]],
  ["css", ["floor", 2]],
  ["css", ["backdrop", 4]],
  ["css", ["backdrop", 8]],
  ["css", ["filter", 4]],
];

const playwright = await import("playwright");
const out = {};
for (const engine of engines) {
  const browser = await playwright[engine].launch();
  for (const throttle of engine === "chromium" ? [1, 4] : [1]) {
    const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
    if (throttle > 1) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
    }
    await page.setContent(PAGE);
    const key = `${engine}${throttle > 1 ? ` (${throttle}x CPU)` : ""}`;
    out[key] = {};
    for (const [name, params] of CASES) {
      if (throttle > 1 && ["probe", "webgpu", "contexts"].includes(name)) continue;
      const label = `${name}(${params.join(",")})`;
      try {
        out[key][label] = await page.evaluate(([n, p]) => window.bench[n](...p), [name, params]);
      } catch (error) {
        out[key][label] = { error: String(error?.message ?? error).split("\n")[0] };
      }
      const r = out[key][label];
      const summary = r?.js
        ? `js ${r.js.mean}/${r.js.p95} ms · interval ${r.interval.mean}/${r.interval.p95} ms${r.compileMs !== undefined ? ` · compile ${r.compileMs} ms` : ""}`
        : JSON.stringify(r);
      console.info(`${key.padEnd(20)} ${label.padEnd(22)} ${summary}`);
    }
    await page.close();
  }
  await browser.close();
}
if (jsonOut) writeFileSync(jsonOut, `${JSON.stringify(out, null, 2)}\n`);
