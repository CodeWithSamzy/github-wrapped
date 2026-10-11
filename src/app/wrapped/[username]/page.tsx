import type { Metadata } from "next";
import { WrappedView } from "@/components/WrappedView";
import { normalizeLogin } from "@/lib/serve";
import { wrappedCardUrl, wrappedUrl } from "@/lib/site";

type WrappedPageProps = {
  params: Promise<{ username: string }>;
};

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
  return <WrappedView username={username} />;
}