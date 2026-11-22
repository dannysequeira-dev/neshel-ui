// Phase 015 (research R10–R12, ADR 0030): Canvas 2D vs WebGL2 vs CSS cost spike for ambient/GPU entries.
// Self-contained pages (no package code): measures CPU time per frame spent by the effect's own JavaScript
// (draw submission) and rAF interval statistics, per engine, optionally with 4x CPU throttling (Chromium/CDP).
// Local observations only: headless engines may rasterise WebGL in software (SwiftShader in headless Chromium),
// so GPU figures are NOT representative of real hardware and are reported as such.
//
//   node scripts/bench-animations-ambient.mjs [--engines chromium,firefox,webkit] [--frames 180] [--json out.json]
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const engines = opt("engines", "chromium,firefox,webkit").split(",");
const FRAMES = Number(opt("frames", "180"));
const jsonOut = opt("json", undefined);

const PAGE = String.raw`<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;background:#0b1020}canvas{display:block;width:800px;height:500px}
.stage{position:relative;width:800px;height:500px;overflow:hidden}
.blob{position:absolute;width:520px;height:520px;border-radius:50%;animation:drift 9s ease-in-out infinite alternate}
.blob.r{background:radial-gradient(circle at center,rgba(120,80,255,.55),rgba(120,80,255,0) 70%)}
.blob.f{background:rgba(120,80,255,.55);filter:blur(80px)}
@keyframes drift{from{transform:translate(-120px,-60px) scale(1)}to{transform:translate(260px,80px) scale(1.25)}}
</style><body><div id="root"></div><script>
const W = 800, H = 500;
function rng(seed){return()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function stats(xs){const s=[...xs].sort((a,b)=>a-b);const mean=s.reduce((a,b)=>a+b,0)/s.length;return{mean:+mean.toFixed(3),p95:+s[Math.floor(s.length*0.95)].toFixed(3),max:+s[s.length-1].toFixed(3)}}
function frames(n, step){return new Promise(res=>{const js=[],iv=[];let last;let i=0;function f(t){if(last!==undefined)iv.push(t-last);last=t;const a=performance.now();step(t);js.push(performance.now()-a);if(++i<n)requestAnimationFrame(f);else res({js:stats(js.slice(10)),interval:stats(iv.slice(10))})}requestAnimationFrame(f)})}
function reset(){const r=document.getElementById('root');r.innerHTML='';return r}
window.bench = {
  async idle(){reset();return frames(${FRAMES},()=>{})},
  async canvas2d(n){const c=document.createElement('canvas');c.width=W;c.height=H;reset().appendChild(c);const ctx=c.getContext('2d');const r=rng(7);const p=new Float32Array(n*4);for(let i=0;i<n;i++){p[i*4]=r()*W;p[i*4+1]=r()*H;p[i*4+2]=(r()-.5)*30;p[i*4+3]=(r()-.5)*30}
    let prev;return frames(${FRAMES},t=>{const dt=prev===undefined?0:(t-prev)/1000;prev=t;ctx.clearRect(0,0,W,H);ctx.fillStyle='rgba(200,210,255,.8)';ctx.beginPath();for(let i=0;i<n;i++){let x=p[i*4]+p[i*4+2]*dt,y=p[i*4+1]+p[i*4+3]*dt;if(x<0)x+=W;else if(x>W)x-=W;if(y<0)y+=H;else if(y>H)y-=H;p[i*4]=x;p[i*4+1]=y;ctx.moveTo(x+1.5,y);ctx.arc(x,y,1.5,0,6.2832)}ctx.fill()})},
  async canvas2dRects(n){const c=document.createElement('canvas');c.width=W;c.height=H;reset().appendChild(c);const ctx=c.getContext('2d');const r=rng(7);const p=new Float32Array(n*4);for(let i=0;i<n;i++){p[i*4]=r()*W;p[i*4+1]=r()*H;p[i*4+2]=(r()-.5)*30;p[i*4+3]=(r()-.5)*30}
    let prev;return frames(${FRAMES},t=>{const dt=prev===undefined?0:(t-prev)/1000;prev=t;ctx.clearRect(0,0,W,H);ctx.fillStyle='rgba(200,210,255,.8)';for(let i=0;i<n;i++){let x=p[i*4]+p[i*4+2]*dt,y=p[i*4+1]+p[i*4+3]*dt;if(x<0)x+=W;else if(x>W)x-=W;if(y<0)y+=H;else if(y>H)y-=H;p[i*4]=x;p[i*4+1]=y;ctx.fillRect(x-1,y-1,2,2)}})},
  async webgl2(n){const c=document.createElement('canvas');c.width=W;c.height=H;reset().appendChild(c);const gl=c.getContext('webgl2',{antialias:false,premultipliedAlpha:true});if(!gl)return{unsupported:true};
    const vs='#version 300 es\nin vec4 a;uniform float t;uniform vec2 s;void main(){vec2 p=mod(a.xy+a.zw*t,s);gl_Position=vec4(p/s*2.-1.,0,1);gl_PointSize=3.;}';
    const fs='#version 300 es\nprecision mediump float;out vec4 o;void main(){vec2 d=gl_PointCoord-.5;if(dot(d,d)>.25)discard;o=vec4(.78,.82,1.,1.)*.8;}';
    const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s};const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return{error:gl.getProgramInfoLog(pr)};gl.useProgram(pr);const r=rng(7);const data=new Float32Array(n*4);for(let i=0;i<n;i++){data[i*4]=r()*W;data[i*4+1]=r()*H;data[i*4+2]=(r()-.5)*30;data[i*4+3]=(r()-.5)*30}
    const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);const loc=gl.getAttribLocation(pr,'a');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,4,gl.FLOAT,false,0,0);
    const ut=gl.getUniformLocation(pr,'t');gl.uniform2f(gl.getUniformLocation(pr,'s'),W,H);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.viewport(0,0,W,H);
    const info=gl.getExtension('WEBGL_debug_renderer_info');const renderer=info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
    let t0;const res=await frames(${FRAMES},t=>{t0??=t;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(ut,(t-t0)/1000);gl.drawArrays(gl.POINTS,0,n)});
    res.renderer=String(renderer);gl.getExtension('WEBGL_lose_context')?.loseContext();return res},
  async css(kind,count){const r=reset();const st=document.createElement('div');st.className='stage';for(let i=0;i<count;i++){const b=document.createElement('div');b.className='blob '+kind;b.style.left=(i*137%600-100)+'px';b.style.top=(i*89%300-100)+'px';b.style.animationDelay=(-i*1.7)+'s';st.appendChild(b)}r.appendChild(st);return frames(${FRAMES},()=>{})},
};
</script>`;

const CASES = [
  ["idle", []],
  ["canvas2d", [100]],
  ["canvas2d", [1000]],
  ["canvas2d", [5000]],
  ["canvas2dRects", [5000]],
  ["webgl2", [100]],
  ["webgl2", [1000]],
  ["webgl2", [5000]],
  ["css", ["r", 4]],
  ["css", ["f", 4]],
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
      const label = `${name}(${params.join(",")})`;
      out[key][label] = await page.evaluate(([n, p]) => window.bench[n](...p), [name, params]);
      const r = out[key][label];
      console.info(
        `${key.padEnd(20)} ${label.padEnd(20)} js mean ${r.js?.mean ?? "-"} p95 ${r.js?.p95 ?? "-"} | interval mean ${r.interval?.mean ?? "-"} p95 ${r.interval?.p95 ?? "-"}${r.renderer ? ` | ${r.renderer}` : ""}${r.unsupported ? " UNSUPPORTED" : ""}`,
      );
    }
    await page.close();
  }
  await browser.close();
}
if (jsonOut) writeFileSync(jsonOut, `${JSON.stringify(out, null, 2)}\n`);
