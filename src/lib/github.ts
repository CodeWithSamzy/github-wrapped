import type { CalendarDay, LanguageInput, RepoInput, WrappedInput } from "./types";

const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

/** Never sleep longer than this waiting for a rate limit; fail fast instead. */
const MAX_BACKOFF_MS = 20_000;

export type GitHubApiErrorOptions = {
  status?: number | null;
  type?: string | null;
  retryAfterMs?: number | null;
  resetAt?: Date | null;
  cause?: unknown;
};

export class GitHubApiError extends Error {
  readonly status: number | null;
  readonly type: string | null;
  readonly retryAfterMs: number | null;
  readonly resetAt: Date | null;

  constructor(message: string, options: GitHubApiErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "GitHubApiError";
    this.status = options.status ?? null;
    this.type = options.type ?? null;
    this.retryAfterMs = options.retryAfterMs ?? null;
    this.resetAt = options.resetAt ?? null;
  }

  get isRateLimited(): boolean {
    return this.type === "RATE_LIMITED" || this.status === 429 || (this.status === 403 && this.retryAfterMs !== null);
  }

  get isNotFound(): boolean {
    return this.type === "NOT_FOUND" || this.status === 404;
  }

  /** A short, user-facing explanation safe to render in the UI. */
  get userMessage(): string {
    if (this.isRateLimited) {
      const when = this.resetAt ? ` Try again after ${this.resetAt.toISOString()}.` : " Try again in a few minutes.";
      return `GitHub's API rate limit was reached.${when}`;
    }
    if (this.isNotFound) return "That GitHub account could not be found.";
    return "GitHub returned an unexpected response. Please try again.";
  }
}

type GraphQLError = {
  message: string;
  type?: string | null;
  path?: (string | number)[] | null;
};

type GraphQLResponse<T> = {
  data?: T | null;
  errors?: GraphQLError[];
};

function parseRetryAfterMs(headers: Headers): number | null {
  const retryAfter = headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }

  const reset = headers.get("x-ratelimit-reset");
  const remaining = headers.get("x-ratelimit-remaining");
  if (reset && remaining === "0") {
    const epochSeconds = Number(reset);
    if (Number.isFinite(epochSeconds)) return Math.max(0, epochSeconds * 1000 - Date.now());
  }

  return null;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type GraphQLRequestOptions = {
  /** Total attempts, including the first. */
  attempts?: number;
  signal?: AbortSignal;
};

/**
 * Thin GraphQL transport for the GitHub API.
 *
 * GitHub reports throttling in two very different ways — an HTTP 403/429 with
 * `Retry-After` headers, or an HTTP 200 whose body carries a `RATE_LIMITED`
 * entry in `errors`. Both are normalised into `GitHubApiError`, and both are
 * retried with backoff when the wait is short enough to be worth it.
 */
export async function githubGraphQL<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
  { attempts = 3, signal }: GraphQLRequestOptions = {},
): Promise<T> {
  let lastError: GitHubApiError | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `bearer ${token}`,
          "content-type": "application/json",
          accept: "application/json",
          "user-agent": "github-wrapped",
        },
        body: JSON.stringify({ query, variables }),
        signal,
        cache: "no-store",
      });
    } catch (cause) {
      if (attempt === attempts) {
        throw new GitHubApiError("Could not reach the GitHub API.", { cause });
      }
      await sleep(250 * 2 ** (attempt - 1));
      continue;
    }

    const retryAfterMs = parseRetryAfterMs(response.headers);
    const resetHeader = response.headers.get("x-ratelimit-reset");
    const resetAt = resetHeader ? new Date(Number(resetHeader) * 1000) : null;

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const error = new GitHubApiError(
        `GitHub API request failed with status ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
        { status: response.status, retryAfterMs, resetAt },
      );

      if (error.isRateLimited && attempt < attempts && retryAfterMs !== null && retryAfterMs <= MAX_BACKOFF_MS) {
        lastError = error;
        await sleep(retryAfterMs + 250);
        continue;
      }
      throw error;
    }

    const payload = (await response.json()) as GraphQLResponse<T>;
    const errors = payload.errors ?? [];

    if (errors.length > 0) {
      const rateLimited = errors.find((entry) => entry.type === "RATE_LIMITED");
      const notFound = errors.find((entry) => entry.type === "NOT_FOUND");
      const type = notFound ? "NOT_FOUND" : (rateLimited?.type ?? errors[0]?.type ?? null);
      const error = new GitHubApiError(errors.map((entry) => entry.message).join("; "), {
        status: response.status,
        type,
        retryAfterMs,
        resetAt,
      });

      if (rateLimited && attempt < attempts && (retryAfterMs === null || retryAfterMs <= MAX_BACKOFF_MS)) {
        lastError = error;
        await sleep(retryAfterMs ?? 1000 * 2 ** (attempt - 1));
        continue;
      }
      throw error;
    }

    if (!payload.data) {
      throw new GitHubApiError("GitHub returned an empty response body.", { status: response.status });
    }

    return payload.data;
  }

  throw lastError ?? new GitHubApiError("GitHub API request failed after repeated attempts.");
}

const WRAPPED_QUERY = /* GraphQL */ `
  query Wrapped($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      login
      name
      avatarUrl
      followers {
        totalCount
      }
      repositories(first: 1, ownerAffiliations: OWNER) {
        totalCount
      }
      starrableRepositories: repositories(
        first: 100
        ownerAffiliations: OWNER
        isFork: false
        orderBy: { field: STARGAZERS, direction: DESC }
      ) {
        nodes {
          nameWithOwner
          stargazerCount
        }
      }
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              weekday
              contributionCount
            }
          }
        }
        commitContributionsByRepository(maxRepositories: 100) {
          contributions {
            totalCount
          }
          repository {
            nameWithOwner
            stargazerCount
            isFork
            languages(first: 12, orderBy: { field: SIZE, direction: DESC }) {
              edges {
                size
                node {
                  name
                  color
                }
              }
            }
          }
        }
      }
    }
  }
`;

type RawUser = {
  login: string;
  name: string | null;
  avatarUrl: string;
  followers: { totalCount: number };
  repositories: { totalCount: number };
  starrableRepositories: { nodes: { nameWithOwner: string; stargazerCount: number }[] | null } | null;
  contributionsCollection: {
    totalCommitContributions: number;
    totalIssueContributions: number;
    totalPullRequestContributions: number;
    totalPullRequestReviewContributions: number;
    restrictedContributionsCount: number;
    contributionCalendar: {
      totalContributions: number;
      weeks: { contributionDays: { date: string; weekday: number; contributionCount: number }[] }[];
    };
    commitContributionsByRepository: {
      contributions: { totalCount: number };
      repository: {
        nameWithOwner: string;
        stargazerCount: number;
        isFork: boolean;
        languages: { edges: ({ size: number; node: { name: string; color: string | null } } | null)[] | null } | null;
      };
    }[];
  };
};

type RawWrappedQuery = { user: RawUser | null };

/** Flattens the week/day grid and drops any duplicate dates. */
function flattenCalendar(raw: RawUser["contributionsCollection"]["contributionCalendar"]): CalendarDay[] {
  const seen = new Map<string, CalendarDay>();
  for (const week of raw.weeks) {
    for (const day of week.contributionDays) {
      if (seen.has(day.date)) continue;
      seen.set(day.date, { date: day.date, weekday: day.weekday, count: day.contributionCount });
    }
  }
  return [...seen.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function mapRepositories(raw: RawUser["contributionsCollection"]["commitContributionsByRepository"]): RepoInput[] {
  return raw.map(({ contributions, repository }) => {
    const languages: LanguageInput[] = (repository.languages?.edges ?? [])
      .filter((edge): edge is NonNullable<typeof edge> => edge !== null && edge.size > 0)
      .map((edge) => ({ name: edge.node.name, color: edge.node.color, bytes: edge.size }));

    return {
      nameWithOwner: repository.nameWithOwner,
      commits: contributions.totalCount,
      stars: repository.stargazerCount,
      isFork: repository.isFork,
      languages,
    };
  });
}

/**
 * Fetches and normalises one user's activity for a window.
 * Throws `GitHubApiError` with `type: "NOT_FOUND"` when the login does not exist.
 */
export async function fetchWrappedInput(
  token: string,
  login: string,
  window: { from: string; to: string },
  options?: GraphQLRequestOptions,
): Promise<WrappedInput> {
  const data = await githubGraphQL<RawWrappedQuery>(
    token,
    WRAPPED_QUERY,
    { login, from: window.from, to: window.to },
    options,
  );

  if (!data.user) {
    throw new GitHubApiError(`No GitHub user named "${login}".`, { type: "NOT_FOUND", status: 404 });
  }

  const user = data.user;
  const collection = user.contributionsCollection;
  const stars = (user.starrableRepositories?.nodes ?? []).reduce((sum, node) => sum + node.stargazerCount, 0);

  return {
    username: user.login,
    name: user.name,
    avatarUrl: user.avatarUrl,
    followers: user.followers.totalCount,
    ownedRepositories: user.repositories.totalCount,
    stars,
    totals: {
      contributions: collection.contributionCalendar.totalContributions,
      commits: collection.totalCommitContributions,
      pullRequests: collection.totalPullRequestContributions,
      issues: collection.totalIssueContributions,
      reviews: collection.totalPullRequestReviewContributions,
      restricted: collection.restrictedContributionsCount,
    },
    days: flattenCalendar(collection.contributionCalendar),
    repos: mapRepositories(collection.commitContributionsByRepository),
  };
}

const VIEWER_QUERY = /* GraphQL */ `
  query Viewer {
    viewer {
      login
      name
      avatarUrl
    }
  }
`;

export type GitHubViewer = {
  login: string;
  name: string | null;
  avatarUrl: string;
};

/** Resolves the account behind an OAuth access token. */
export async function fetchViewer(token: string, options?: GraphQLRequestOptions): Promise<GitHubViewer> {
  const data = await githubGraphQL<{ viewer: GitHubViewer }>(token, VIEWER_QUERY, {}, options);
  return data.viewer;
}
