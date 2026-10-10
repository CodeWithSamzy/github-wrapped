import { auth } from "./auth";
import { GitHubApiError } from "./github";
import { normalizeLogin } from "./login";
import { readSnapshot, writeSnapshot } from "./store";
import type { Wrapped } from "./types";
import { buildWrappedForLogin, buildWrappedForViewer } from "./wrapped";

export { normalizeLogin };

export type ResolvedWrapped = {
  status: "ok";
  wrapped: Wrapped;
  /** Where the data came from on this request. */
  source: "cache" | "github";
  /**
   * True when a past-its-TTL snapshot had to be served because a fresh one
   * could not be built (rate limit, network failure). The UI surfaces this.
   */
  stale: boolean;
};

export type WrappedLookupFailure =
  | { status: "not-found" }
  | { status: "unavailable" }
  | { status: "rate-limited"; message: string }
  | { status: "error"; message: string };

export type WrappedLookup = ResolvedWrapped | WrappedLookupFailure;

/**
 * Resolves a wrapped for a login, preferring the cached snapshot and falling
 * back to GitHub when the cache is cold or expired.
 *
 * Credentials, in order: the signed-in viewer's token when they are looking at
 * their own wrapped, then `GITHUB_PUBLIC_TOKEN` for anyone else. Neither is
 * persisted; they live only for the duration of the request.
 */
export async function resolveWrapped(raw: string): Promise<WrappedLookup> {
  const login = normalizeLogin(raw);
  if (!login) return { status: "not-found" };

  const cached = await readSnapshot(login);
  if (cached?.fresh) {
    return { status: "ok", wrapped: cached.wrapped, source: "cache", stale: false };
  }

  const session = await auth();
  const viewerLogin = session?.user?.login;
  const viewerToken = session?.error ? undefined : session?.accessToken;
  const publicToken = process.env.GITHUB_PUBLIC_TOKEN?.trim() || undefined;

  const isViewer = Boolean(viewerLogin && viewerToken && viewerLogin.toLowerCase() === login.toLowerCase());
  const token = isViewer ? viewerToken : publicToken;

  if (!token) {
    if (cached) return { status: "ok", wrapped: cached.wrapped, source: "cache", stale: true };
    return { status: "unavailable" };
  }

  try {
    const wrapped = isViewer
      ? await buildWrappedForViewer(token)
      : await buildWrappedForLogin(token, login);
    // Only public builds are cached. A viewer's own build is authenticated, so
    // GitHub folds in their private contributions there; caching it would then
    // serve those totals to everyone who opens /wrapped/<login>.
    if (!isViewer) await writeSnapshot(wrapped);
    return { status: "ok", wrapped, source: "github", stale: false };
  } catch (error) {
    if (error instanceof GitHubApiError) {
      if (error.isNotFound) return { status: "not-found" };
      if (error.isRateLimited) {
        if (cached) return { status: "ok", wrapped: cached.wrapped, source: "cache", stale: true };
        return { status: "rate-limited", message: error.userMessage };
      }
    }

    console.error("[serve] failed to build wrapped:", error);
    if (cached) return { status: "ok", wrapped: cached.wrapped, source: "cache", stale: true };
    return { status: "error", message: "The wrapped could not be built right now. Please try again shortly." };
  }
}
