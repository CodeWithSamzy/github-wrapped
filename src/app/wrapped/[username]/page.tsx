import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WrappedDeck } from "@/components/WrappedDeck";
import { normalizeLogin, resolveWrapped, type WrappedLookupFailure } from "@/lib/serve";
import { wrappedCardUrl, wrappedUrl } from "@/lib/site";

type WrappedPageProps = {
  params: Promise<{ username: string }>;
};

/**
 * Failure states that still have a page worth rendering. A login that does not
 * exist is a genuine 404 and is routed through `notFound()` instead.
 */
type RenderableFailure = Exclude<WrappedLookupFailure, { status: "not-found" }>;

const cardLink =
  "focus-ring inline-flex items-center justify-center rounded-full border border-line bg-white/5 px-5 py-3 text-sm font-semibold text-mist transition hover:bg-white/10";

function failureCopy(failure: RenderableFailure, login: string) {
  switch (failure.status) {
    case "unavailable":
      return {
        heading: "This wrapped is not ready yet",
        body: `@${login} has not generated a public wrapped, and this deployment has no GITHUB_PUBLIC_TOKEN set to build one on demand.`,
      };
    case "rate-limited":
      return {
        heading: "GitHub is rate limiting us",
        body: failure.message,
      };
    default:
      return {
        heading: "Something went wrong",
        body: failure.message,
      };
  }
}

export async function generateMetadata({ params }: WrappedPageProps): Promise<Metadata> {
  const { username } = await params;
  const login = normalizeLogin(username) ?? username;
  const title = `@${login}`;
  const description = `The last twelve months of ${login} on GitHub, wrapped.`;

  return {
    title,
    description,
    alternates: { canonical: `/wrapped/${encodeURIComponent(login)}` },
    openGraph: {
      title: `${title} on GitHub Wrapped`,
      description,
      url: wrappedUrl(login),
      images: [{ url: wrappedCardUrl(login), width: 1200, height: 630, alt: `${title}'s GitHub Wrapped card` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} on GitHub Wrapped`,
      description,
      images: [wrappedCardUrl(login)],
    },
  };
}

export default async function WrappedPage({ params }: WrappedPageProps) {
  const { username } = await params;
  const lookup = await resolveWrapped(username);

  if (lookup.status === "ok") {
    return (
      <main>
        {lookup.stale ? (
          <p className="fixed left-1/2 top-6 z-30 -translate-x-1/2 rounded-full border border-line bg-ink-2/90 px-4 py-1.5 text-xs text-sun backdrop-blur">
            Showing a cached copy, GitHub was unreachable for a refresh.
          </p>
        ) : null}
        <WrappedDeck wrapped={lookup.wrapped} />
      </main>
    );
  }

  if (lookup.status === "not-found") {
    return notFound();
  }

  const login = normalizeLogin(username) ?? username;
  const { heading, body } = failureCopy(lookup, login);

  return (
    <main className="grid min-h-dvh place-items-center px-6 py-20">
      <div className="card-surface flex w-full max-w-lg flex-col gap-4 p-8">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-muted">GitHub Wrapped</p>
        <h1 className="text-3xl font-bold text-white">{heading}</h1>
        <p className="text-sm leading-relaxed text-mist/80">{body}</p>
        <div className="pt-2">
          <Link href="/" className={cardLink}>
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
