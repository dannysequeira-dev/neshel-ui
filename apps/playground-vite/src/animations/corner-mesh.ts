// Experiment B, technique 4: real geometric deformation with WebGL. A subdivided plane is displaced
// per vertex (z falls off with the distance to the top-right corner) and textured with a raster
// image. This is true deformation, but only of pixels: live DOM (text, links, focus) cannot be a
// WebGL texture, so the canvas is decorative and the accessible content stays in the DOM.

const VERTEX = `
attribute vec2 aPosition;
attribute vec2 aUv;
uniform mat4 uMatrix;
uniform float uAmount;
uniform vec2 uCorner;
uniform float uRadius;
uniform float uDepth;
varying vec2 vUv;
varying float vShade;
void main() {
  float d = distance(aPosition, uCorner);
  float f = pow(max(0.0, 1.0 - d / uRadius), 2.0);
  float z = -uDepth * uAmount * f;
  vUv = aUv;
  vShade = 1.0 - 0.45 * uAmount * f;
  gl_Position = uMatrix * vec4(aPosition, z, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D uTexture;
varying vec2 vUv;
varying float vShade;
void main() {
  vec4 color = texture2D(uTexture, vUv);
  gl_FragColor = vec4(color.rgb * vShade, color.a);
}`;

export interface CornerMesh {
  setAmount(amount: number): void;
  destroy(): void;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("createShader failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "shader compilation failed");
  }
  return shader;
}

/** Column-major perspective * translate(0, 0, -distance). */
function cameraMatrix(aspect: number, fovDeg: number, distance: number): Float32Array {
  const f = 1 / Math.tan((fovDeg * Math.PI) / 360);
  const near = 0.1;
  const far = 20;
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf - (far + near) * nf * distance;
  m[15] = distance;
  return m;
}

function cardTexture(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 384;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  const gradient = context.createLinearGradient(0, 0, 512, 384);
  gradient.addColorStop(0, "#1e3a8a");
  gradient.addColorStop(1, "#7c3aed");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 384);
  context.strokeStyle = "rgba(255,255,255,0.18)";
  for (let x = 0; x <= 512; x += 32) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, 384);
    context.stroke();
  }
  for (let y = 0; y <= 384; y += 32) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(512, y);
    context.stroke();
  }
  context.fillStyle = "#ffffff";
  context.font = "bold 44px system-ui, sans-serif";
  context.fillText("Mesh", 40, 90);
  context.font = "24px system-ui, sans-serif";
  context.fillText("per-vertex displacement", 40, 130);
  return canvas;
}

/** Returns `undefined` when WebGL is unavailable (the caller shows a fallback). */
export function createCornerMesh(canvas: HTMLCanvasElement): CornerMesh | undefined {
  const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: true });
  if (!gl) return undefined;
  const program = gl.createProgram();
  if (!program) return undefined;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
  gl.useProgram(program);

  // Plane 4:3 in [-1.333, 1.333] x [-1, 1], subdivided 32 x 24.
  const columns = 32;
  const rows = 24;
  const halfWidth = 4 / 3;
  const vertices: number[] = [];
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const u = column / columns;
      const v = row / rows;
      vertices.push(-halfWidth + 2 * halfWidth * u, 1 - 2 * v, u, v);
    }
  }
  const indices: number[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  const uv = gl.getAttribLocation(program, "aUv");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(uv);
  gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cardTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  gl.uniformMatrix4fv(
    uniform("uMatrix"),
    false,
    cameraMatrix(canvas.width / canvas.height, 40, 3.4),
  );
  gl.uniform2f(uniform("uCorner"), halfWidth, 1);
  gl.uniform1f(uniform("uRadius"), 2.4);
  gl.uniform1f(uniform("uDepth"), 1.1);
  const amountLocation = uniform("uAmount");
  gl.enable(gl.DEPTH_TEST);

  function draw(amount: number) {
    if (!gl) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(amountLocation, amount);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  }
  draw(0);
  return {
    setAmount: draw,
    destroy() {
      gl.deleteBuffer(vertexBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
    },
  };
}
