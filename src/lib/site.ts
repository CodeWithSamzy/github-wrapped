const FALLBACK_URL = "http://localhost:3000";

/**
 * The app's own origin, used for absolute share links and OG metadata.
 * Prefers the explicit env var, then Vercel's, then localhost.
 */
export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    try {
      return new URL(explicit).origin;
    } catch {
      /* fall through */
    }
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    try {
      return new URL(`https://${vercel}`).origin;
    } catch {
      /* fall through */
    }
  }

  return FALLBACK_URL;
}

/** Path of a public wrapped page; omit `year` for the rolling twelve months. */
export function wrappedPath(username: string, year?: number): string {
  const login = encodeURIComponent(username);
  return year === undefined ? `/wrapped/${login}` : `/wrapped/${login}/${year}`;
}

/** Path of the PNG share card; omit `year` for the rolling twelve months. */
export function wrappedCardPath(username: string, year?: number): string {
  const path = `/api/wrapped/${encodeURIComponent(username)}/card`;
  return year === undefined ? path : `${path}?year=${year}`;
}

/** Absolute, shareable URL for a public wrapped page. */
export function wrappedUrl(username: string, year?: number): string {
  return new URL(wrappedPath(username, year), appBaseUrl()).toString();
}

/** Absolute URL of the PNG share card. */
export function wrappedCardUrl(username: string, year?: number): string {
  return new URL(wrappedCardPath(username, year), appBaseUrl()).toString();
}