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

/** Absolute, shareable URL for a public wrapped page. */
export function wrappedUrl(username: string): string {
  return new URL(`/wrapped/${encodeURIComponent(username)}`, appBaseUrl()).toString();
}

/** Absolute URL of the PNG share card. */
export function wrappedCardUrl(username: string): string {
  return new URL(`/api/wrapped/${encodeURIComponent(username)}/card`, appBaseUrl()).toString();
}
