import Image from "next/image";
import logo from "../../../assets/brand/neshel-ui-logo.png";
import mark from "../../../assets/brand/neshel-ui-mark-256.png";

/**
 * Brand marks come straight from the approved raster assets in assets/brand (docs/BRANDING.md):
 * imported, never redrawn, recoloured or presented as vector artwork. They keep their ivory
 * background, so they sit in a rounded ivory frame in dark mode.
 */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      <Image src={mark} alt="" width={28} height={28} className="rounded-md" priority />
      <span>Neshel-UI</span>
    </span>
  );
}

export function CanonicalLogo({ width = 320, alt }: { width?: number; alt: string }) {
  return (
    <Image src={logo} alt={alt} width={width} height={width} className="rounded-2xl" priority />
  );
}
