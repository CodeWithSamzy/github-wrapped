import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WrappedView } from "@/components/WrappedView";
import { normalizeLogin } from "@/lib/serve";
import { wrappedCardUrl, wrappedPath, wrappedUrl } from "@/lib/site";
import { parseYear } from "@/lib/window";

type WrappedYearPageProps = {
  params: Promise<{ username: string; year: string }>;
};

export async function generateMetadata({ params }: WrappedYearPageProps): Promise<Metadata> {
  const { username, year: rawYear } = await params;
  const login = normalizeLogin(username) ?? username;
  const year = parseYear(rawYear);

  if (year === null) {
    return { title: `@${login}`, description: `${login} on GitHub, wrapped.`, robots: { index: false } };
  }

  const title = `@${login} in ${year}`;
  const description = `Everything ${login} shipped on GitHub in ${year}, wrapped.`;

  return {
    title,
    description,
    alternates: { canonical: wrappedPath(login, year) },
    openGraph: {
      title: `${title} on GitHub Wrapped`,
      description,
      url: wrappedUrl(login, year),
      images: [{ url: wrappedCardUrl(login, year), width: 1200, height: 630, alt: `${title} - GitHub Wrapped card` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} on GitHub Wrapped`,
      description,
      images: [wrappedCardUrl(login, year)],
    },
  };
}

export default async function WrappedYearPage({ params }: WrappedYearPageProps) {
  const { username, year: rawYear } = await params;
  const year = parseYear(rawYear);
  if (year === null) notFound();

  return <WrappedView username={username} year={year} />;
}