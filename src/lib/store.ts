import postgres from "postgres";
import { parseWrapped } from "./snapshot";
import { windowYear } from "./window";
import type { StoredSnapshot, Wrapped, WrappedWindow } from "./types";

/** Result of a snapshot lookup, including whether it is still within its TTL. */
export type SnapshotRecord = StoredSnapshot & { fresh: boolean };

/**
 * Which wrapped a cached row belongs to: the rolling last-twelve-months view,
 * or one specific calendar year.
 */
export type SnapshotScope = "rolling" | number;

const DEFAULT_TTL_HOURS = 24;
/** A calendar year that has already ended can never change again. */
const SETTLED_YEAR_TTL_HOURS = 24 * 30;
const MS_PER_HOUR = 3_600_000;

export function snapshotTtlHours(wrapped?: Wrapped): number {
  const override = Number(process.env.WRAPPED_SNAPSHOT_TTL_HOURS);
  if (Number.isFinite(override) && override > 0) return override;

  const year = wrapped ? windowYear(wrapped.window) : null;
  if (year !== null && year < new Date().getUTCFullYear()) return SETTLED_YEAR_TTL_HOURS;
  return DEFAULT_TTL_HOURS;
}

/** The scope a built wrapped should be cached under. */
export function scopeForWindow(window: WrappedWindow): SnapshotScope {
  return windowYear(window) ?? "rolling";
}

/**
 * Cache key for one login and scope. GitHub logins are case-insensitive, so the
 * login is lowercased; the scope suffix keeps each calendar year - and the
 * rolling window - in its own row.
 */
export function snapshotKey(username: string, scope: SnapshotScope = "rolling"): string {
  return `${username.trim().toLowerCase()}:${scope}`;
}

export type StorageMode = "postgres" | "memory";

export function storageMode(): StorageMode {
  return process.env.DATABASE_URL ? "postgres" : "memory";
}

type MemoryStore = Map<string, StoredSnapshot>;

const MEMORY_KEY = Symbol.for("github-wrapped.memory-snapshots");

/** Survives dev-server hot reloads, unlike a module-level `new Map()`. */
function memoryStore(): MemoryStore {
  const global = globalThis as typeof globalThis & { [MEMORY_KEY]?: MemoryStore };
  global[MEMORY_KEY] ??= new Map();
  return global[MEMORY_KEY];
}

type Sql = ReturnType<typeof postgres>;

const SQL_KEY = Symbol.for("github-wrapped.sql");

function sqlClient(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const global = globalThis as typeof globalThis & { [SQL_KEY]?: Sql };
  global[SQL_KEY] ??= postgres(url, { max: 3, idle_timeout: 20, prepare: false });
  return global[SQL_KEY];
}

let schemaReady: Promise<void> | null = null;

/**
 * `username` holds the full scoped cache key (`octocat:2024`), not a bare
 * login - the column predates per-year wrappeds and renaming it would mean a
 * migration for a table that is only ever created, never queried by hand.
 */
async function ensureSchema(sql: Sql): Promise<void> {
  schemaReady ??= (async () => {
    await sql`
      create table if not exists wrapped_snapshots (
        username    text primary key,
        data        jsonb not null,
        captured_at timestamptz not null default now(),
        expires_at  timestamptz not null
      )
    `;
    await sql`create index if not exists wrapped_snapshots_expires_at_idx on wrapped_snapshots (expires_at)`;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

/**
 * Persists a snapshot, replacing any previous one for the same login and scope.
 * Never throws: caching is best-effort and must not break the request.
 */
export async function writeSnapshot(wrapped: Wrapped, ttlHours = snapshotTtlHours(wrapped)): Promise<boolean> {
  const key = snapshotKey(wrapped.profile.username, scopeForWindow(wrapped.window));
  const capturedAt = new Date();
  const expiresAt = new Date(capturedAt.getTime() + ttlHours * MS_PER_HOUR);
  const sql = sqlClient();

  if (!sql) {
    memoryStore().set(key, {
      wrapped,
      capturedAt: capturedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
    return true;
  }

  try {
    await ensureSchema(sql);
    await sql`
      insert into wrapped_snapshots (username, data, captured_at, expires_at)
      values (${key}, ${sql.json(wrapped)}, ${capturedAt.toISOString()}, ${expiresAt.toISOString()})
      on conflict (username) do update
        set data = excluded.data,
            captured_at = excluded.captured_at,
            expires_at = excluded.expires_at
    `;
    return true;
  } catch (error) {
    console.error("[store] failed to persist snapshot:", error);
    return false;
  }
}

/**
 * Reads a snapshot. Returns `null` on any failure so a broken cache degrades
 * into a recompute rather than a 500.
 */
export async function readSnapshot(
  username: string,
  scope: SnapshotScope = "rolling",
  now: Date = new Date(),
): Promise<SnapshotRecord | null> {
  const key = snapshotKey(username, scope);
  const sql = sqlClient();

  if (!sql) {
    const row = memoryStore().get(key);
    if (!row) return null;
    return { ...row, fresh: Date.parse(row.expiresAt) > now.getTime() };
  }

  try {
    await ensureSchema(sql);
    const rows = await sql<{ data: unknown; captured_at: Date; expires_at: Date }[]>`
      select data, captured_at, expires_at from wrapped_snapshots where username = ${key} limit 1
    `;
    const row = rows[0];
    if (!row) return null;

    const wrapped = parseWrapped(row.data);
    if (!wrapped) return null;

    return {
      wrapped,
      capturedAt: new Date(row.captured_at).toISOString(),
      expiresAt: new Date(row.expires_at).toISOString(),
      fresh: new Date(row.expires_at).getTime() > now.getTime(),
    };
  } catch (error) {
    console.error("[store] failed to read snapshot:", error);
    return null;
  }
}

/** Removes snapshots past their TTL. Call from a cron job. */
export async function pruneSnapshots(now: Date = new Date()): Promise<number> {
  const sql = sqlClient();
  if (!sql) {
    let removed = 0;
    for (const [key, row] of memoryStore()) {
      if (Date.parse(row.expiresAt) <= now.getTime()) {
        memoryStore().delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  await ensureSchema(sql);
  const deleted = await sql`delete from wrapped_snapshots where expires_at <= ${now.toISOString()} returning username`;
  return deleted.length;
}