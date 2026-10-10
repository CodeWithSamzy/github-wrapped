#!/usr/bin/env node
/**
 * Copies a font for the share-card renderer into `public/fonts`, where
 * `src/lib/card-fonts.ts` picks it up before anything else. Run with:
 *
 *   npm run fonts
 *
 * Source order:
 *   1. The font bundled inside Next.js for `next/og` (the default). This is
 *      offline and deterministic, and it is the same typeface the renderer
 *      falls back to on its own.
 *   2. `CARD_FONT_URL`, when you want a different typeface.
 *
 * `CARD_FONT_FILENAME` overrides the local file name.
 */
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const TARGET_DIR = path.join(process.cwd(), "public", "fonts");
const FILENAME = process.env.CARD_FONT_FILENAME?.trim() || "Geist-Regular.ttf";
const destination = path.join(TARGET_DIR, FILENAME);

const NEXT_COMPILED_FONT = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "compiled",
  "@vercel",
  "og",
  "Geist-Regular.ttf",
);

const remote = process.env.CARD_FONT_URL?.trim();

await mkdir(TARGET_DIR, { recursive: true });

let bytes;

if (remote) {
  const response = await fetch(remote);
  if (!response.ok) {
    console.error(`Failed to download ${remote}: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  bytes = Buffer.from(await response.arrayBuffer());

  // A font that small is an error page or a redirect, not a typeface.
  if (bytes.byteLength < 1024) {
    console.error(`Downloaded ${bytes.byteLength} bytes from ${remote}; that is too small to be a font.`);
    process.exit(1);
  }

  await writeFile(destination, bytes);
} else {
  try {
    await copyFile(NEXT_COMPILED_FONT, destination);
  } catch {
    console.error(`No bundled font at ${path.relative(process.cwd(), NEXT_COMPILED_FONT)}.`);
    console.error("Set CARD_FONT_URL to download one instead.");
    process.exit(1);
  }
  bytes = await readFile(destination);
}

const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
console.log(`Saved ${path.relative(process.cwd(), destination)} (${bytes.byteLength} bytes, sha256:${digest})`);
