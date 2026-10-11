import { ImageResponse } from "next/og";
import { LogoPlate } from "@/components/LogoMark";
import { CARD_FONT_FAMILY, loadCardFonts } from "@/lib/card-fonts";

export const alt = "GitHub Wrapped - your year in code, wrapped";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

/**
 * The link-preview card, rendered by Satori through `next/og`. Same aurora
 * recipe as the share card, so a shared link and a downloaded card agree.
 */
const background =
  "radial-gradient(900px 520px at 8% -10%, rgba(124,92,255,0.55), transparent 62%)," +
  "radial-gradient(760px 460px at 96% 6%, rgba(47,224,168,0.28), transparent 58%)," +
  "radial-gradient(900px 600px at 60% 118%, rgba(255,122,198,0.32), transparent 60%)," +
  "linear-gradient(140deg, #06070f 0%, #0d1024 52%, #070812 100%)";

export default async function OpengraphImage() {
  const fonts = await loadCardFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundImage: background,
          color: "#ffffff",
          fontFamily: CARD_FONT_FAMILY,
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
          <LogoPlate size={104} />
          <div style={{ display: "flex", marginLeft: 30, fontSize: 54, fontWeight: 700 }}>GitHub Wrapped</div>
        </div>

        <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.1 }}>
          Your year in code, <span style={{ color: "#2fe0a8" }}>wrapped</span>.
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            fontSize: 26,
            color: "#7d84b0",
          }}
        >
          <div style={{ display: "flex" }}>githubwrapped-app.vercel.app</div>
          <div style={{ display: "flex" }}>@codewithsamzy</div>
        </div>
      </div>
    ),
    { ...size, ...(fonts.length > 0 ? { fonts } : {}) },
  );
}