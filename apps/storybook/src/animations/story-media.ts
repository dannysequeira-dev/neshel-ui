// Generated pictures for the Phase 015 stories (canvas data URLs: no third-party content, CORS-clean).
const cache = new Map<string, string>();

export function picture(label: string, hueA: number, hueB: number, w = 640, h = 400): string {
  const key = `${label}:${hueA}:${hueB}:${w}:${h}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${hueA} 70% 45%)`);
  g.addColorStop(1, `hsl(${hueB} 70% 35%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgb(255 255 255 / 0.25)";
  for (let x = 0; x <= w; x += 40) ctx.strokeRect(x, 0, 0, h);
  for (let y = 0; y <= h; y += 40) ctx.strokeRect(0, y, w, 0);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.fillText(label, 32, h - 40);
  const url = canvas.toDataURL("image/png");
  cache.set(key, url);
  return url;
}
