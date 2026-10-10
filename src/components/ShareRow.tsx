"use client";

import { useEffect, useState } from "react";

type ShareRowProps = {
  username: string;
  url: string;
  cardUrl: string;
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(field);
      return ok;
    } catch {
      return false;
    }
  }
}

function scrollDeckToStart() {
  const deck = document.querySelector<HTMLElement>("[data-deck]");
  if (!deck) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  deck.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
}

const buttonBase =
  "focus-ring inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

export function ShareRow({ username, url, cardUrl }: ShareRowProps) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);
  /** Resolved on the client so the copied link is always absolute. */
  const [absoluteUrl, setAbsoluteUrl] = useState(url);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    try {
      setAbsoluteUrl(new URL(url, window.location.origin).toString());
    } catch {
      setAbsoluteUrl(url);
    }
  }, [url]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    const ok = await copyText(absoluteUrl);
    setCopied(ok);
    setManualCopy(!ok);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `@${username} on GitHub Wrapped`,
        text: `My last twelve months of code, wrapped.`,
        url: absoluteUrl,
      });
    } catch {
      /* the user dismissed the share sheet */
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className={`${buttonBase} bg-white text-ink hover:bg-mist`}
          aria-live="polite"
        >
          {copied ? "Link copied" : "Copy link"}
        </button>

        {canShare ? (
          <button
            type="button"
            onClick={handleShare}
            className={`${buttonBase} border border-line bg-white/5 text-mist hover:bg-white/10`}
          >
            Share
          </button>
        ) : null}

        <a
          href={cardUrl}
          download={`github-wrapped-${username}.png`}
          className={`${buttonBase} border border-line bg-white/5 text-mist hover:bg-white/10`}
        >
          Download PNG
        </a>

        <button
          type="button"
          onClick={scrollDeckToStart}
          className={`${buttonBase} border border-line bg-white/5 text-mist hover:bg-white/10`}
        >
          Back to top
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-line bg-black/25 px-3 py-2">
        <input
          readOnly
          value={absoluteUrl}
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 bg-transparent font-mono text-xs text-muted outline-none"
          aria-label="Public link to this wrapped"
        />
      </div>

      {manualCopy ? (
        <p className="text-xs text-sun">Copying was blocked by the browser - select the link above and press Ctrl+C.</p>
      ) : null}
    </div>
  );
}
