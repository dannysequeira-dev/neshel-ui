import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";

/**
 * Default Open Graph image (1200×630): the approved canonical logo, unchanged, placed on its own
 * ivory background with the tagline. Composition only; the artwork is not altered (BRANDING.md).
 */
export async function GET() {
  const logo = await readFile(join(process.cwd(), "../../assets/brand/neshel-ui-logo.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 56,
        background: "#fbf9f6",
        color: "#0d1b33",
        padding: 48,
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: ImageResponse renders plain elements */}
      <img src={src} width={500} height={500} alt="" style={{ borderRadius: 24 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 520 }}>
        <div style={{ fontSize: 56, fontWeight: 700, color: "#193767" }}>Documentation</div>
        <div style={{ fontSize: 34, color: "#4a5468" }}>
          Modular, accessible and themeable React design system.
        </div>
        <div style={{ fontSize: 28, color: "#8f6d3f" }}>
          Tokens · Layout · Typography · Components · CLI
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
