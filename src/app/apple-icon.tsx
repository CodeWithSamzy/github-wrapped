import { ImageResponse } from "next/og";
import { LogoPlate } from "@/components/LogoMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const runtime = "nodejs";

/**
 * iOS home-screen icon. The plate runs edge to edge with no corner radius or
 * border, because iOS applies its own mask on top.
 */
export default function AppleIcon() {
  return new ImageResponse(<LogoPlate size={180} radius={0} border={false} />, size);
}