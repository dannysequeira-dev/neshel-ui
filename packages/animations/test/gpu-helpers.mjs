// Fake WebGL2 for jsdom (Phase 016, research R17): records calls, counts live objects and simulates the failures the
// GPU Surface Manager must survive — no WebGL2, link failure, texture SecurityError, context loss/restore. Real
// rendering is verified in the lab (Chromium/SwiftShader, Firefox, WebKit) with readPixels probes.

const CONSTANTS = {
  VERTEX_SHADER: 0x8b31,
  FRAGMENT_SHADER: 0x8b30,
  LINK_STATUS: 0x8b82,
  COMPILE_STATUS: 0x8b81,
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
  STATIC_DRAW: 0x88e4,
  TEXTURE_2D: 0x0de1,
  TEXTURE0: 0x84c0,
  RGBA: 0x1908,
  UNSIGNED_BYTE: 0x1401,
  FLOAT: 0x1406,
  UNSIGNED_SHORT: 0x1403,
  TRIANGLES: 0x0004,
  TRIANGLE_STRIP: 0x0005,
  COLOR_BUFFER_BIT: 0x4000,
  DEPTH_BUFFER_BIT: 0x0100,
  DEPTH_TEST: 0x0b71,
  LINEAR: 0x2601,
  CLAMP_TO_EDGE: 0x812f,
  REPEAT: 0x2901,
  MIRRORED_REPEAT: 0x8370,
  TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_MAG_FILTER: 0x2800,
  TEXTURE_WRAP_S: 0x2802,
  TEXTURE_WRAP_T: 0x2803,
  UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
  MAX_TEXTURE_SIZE: 0x0d33,
};

export function installFakeGpu({ webgl2 = true } = {}) {
  const proto = window.HTMLCanvasElement.prototype;
  const original = proto.getContext;
  const state = {
    webgl2,
    failLink: false,
    textureError: undefined, // e.g. "SecurityError"
    contexts: [],
    live: { programs: 0, shaders: 0, buffers: 0, textures: 0, arrays: 0 },
    draws: 0,
    lostExtensions: 0,
  };
  function makeGl(canvas) {
    let lost = false;
    const own = { programs: 0, shaders: 0, buffers: 0, textures: 0, arrays: 0 };
    const calls = [];
    const record =
      (name) =>
      (...args) => {
        calls.push([name, ...args]);
      };
    const create = (kind) => () => {
      state.live[kind]++;
      own[kind]++;
      return { kind };
    };
    const remove = (kind) => (obj) => {
      if (!obj || lost) return;
      state.live[kind]--;
      own[kind]--;
    };
    const gl = {
      ...CONSTANTS,
      canvas,
      calls,
      isContextLost: () => lost,
      getParameter: (p) => (p === CONSTANTS.MAX_TEXTURE_SIZE ? 4096 : null),
      getExtension(name) {
        if (name !== "WEBGL_lose_context") return null;
        return {
          loseContext() {
            if (lost) return;
            lost = true;
            state.lostExtensions++;
            // Objects of a lost context are gone (as in a real browser).
            for (const kind of Object.keys(own)) {
              state.live[kind] -= own[kind];
              own[kind] = 0;
            }
            const event = new window.Event("webglcontextlost", { cancelable: true });
            canvas.dispatchEvent(event);
          },
          restoreContext() {
            if (!lost) return;
            lost = false;
            canvas.dispatchEvent(new window.Event("webglcontextrestored"));
          },
        };
      },
      createShader: create("shaders"),
      deleteShader: remove("shaders"),
      shaderSource: record("shaderSource"),
      compileShader: record("compileShader"),
      getShaderParameter: () => true,
      getShaderInfoLog: () => "",
      createProgram: create("programs"),
      deleteProgram: remove("programs"),
      attachShader: record("attachShader"),
      linkProgram: record("linkProgram"),
      getProgramParameter: () => !state.failLink,
      getProgramInfoLog: () => (state.failLink ? "fake link error" : ""),
      useProgram: record("useProgram"),
      createBuffer: create("buffers"),
      deleteBuffer: remove("buffers"),
      bindBuffer: record("bindBuffer"),
      bufferData: record("bufferData"),
      createVertexArray: create("arrays"),
      deleteVertexArray: remove("arrays"),
      bindVertexArray: record("bindVertexArray"),
      getAttribLocation: () => 0,
      enableVertexAttribArray: record("enableVertexAttribArray"),
      vertexAttribPointer: record("vertexAttribPointer"),
      getUniformLocation: (_p, name) => ({ name }),
      uniform1i: record("uniform1i"),
      uniform1f: record("uniform1f"),
      uniform2f: record("uniform2f"),
      uniform3f: record("uniform3f"),
      uniform4f: record("uniform4f"),
      uniform4fv: record("uniform4fv"),
      createTexture: create("textures"),
      deleteTexture: remove("textures"),
      bindTexture: record("bindTexture"),
      activeTexture: record("activeTexture"),
      pixelStorei: record("pixelStorei"),
      texImage2D(...args) {
        if (state.textureError) {
          const error = new Error("fake texture error");
          error.name = state.textureError;
          throw error;
        }
        calls.push(["texImage2D", ...args]);
      },
      texParameteri: record("texParameteri"),
      viewport: record("viewport"),
      clearColor: record("clearColor"),
      clear: record("clear"),
      enable: record("enable"),
      disable: record("disable"),
      drawArrays(...args) {
        state.draws++;
        calls.push(["drawArrays", ...args]);
      },
      drawElements(...args) {
        state.draws++;
        calls.push(["drawElements", ...args]);
      },
      readPixels(_x, _y, _w, _h, _f, _t, out) {
        out.set([10, 20, 30, 255]);
      },
    };
    return gl;
  }
  proto.getContext = function (type) {
    if (type === "webgl2") {
      if (!state.webgl2) return null;
      if (!this.__gl) {
        this.__gl = makeGl(this);
        state.contexts.push(this.__gl);
      }
      return this.__gl;
    }
    if (type === "2d") {
      if (this.__ctx) return this.__ctx;
      const ctx = {
        canvas: this,
        fillStyle: "#000000",
        drawImage() {},
        fillRect() {},
        createImageData: (w, h) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
        }),
        putImageData() {},
        getImageData: (_x, _y, w, h) => {
          const data = new Uint8ClampedArray(w * h * 4);
          for (let i = 0; i < data.length; i += 4) data[i] = (i / 4) % 256;
          return { width: w, height: h, data };
        },
      };
      this.__ctx = ctx;
      return ctx;
    }
    return null;
  };
  return {
    state,
    restore() {
      proto.getContext = original;
    },
  };
}

/** A decoded `<img>` (complete, natural size) inside a sized frame. */
export function imageFrame({
  width = 320,
  height = 240,
  naturalWidth = 640,
  naturalHeight = 480,
} = {}) {
  const frame = document.createElement("div");
  frame.className = "neshel-gpu-frame";
  const img = document.createElement("img");
  img.setAttribute("alt", "A mountain lake");
  img.setAttribute("src", "lake.jpg");
  Object.defineProperty(img, "complete", { value: true, configurable: true });
  Object.defineProperty(img, "naturalWidth", { value: naturalWidth, configurable: true });
  Object.defineProperty(img, "naturalHeight", { value: naturalHeight, configurable: true });
  frame.append(img);
  Object.defineProperty(frame, "clientWidth", { value: width, configurable: true });
  Object.defineProperty(frame, "clientHeight", { value: height, configurable: true });
  document.body.append(frame);
  return { frame, img };
}

/** A canvas map/depth source with a given size (the fake 2D context draws nothing). */
export function sizedCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
