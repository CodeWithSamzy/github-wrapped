import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { appBaseUrl } from "@/lib/site";
import "./globals.css";

const description =
  "Sign in with GitHub and get a scrollable year in review of your commits, languages, streaks, and reach, plus a card you can share anywhere.";

export const metadata: Metadata = {
  metadataBase: new URL(appBaseUrl()),
  title: { default: "GitHub Wrapped", template: "%s | GitHub Wrapped" },
  description,
  applicationName: "GitHub Wrapped",
  authors: [{ name: "codewithsamzy", url: "https://github.com/codewithsamzy" }],
  creator: "codewithsamzy",
  publisher: "codewithsamzy",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "GitHub Wrapped",
    title: "GitHub Wrapped",
    description,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#05060f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {/*
        suppressHydrationWarning: browser extensions (Grammarly and friends) inject
        attributes onto <body> before React hydrates, which React reports as a
        mismatch. It is not our markup, so we opt out of the check for this node.
      */}
      <body suppressHydrationWarning>
        <div className="aurora" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
