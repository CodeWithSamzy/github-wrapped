import NextAuth, { type DefaultSession, type Session } from "next-auth";
import GitHub from "next-auth/providers/github";
import type { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    /** GitHub OAuth token, forwarded to the GraphQL API for this request only. */
    accessToken?: string;
    /** Set when the stored token could not be refreshed; the UI asks for a re-login. */
    error?: "RefreshAccessTokenError";
    user: { login?: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    /** Epoch milliseconds; absent for non-expiring GitHub tokens. */
    accessTokenExpires?: number;
    /** GitHub login, captured from the OAuth profile. */
    login?: string;
    error?: "RefreshAccessTokenError";
  }
}

const GITHUB_TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";

/**
 * Reads the minimum scope needed: `read:user` unlocks `contributionsCollection`,
 * `user:email` lets Auth.js populate the profile email.
 */
const GITHUB_SCOPE = "read:user user:email";

/** The subset of JWT claims the refresh flow rewrites. */
type RefreshResult = Pick<JWT, "refreshToken" | "accessTokenExpires" | "error"> & { accessToken: string };

/**
 * GitHub OAuth app tokens do not expire unless token expiration is enabled on
 * the app. When it is, Auth.js hands us a refresh token and we rotate here.
 */
async function refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
  try {
    const response = await fetch(GITHUB_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.AUTH_GITHUB_ID,
        client_secret: process.env.AUTH_GITHUB_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const payload = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };

    if (!response.ok || !payload.access_token) {
      throw new Error(payload.error ?? `token endpoint returned ${response.status}`);
    }

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? refreshToken,
      accessTokenExpires: payload.expires_in ? Date.now() + payload.expires_in * 1000 : undefined,
    };
  } catch (error) {
    console.error("[auth] failed to refresh GitHub access token:", error);
    return { accessToken: "", error: "RefreshAccessTokenError" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: { params: { scope: GITHUB_SCOPE } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token ?? undefined;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined;
      }

      if (profile && typeof profile.login === "string") {
        token.login = profile.login;
      }

      if (!token.accessTokenExpires || Date.now() < token.accessTokenExpires - 60_000) {
        return token;
      }

      if (!token.refreshToken) {
        return { ...token, accessToken: undefined, error: "RefreshAccessTokenError" };
      }

      const refreshed = await refreshAccessToken(token.refreshToken);
      return { ...token, ...refreshed };
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error as Session["error"];
      if (session.user && typeof token.login === "string") {
        session.user.login = token.login;
      }
      return session;
    },
  },
});
