import { readFile } from "node:fs/promises";
import path from "node:path";

export type CardFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700;
  style: "normal";
};

/**
 * Where the share-card font comes from, in order:
 *
 * 1. `public/fonts` - drop your own file in there and it wins.
 * 2. The Geist regular that Next.js already ships for `next/og`. This is what
 *    lets the card render with zero setup and no network access.
 * 3. `CARD_FONT_URL` - an explicit remote fallback, fetched only when you set it.
 *
 * When none of these resolve we hand `next/og` no fonts at all and it falls
 * back to its own default, so a missing font degrades instead of throwing.
 */
const PUBLIC_CANDIDATES = ["Inter-Regular.ttf", "Inter.ttf", "NotoSans-Regular.ttf", "Geist-Regular.ttf"];

/** Next.js compiles a copy of the OG renderer's font into its own dist. */
const NEXT_COMPILED_FONT = path.join(
  "node_modules",
  "next",
  "dist",
  "compiled",
  "@vercel",
  "og",
  "Geist-Regular.ttf",
);

let cache: Promise<CardFont[]> | null = null;

async function toArrayBuffer(data: Buffer): Promise<ArrayBuffer> {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

async function readFontFile(file: string): Promise<CardFont[] | null> {
  try {
    const data = await readFile(file);
    return [{ name: CARD_FONT_FAMILY, data: await toArrayBuffer(data), weight: 400, style: "normal" }];
  } catch {
    return null;
  }
}

async function fromDisk(): Promise<CardFont[] | null> {
  for (const candidate of PUBLIC_CANDIDATES) {
    const font = await readFontFile(path.join(process.cwd(), "public", "fonts", candidate));
    if (font) return font;
  }
  return readFontFile(path.join(process.cwd(), NEXT_COMPILED_FONT));
}

async function fromNetwork(): Promise<CardFont[] | null> {
  const url = process.env.CARD_FONT_URL?.trim();
  if (!url) return null;

  try {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) return null;
    const data = await response.arrayBuffer();
    return [{ name: CARD_FONT_FAMILY, data, weight: 400, style: "normal" }];
  } catch {
    return null;
  }
}

/** Resolves once per process; returns `[]` when no font could be sourced. */
export function loadCardFonts(): Promise<CardFont[]> {
  cache ??= (async () => (await fromDisk()) ?? (await fromNetwork()) ?? [])();
  return cache;
}

export const CARD_FONT_FAMILY = "Card";
