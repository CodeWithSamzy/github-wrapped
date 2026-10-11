import type { CSSProperties } from "react";

/**
 * The GitHub Wrapped mark: a wrapped present whose ribbon sweeps through the
 * app's aurora palette.
 *
 * Two renderings of the same geometry live here on purpose. The browser can use
 * SVG, but the ImageResponse routes (`apple-icon`, `opengraph-image`) go through
 * Satori, which only understands a flexbox subset of CSS, so those build the
 * plate out of positioned divs instead.
 */

export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="GitHub Wrapped"
      className={className}
    >
      <defs>
        <linearGradient id="gwTile" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1e2459" />
          <stop offset="0.5" stopColor="#0a0d20" />
          <stop offset="1" stopColor="#05060f" />
        </linearGradient>
        <linearGradient id="gwRibbon" x1="14" y1="10" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7c5cff" />
          <stop offset="0.46" stopColor="#2fe0a8" />
          <stop offset="1" stopColor="#ff5cb8" />
        </linearGradient>
        <clipPath id="gwClip">
          <rect x="3" y="3" width="58" height="58" rx="15" />
        </clipPath>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="15" fill="url(#gwTile)" />
      <g clipPath="url(#gwClip)">
        <rect x="26.5" y="3" width="11" height="58" fill="url(#gwRibbon)" />
        <rect x="3" y="26.5" width="58" height="11" fill="url(#gwRibbon)" />
        <rect x="3" y="39.5" width="58" height="1.5" fill="#ffffff" fillOpacity="0.12" />
        <path d="M32 23.5 40.5 32 32 40.5 23.5 32Z" fill="#05060f" />
        <path d="M32 27.2 36.8 32 32 36.8 27.2 32Z" fill="url(#gwRibbon)" />
        <circle cx="50.5" cy="15" r="2.5" fill="#ffc94d" />
      </g>
      <rect
        x="3.5"
        y="3.5"
        width="57"
        height="57"
        rx="14.5"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.16"
      />
    </svg>
  );
}

const RIBBON = "linear-gradient(135deg, #7c5cff 0%, #2fe0a8 46%, #ff5cb8 100%)";
const TILE = "linear-gradient(150deg, #1e2459 0%, #0a0d20 50%, #05060f 100%)";

/**
 * The mark as a Satori-friendly div composition. Every measurement is the SVG
 * geometry above scaled by `size / 64`.
 */
export function LogoPlate({
  size,
  radius,
  border = true,
}: {
  size: number;
  radius?: number;
  border?: boolean;
}) {
  const unit = size / 64;
  const corner = radius ?? unit * 15;
  const band = unit * 11;
  const offset = unit * 26.5;
  const knot = unit * 12.02;
  const knotAt = unit * (32 - 12.02 / 2);
  const inner = unit * 6.79;
  const innerAt = unit * (32 - 6.79 / 2);
  const spark = unit * 5;

  const layer: CSSProperties = { position: "absolute", display: "flex" };

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: size,
        height: size,
        borderRadius: corner,
        overflow: "hidden",
        backgroundImage: TILE,
        ...(border ? { border: "1px solid rgba(255,255,255,0.16)" } : {}),
      }}
    >
      <div style={{ ...layer, left: offset, top: 0, width: band, height: size, backgroundImage: RIBBON }} />
      <div style={{ ...layer, left: 0, top: offset, width: size, height: band, backgroundImage: RIBBON }} />
      <div
        style={{
          ...layer,
          left: 0,
          top: unit * 39.5,
          width: size,
          height: Math.max(1, unit * 1.5),
          backgroundColor: "rgba(255,255,255,0.12)",
        }}
      />
      <div
        style={{
          ...layer,
          left: knotAt,
          top: knotAt,
          width: knot,
          height: knot,
          backgroundColor: "#05060f",
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{
          ...layer,
          left: innerAt,
          top: innerAt,
          width: inner,
          height: inner,
          backgroundImage: RIBBON,
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{
          ...layer,
          left: unit * 48,
          top: unit * 12.5,
          width: spark,
          height: spark,
          borderRadius: spark / 2,
          backgroundColor: "#ffc94d",
        }}
      />
    </div>
  );
}