const svg = (width: number, height: number, body: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`,
  )}`;

/** A generated picture for the examples (same on the server and the client); use your own image URL. */
export function picture(label: string, hueA: number, hueB: number): string {
  return svg(
    640,
    400,
    `<defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="hsl(${hueA} 70% 35%)"/><stop offset="1" stop-color="hsl(${hueB} 70% 28%)"/></linearGradient></defs><rect width="640" height="400" fill="url(#g)"/><path d="M0 100H640M0 200H640M0 300H640M160 0V400M320 0V400M480 0V400" stroke="#fff" stroke-opacity=".3"/><text x="32" y="360" fill="#fff" font-family="sans-serif" font-size="44" font-weight="700">${label}</text>`,
  );
}

/** A grayscale depth map (white = near) with the same aspect ratio as `picture()`. */
export function depthMap(): string {
  return svg(
    640,
    400,
    `<defs><linearGradient id="r" x2="0" y2="1"><stop stop-color="#202020"/><stop offset="1" stop-color="#808080"/></linearGradient><radialGradient id="d"><stop stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="640" height="400" fill="url(#r)"/><circle cx="320" cy="220" r="180" fill="url(#d)"/>`,
  );
}
