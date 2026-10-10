import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-20">
      <div className="card-surface flex w-full max-w-md flex-col gap-4 p-8">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-muted">404</p>
        <h1 className="text-3xl font-bold text-white">Nothing here</h1>
        <p className="text-sm leading-relaxed text-mist/80">
          That page does not exist. Head back and generate a wrapped instead.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="focus-ring inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-mist"
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
