/**
 * Package shaders of the GPU entries (Phase 016; GLSL ES 3.00; ADR 0031 §3). Constants only — no option ever accepts
 * shader code. Coordinates: `aP` in [0, 1]² with (0, 0) at the top-left; textures are uploaded without a vertical flip,
 * so `aP` doubles as the texture coordinate. `uFit` maps the frame's UV to the texture's UV like CSS `object-fit`
 * (scale.xy, offset.zw). Offsets are bounded in the shader itself (inputs are also validated in JavaScript).
 */

/** Full-frame quad (D06, D08, D10 and the D04 page underneath). */
export const QUAD_VERTEX = `#version 300 es
in vec2 aP;
out vec2 vUv;
void main() {
  vUv = aP;
  gl_Position = vec4(aP.x * 2.0 - 1.0, 1.0 - aP.y * 2.0, 0.0, 1.0);
}`;

/** Plain texture (D04 page underneath). */
export const IMAGE_FRAGMENT = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D uImage;
uniform vec4 uFit;
out vec4 outColor;
void main() {
  vec2 uv = vUv * uFit.xy + uFit.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) discard;
  outColor = texture(uImage, uv);
}`;

/**
 * D04 page curl (research R8): cylinder of radius `uR` about the fold line at distance `uS` from the start corner
 * along `uDir` (px space). t ≤ 0 flat; 0 < t < πr wrapped (z = r(1 − cos θ), normal z = cos θ); t ≥ πr flipped flat on
 * top (z = 2r). A mild perspective (`uPersp`) enlarges lifted parts.
 */
export const CURL_VERTEX = `#version 300 es
in vec2 aP;
uniform vec2 uSize;
uniform vec2 uCorner;
uniform vec2 uDir;
uniform float uS;
uniform float uR;
uniform float uPersp;
uniform float uShading;
out vec2 vUv;
out float vShade;
out float vSpec;
const float PI = 3.14159265;
void main() {
  vec2 p = aP * uSize;
  float u = dot(p - uCorner, uDir);
  float t = uS - u;
  vec3 q = vec3(p, 0.0);
  float nz = 1.0;
  float spec = 0.0;
  if (t > 0.0) {
    if (t < PI * uR) {
      float th = t / uR;
      q.xy = p + uDir * ((uS - uR * sin(th)) - u);
      q.z = uR * (1.0 - cos(th));
      nz = cos(th);
      spec = pow(max(0.0, sin(th)), 10.0);
    } else {
      q.xy = p + uDir * ((uS + (t - PI * uR)) - u);
      q.z = 2.0 * uR;
      nz = -1.0;
    }
  }
  vUv = aP;
  vShade = mix(1.0, 0.5 + 0.5 * abs(nz), uShading);
  vSpec = spec * 0.22 * uShading;
  vec2 ndc = q.xy / uSize * 2.0 - 1.0;
  float w = 1.0 - q.z * uPersp;
  w = max(0.2, w);
  // Depth premultiplied by w: NDC z = −z / (4r + 4) ∈ (−0.5, 0], never clipped by the perspective divide.
  gl_Position = vec4(ndc.x, -ndc.y, (-q.z / (4.0 * uR + 4.0)) * w, w);
}`;

export const CURL_FRAGMENT = `#version 300 es
precision mediump float;
in vec2 vUv;
in float vShade;
in float vSpec;
uniform sampler2D uImage;
uniform vec4 uFit;
uniform vec3 uBack;
out vec4 outColor;
void main() {
  if (gl_FrontFacing) {
    vec4 c = texture(uImage, vUv * uFit.xy + uFit.zw);
    outColor = vec4(c.rgb * vShade + vSpec * c.a, c.a);
  } else {
    outColor = vec4(uBack * vShade + vSpec, 1.0);
  }
}`;

/** D06 damped radial waves (research R10); the summed offset is bounded to `0.03 × amplitude` UV. */
export const RIPPLE_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uImage;
uniform vec4 uFit;
uniform vec4 uImpacts[8];
uniform float uTime;
uniform float uAspect;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uDamping;
uniform float uSpeed;
out vec4 outColor;
void main() {
  vec2 off = vec2(0.0);
  for (int i = 0; i < 8; i++) {
    vec4 m = uImpacts[i];
    if (m.w <= 0.0) continue;
    float age = uTime - m.z;
    if (age < 0.0) continue;
    vec2 d = vUv - m.xy;
    d.x *= uAspect;
    float r = length(d);
    float front = age * uSpeed;
    float env = exp(-10.0 * abs(r - front)) * exp(-uDamping * age) * m.w;
    vec2 dir = r > 1e-4 ? d / r : vec2(0.0);
    dir.x /= uAspect;
    off += dir * sin(uFrequency * 40.0 * (r - front)) * env;
  }
  off /= max(1.0, length(off));
  vec2 uv = clamp(vUv + off * uAmplitude * 0.03, 0.0, 1.0);
  outColor = texture(uImage, uv * uFit.xy + uFit.zw);
}`;

/** D08 displacement map (research R12): RG (or one channel) offsets, ≤ 0.08 UV; clamp, mirror or fade edges. */
export const DISPLACEMENT_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uImage;
uniform sampler2D uMap;
uniform vec4 uFit;
uniform float uAmount;
uniform float uStrength;
uniform float uScale;
uniform vec2 uShift;
uniform int uChannels;
uniform int uEdge;
out vec4 outColor;
void main() {
  vec2 m = texture(uMap, vUv * uScale + uShift).rg;
  vec2 d = uChannels == 0 ? (m - 0.5) * 2.0 : uChannels == 1 ? vec2(m.r - 0.5) * 2.0 : vec2(m.g - 0.5) * 2.0;
  float edge = 1.0;
  if (uEdge == 2) {
    vec2 e = min(vUv, 1.0 - vUv);
    edge = smoothstep(0.0, 0.08, min(e.x, e.y));
  }
  vec2 uv = vUv + clamp(d, -1.0, 1.0) * clamp(uAmount, 0.0, 1.0) * clamp(uStrength, 0.0, 1.0) * 0.08 * edge;
  if (uEdge == 1) {
    uv = abs(uv);
    uv = 1.0 - abs(1.0 - uv);
  } else {
    uv = clamp(uv, 0.0, 1.0);
  }
  outColor = texture(uImage, uv * uFit.xy + uFit.zw);
}`;

/**
 * D10 depth-map parallax (research R14): iterative offset `pose · (depth − focus) · k` with a zoom margin equal to
 * the largest offset (edges never uncovered); white = near unless inverted.
 */
export const DEPTH_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform vec4 uFit;
uniform vec2 uPose;
uniform float uIntensity;
uniform float uFocus;
uniform float uInvert;
uniform int uSteps;
out vec4 outColor;
void main() {
  float k = clamp(uIntensity, 0.0, 1.0) * 0.06;
  vec2 base = (vUv - 0.5) / (1.0 + 2.0 * k) + 0.5;
  vec2 cur = base;
  vec2 pose = clamp(uPose, -1.0, 1.0);
  for (int i = 0; i < 16; i++) {
    if (i >= uSteps) break;
    float d = texture(uDepth, clamp(cur, 0.0, 1.0) * uFit.xy + uFit.zw).r;
    d = mix(d, 1.0 - d, uInvert);
    cur = base + pose * (d - uFocus) * k;
  }
  outColor = texture(uImage, clamp(cur, 0.0, 1.0) * uFit.xy + uFit.zw);
}`;
