import { pruneSnapshots } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deletes snapshots past their TTL.
 *
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET` when that
 * variable is set on the project. The route fails closed: with no secret
 * configured it refuses to run rather than exposing an unauthenticated delete.
 */
async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const removed = await pruneSnapshots();
    return Response.json({ removed, prunedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[cron] failed to prune snapshots:", error);
    return Response.json({ error: "Prune failed." }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
