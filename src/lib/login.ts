/**
 * GitHub login rules.
 *
 * GitHub's own rules are a little more permissive than this (it also allows
 * logins up to 39 characters with single, non-edge hyphens), which is exactly
 * what the pattern encodes. Being strict here means impossible input is
 * rejected before it is interpolated into an outbound API call or a URL.
 */
const LOGIN_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

/** Trims decoration (`@henrik`), rejects anything that is not a plausible login. */
export function normalizeLogin(raw: string): string | null {
  const login = raw.trim().replace(/^@+/, "");
  return LOGIN_PATTERN.test(login) ? login : null;
}
