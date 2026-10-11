import { redirect } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";
import { auth } from "@/lib/auth";
import { resolveWrapped } from "@/lib/serve";
import { lookUpWrapped, signInWithGitHub, signOutOfGitHub } from "./actions";

type HomePageProps = {
  searchParams: Promise<{ error?: string }>;
};

const HIGHLIGHTS = [
  {
    title: "The numbers",
    body: "Contributions, commits, pull requests, issues, and reviews for the last twelve months, or any calendar year.",
  },
  {
    title: "The shape of the year",
    body: "Your busiest month, favourite weekday, longest streak, and a full contribution heatmap.",
  },
  {
    title: "The receipts",
    body: "Top languages by share of code, your most active repositories, stars, and followers.",
  },
];

const ERROR_COPY: Record<string, string> = {
  "unknown-user": "That does not look like a GitHub username. Try again, for example @octocat.",
};

const primaryButton =
  "focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-60";
const ghostButton =
  "focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white/5 px-6 py-3 text-sm font-semibold text-mist transition hover:bg-white/10";

export default async function HomePage({ searchParams }: HomePageProps) {
  const [{ error }, session] = await Promise.all([searchParams, auth()]);
  const login = session?.user?.login;
  /** Public lookups need a token to build someone else's snapshot. */
  const publicLookupEnabled = Boolean(process.env.GITHUB_PUBLIC_TOKEN?.trim());

  if (login && session?.accessToken && !session.error) {
    const lookup = await resolveWrapped(login);
    if (lookup.status === "ok") {
      redirect(`/wrapped/${encodeURIComponent(lookup.wrapped.profile.username)}`);
    }
  }

  const errorMessage = session?.error
    ? "Your GitHub session expired. Sign in again to rebuild your wrapped."
    : error
      ? ERROR_COPY[error]
      : undefined;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-6 py-20 sm:py-24">
      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-muted">
            Year in review
          </p>
        </div>

        <h1 className="text-balance text-5xl font-bold leading-[1.02] text-white sm:text-6xl">
          Your year in code, <span className="gradient-text">wrapped</span>.
        </h1>

        <p className="max-w-xl text-base leading-relaxed text-mist/80">
          Connect GitHub and we read your contributions, the last twelve months or a single calendar year, then
          turn them into a set of animated stat cards and a shareable image. Read-only access, nothing stored
          beyond the session.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <form action={signInWithGitHub}>
            <button type="submit" className={primaryButton}>
              Connect GitHub
            </button>
          </form>

          {session ? (
            <form action={signOutOfGitHub}>
              <button type="submit" className={ghostButton}>
                {login ? `Sign out @${login}` : "Sign out"}
              </button>
            </form>
          ) : null}
        </div>

        {errorMessage ? (
          <p className="max-w-xl rounded-2xl border border-line bg-white/5 px-4 py-3 text-sm text-sun">
            {errorMessage}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <article key={item.title} className="card-surface flex flex-col gap-2 p-6">
            <h2 className="text-sm font-semibold text-white">{item.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="card-surface flex flex-col gap-4 p-6 sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-white">Already have a link?</h2>
          <p className="text-sm text-muted">
            Public wrappeds live at a stable URL, so you can look one up without signing in.
          </p>
        </div>

        {publicLookupEnabled ? (
          <form action={lookUpWrapped} className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="login" className="sr-only">
              GitHub username
            </label>
            <input
              id="login"
              name="login"
              placeholder="octocat"
              autoComplete="off"
              spellCheck={false}
              className="focus-ring min-w-0 flex-1 rounded-full border border-line bg-black/25 px-5 py-3 font-mono text-sm text-mist placeholder:text-muted/70"
            />
            <button type="submit" className={ghostButton}>
              View wrapped
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted">
            Set <code className="font-mono text-xs text-mist">GITHUB_PUBLIC_TOKEN</code> to enable public lookups
            without signing in.
          </p>
        )}
      </section>

      <footer className="text-xs text-muted">
        Built by{" "}
        <a
          href="https://github.com/codewithsamzy"
          target="_blank"
          rel="noreferrer"
          className="focus-ring rounded text-mist underline decoration-line underline-offset-4 transition hover:text-white"
        >
          @codewithsamzy
        </a>
        . Inspired by the Wrapped format. Not affiliated with or endorsed by GitHub.
      </footer>
    </main>
  );
}
