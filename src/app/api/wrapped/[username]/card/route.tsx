import { ImageResponse } from "next/og";
import { CARD_HEIGHT, CARD_WIDTH, ShareCard } from "@/components/ShareCard";
import { loadCardFonts } from "@/lib/card-fonts";
import { resolveWrapped } from "@/lib/serve";
import { parseYear } from "@/lib/window";

export const runtime = "nodejs";

type CardRouteProps = {
  params: Promise<{ username: string }>;
};

/**
 * The share card as a PNG, rendered by Satori through `next/og`.
 *
 * The same resolver the page uses feeds this route, so a card request warms the
 * snapshot cache (and vice versa) instead of hitting GitHub twice. Add
 * `?year=2024` for a single calendar year.
 */
export async function GET(request: Request, { params }: CardRouteProps) {
  const { username } = await params;

  const rawYear = new URL(request.url).searchParams.get("year");
  const year = rawYear === null ? undefined : parseYear(rawYear);
  if (year === null) {
    return new Response("Unknown year", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const lookup = await resolveWrapped(username, year);

  if (lookup.status !== "ok") {
    const status = lookup.status === "not-found" || lookup.status === "unavailable" ? 404 : 503;
    const message = lookup.status === "not-found" ? "Unknown GitHub user" : "Wrapped unavailable";
    return new Response(message, {
      status,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const fonts = await loadCardFonts();

  return new ImageResponse(<ShareCard wrapped={lookup.wrapped} />, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    ...(fonts.length > 0 ? { fonts } : {}),
    headers: {
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}