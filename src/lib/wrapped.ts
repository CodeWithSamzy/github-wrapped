import { fetchViewer, fetchWrappedInput, type GraphQLRequestOptions } from "./github";
import { computeStats } from "./stats";
import { WRAPPED_VERSION } from "./snapshot";
import type { Wrapped, WrappedInput, WrappedWindow } from "./types";
import { buildWindow } from "./window";

/** Pure assembly step: normalised input plus a window becomes a `Wrapped`. */
export function createWrapped(input: WrappedInput, window: WrappedWindow, generatedAt = new Date()): Wrapped {
  return {
    version: WRAPPED_VERSION,
    profile: {
      username: input.username,
      name: input.name,
      avatarUrl: input.avatarUrl,
    },
    window,
    generatedAt: generatedAt.toISOString(),
    stats: computeStats(input),
  };
}

/** Builds the wrapped for whoever owns the given token. */
export async function buildWrappedForViewer(
  token: string,
  options?: { now?: Date; request?: GraphQLRequestOptions },
): Promise<Wrapped> {
  const viewer = await fetchViewer(token, options?.request);
  const window = buildWindow(options?.now);
  const input = await fetchWrappedInput(token, viewer.login, window, options?.request);
  return createWrapped(input, window, options?.now);
}

/** Builds the wrapped for an arbitrary public login. */
export async function buildWrappedForLogin(
  token: string,
  login: string,
  options?: { now?: Date; request?: GraphQLRequestOptions },
): Promise<Wrapped> {
  const window = buildWindow(options?.now);
  const input = await fetchWrappedInput(token, login, window, options?.request);
  return createWrapped(input, window, options?.now);
}
