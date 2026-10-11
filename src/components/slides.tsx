import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { CountUp } from "@/components/CountUp";
import { ContributionHeatmap } from "@/components/ContributionHeatmap";
import { ShareRow } from "@/components/ShareRow";
import {
  formatCompact,
  formatDay,
  formatMonth,
  formatMonthShort,
  formatNumber,
  formatPercent,
  formatRange,
  formatWeekday,
  pluralizeDays,
} from "@/lib/format";
import type { Wrapped } from "@/lib/types";

export type Slide = {
  id: string;
  /** Short label for the dot navigation. */
  nav: string;
  render: (active: boolean) => ReactNode;
};

const COLORS = {
  accent: "#7c5cff",
  mint: "#2fe0a8",
  sun: "#ffc94d",
  blush: "#ff7ac6",
} as const;

const delay = (ms: number): CSSProperties => ({ "--delay": `${ms}ms` }) as CSSProperties;
const barWidth = (percent: number): CSSProperties =>
  ({ "--w": `${Math.max(0, Math.min(100, percent))}%` }) as CSSProperties;
const barHeight = (percent: number): CSSProperties =>
  ({ "--h": `${Math.max(0, Math.min(100, percent))}%` }) as CSSProperties;

function Shell({ kicker, children, wide = false }: { kicker: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`card-surface w-full p-7 sm:p-10 lg:p-12 ${wide ? "max-w-4xl" : "max-w-2xl"}`}>
      <p className="rise text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-muted" style={delay(0)}>
        {kicker}
      </p>
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </div>
  );
}

function BarRow({
  label,
  display,
  percent,
  color,
  index,
}: {
  label: string;
  display: string;
  percent: number;
  color: string;
  index: number;
}) {
  return (
    <div className="rise" style={delay(180 + index * 70)}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-muted">{label}</span>
        <span className="font-semibold text-mist">{display}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className="bar-fill h-full rounded-full" style={{ ...barWidth(percent), background: color }} />
      </div>
    </div>
  );
}

function Stat({
  label,
  children,
  delayMs,
}: {
  label: string;
  children: ReactNode;
  delayMs: number;
}) {
  return (
    <div className="rise rounded-2xl border border-line bg-white/5 p-4" style={delay(delayMs)}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{children}</p>
    </div>
  );
}

export type SlideOptions = {
  /** Calendar years this account can also be wrapped for, newest first. */
  years?: number[];
  /** The year this wrapped covers, or `null` for the rolling window. */
  activeYear?: number | null;
};

/** Builds every slide for a wrapped. Pure: same input, same slides. */
export function buildSlides(wrapped: Wrapped, options: SlideOptions = {}): Slide[] {
  const { profile, stats, window } = wrapped;
  const displayName = profile.name ?? `@${profile.username}`;
  const range = formatRange(window.from, window.to);
  const activeYear = options.activeYear ?? null;
  const years = options.years ?? [];
  const basePath = `/wrapped/${encodeURIComponent(profile.username)}`;
  const sharePath = activeYear === null ? basePath : `${basePath}/${activeYear}`;
  const shareCardPath =
    activeYear === null
      ? `/api/wrapped/${encodeURIComponent(profile.username)}/card`
      : `/api/wrapped/${encodeURIComponent(profile.username)}/card?year=${activeYear}`;

  const commitRows = [
    { label: "Commits", value: stats.totals.commits, color: COLORS.accent },
    { label: "Pull requests", value: stats.totals.pullRequests, color: COLORS.mint },
    { label: "Issues opened", value: stats.totals.issues, color: COLORS.sun },
    { label: "Reviews", value: stats.totals.reviews, color: COLORS.blush },
  ];
  const commitPeak = Math.max(1, ...commitRows.map((row) => row.value));

  const monthPeak = Math.max(1, ...stats.months.map((month) => month.count));
  const weekdayPeak = Math.max(1, ...stats.weekdays.map((day) => day.count));
  const repoPeak = Math.max(1, ...stats.topRepositories.map((repo) => repo.commits));
  const consistency = stats.trackedDays > 0 ? (stats.activeDays / stats.trackedDays) * 100 : 0;

  return [
    {
      id: "intro",
      nav: "Intro",
      render: () => (
        <Shell kicker="GitHub Wrapped" wide>
          <div className="rise flex items-center gap-5" style={delay(60)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.avatarUrl}
              alt=""
              width={80}
              height={80}
              className="h-20 w-20 rounded-full border border-line"
            />
            <div className="min-w-0">
              <p className="truncate font-mono text-sm text-muted">@{profile.username}</p>
              <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">{displayName}</h1>
            </div>
          </div>

          <h2 className="rise text-balance text-4xl font-bold leading-[1.05] text-white sm:text-5xl" style={delay(140)}>
            {activeYear === null ? (
              <>
                Your last <span className="gradient-text">twelve months</span> in code.
              </>
            ) : (
              <>
                Your <span className="gradient-text">{activeYear}</span> in code.
              </>
            )}
          </h2>

          <p className="rise text-sm text-muted" style={delay(220)}>
            {range} · {formatNumber(stats.totals.contributions)} contributions
          </p>

          <div className="rise" style={delay(300)}>
            <ContributionHeatmap days={stats.days} />
          </div>

          <p className="rise text-xs text-muted" style={delay(380)}>
            Scroll, swipe, or use the arrow keys.
          </p>
        </Shell>
      ),
    },
    {
      id: "contributions",
      nav: "Contributions",
      render: (active) => (
        <Shell kicker="Total contributions">
          <p className="rise text-6xl font-bold leading-none text-white sm:text-7xl" style={delay(40)}>
            <CountUp value={stats.totals.contributions} active={active} />
          </p>
          <p className="rise text-sm text-muted" style={delay(120)}>
            across {pluralizeDays(stats.activeDays)} of activity
          </p>

          <div className="flex flex-col gap-5">
            {commitRows.map((row, index) => (
              <BarRow
                key={row.label}
                label={row.label}
                display={formatNumber(row.value)}
                percent={(row.value / commitPeak) * 100}
                color={row.color}
                index={index}
              />
            ))}
          </div>

          {stats.totals.restricted > 0 ? (
            <p className="rise text-xs text-muted" style={delay(520)}>
              Includes {formatNumber(stats.totals.restricted)} private contributions, which GitHub reports only as a count.
            </p>
          ) : null}
        </Shell>
      ),
    },
    {
      id: "busiest-month",
      nav: "Busiest month",
      render: (active) => (
        <Shell kicker="Busiest month" wide>
          {stats.busiestMonth ? (
            <p className="rise text-balance text-4xl font-bold leading-tight text-white sm:text-5xl" style={delay(40)}>
              You peaked in{" "}
              <span style={{ color: COLORS.mint }}>{formatMonth(stats.busiestMonth.month)}</span> with{" "}
              <CountUp value={stats.busiestMonth.count} active={active} /> contributions.
            </p>
          ) : (
            <p className="rise text-3xl font-bold text-white" style={delay(40)}>
              No contributions recorded in this window.
            </p>
          )}

          <div className="rise flex h-44 items-end gap-1.5 sm:gap-2" style={delay(160)}>
            {stats.months.map((month, index) => {
              const busiest = stats.busiestMonth?.month === month.month;
              return (
                <div key={month.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="col-fill w-full rounded-t-md"
                      style={{
                        ...barHeight((month.count / monthPeak) * 100),
                        ...delay(200 + index * 40),
                        background: busiest ? COLORS.mint : "rgba(255,255,255,0.16)",
                      }}
                      title={`${month.month}: ${month.count}`}
                    />
                  </div>
                  <span className={`text-[0.6rem] ${busiest ? "text-mint" : "text-muted"}`}>
                    {formatMonthShort(month.month)}
                  </span>
                </div>
              );
            })}
          </div>
        </Shell>
      ),
    },
    {
      id: "busiest-weekday",
      nav: "Busiest weekday",
      render: (active) => (
        <Shell kicker="Busiest day of the week" wide>
          {stats.busiestWeekday ? (
            <p className="rise text-balance text-4xl font-bold leading-tight text-white sm:text-5xl" style={delay(40)}>
              <span style={{ color: COLORS.sun }}>{formatWeekday(stats.busiestWeekday.weekday)}s</span> are your day, with{" "}
              <CountUp value={stats.busiestWeekday.count} active={active} /> contributions.
            </p>
          ) : (
            <p className="rise text-3xl font-bold text-white" style={delay(40)}>
              Not enough activity to find a favourite day.
            </p>
          )}

          <div className="rise flex h-44 flex-col gap-3" style={delay(160)}>
            {stats.weekdays.map((day, index) => {
              const busiest = stats.busiestWeekday?.weekday === day.weekday;
              return (
                <div key={day.weekday} className="flex flex-1 items-center gap-3">
                  <span className={`w-10 shrink-0 text-xs ${busiest ? "text-sun" : "text-muted"}`}>
                    {formatWeekday(day.weekday).slice(0, 3)}
                  </span>
                  <div className="h-full flex-1 overflow-hidden rounded-md bg-white/8">
                    <span
                      className="bar-fill block h-full rounded-md"
                      style={{
                        ...barWidth((day.count / weekdayPeak) * 100),
                        ...delay(200 + index * 50),
                        background: busiest ? COLORS.sun : "rgba(255,255,255,0.18)",
                      }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted">
                    {formatCompact(day.count)}
                  </span>
                </div>
              );
            })}
          </div>
        </Shell>
      ),
    },
    {
      id: "streak",
      nav: "Streak",
      render: (active) => (
        <Shell kicker="Longest streak" wide>
          {stats.longestStreak ? (
            <>
              <p className="rise text-6xl font-bold leading-none text-white sm:text-7xl" style={delay(40)}>
                <CountUp value={stats.longestStreak.days} active={active} />
              </p>
              <p className="rise text-sm text-muted" style={delay(120)}>
                consecutive days, {formatDay(stats.longestStreak.start)} to {formatDay(stats.longestStreak.end)}
              </p>
            </>
          ) : (
            <p className="rise text-3xl font-bold text-white" style={delay(40)}>
              No streaks this year.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Current streak" delayMs={220}>
              {stats.currentStreak ? pluralizeDays(stats.currentStreak.days) : "0 days"}
            </Stat>
            <Stat label="Active days" delayMs={280}>
              {formatNumber(stats.activeDays)}
            </Stat>
            <Stat label="Show-up rate" delayMs={340}>
              {formatPercent(consistency, 0)}
            </Stat>
          </div>

          <div className="rise" style={delay(400)}>
            <ContributionHeatmap days={stats.days} label="Daily activity across the window, for streak context" />
          </div>
        </Shell>
      ),
    },
    {
      id: "languages",
      nav: "Languages",
      render: () => (
        <Shell kicker="Top languages" wide>
          <p className="rise text-3xl font-bold text-white sm:text-4xl" style={delay(40)}>
            What you shipped was mostly{" "}
            <span style={{ color: stats.languages[0]?.color ?? "#ffffff" }}>{stats.languages[0]?.name ?? "unknown"}</span>.
          </p>

          {stats.languages.length > 0 ? (
            <>
              <div className="rise flex h-4 w-full overflow-hidden rounded-full bg-white/10" style={delay(140)}>
                {stats.languages.map((language) => (
                  <div
                    key={language.name}
                    style={{ width: `${language.percent}%`, background: language.color ?? "#8b949e" }}
                    title={`${language.name}: ${formatPercent(language.percent)}`}
                  />
                ))}
              </div>

              <ul className="flex flex-col gap-3">
                {stats.languages.map((language, index) => (
                  <li key={language.name} className="rise" style={delay(200 + index * 60)}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ background: language.color ?? "#8b949e" }}
                        />
                        <span className="truncate text-sm text-mist">{language.name}</span>
                      </span>
                      <span className="shrink-0 font-mono text-sm text-muted">{formatPercent(language.percent)}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="bar-fill h-full rounded-full"
                        style={{ ...barWidth(language.percent), ...delay(240 + index * 60), background: language.color ?? "#8b949e" }}
                      />
                    </div>
                  </li>
                ))}
              </ul>

              <p className="rise text-xs text-muted" style={delay(620)}>
                Measured as bytes of code across repositories you committed to, not time spent.
              </p>
            </>
          ) : (
            <p className="rise text-sm text-muted" style={delay(200)}>
              No language data available for this window.
            </p>
          )}
        </Shell>
      ),
    },
    {
      id: "repositories",
      nav: "Repositories",
      render: () => (
        <Shell kicker="Most active repositories" wide>
          {stats.topRepositories.length > 0 ? (
            <ol className="flex flex-col gap-5">
              {stats.topRepositories.map((repo, index) => (
                <li key={repo.nameWithOwner} className="rise" style={delay(80 + index * 80)}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="flex min-w-0 items-baseline gap-3">
                      <span className="font-mono text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>
                      <span className="truncate font-mono text-sm text-mist sm:text-base">{repo.nameWithOwner}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-mist">{formatNumber(repo.commits)}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="bar-fill h-full rounded-full"
                      style={{
                        ...barWidth((repo.commits / repoPeak) * 100),
                        ...delay(140 + index * 80),
                        background: COLORS.accent,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formatNumber(repo.commits)} commits · {formatNumber(repo.stars)} stars
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rise text-sm text-muted" style={delay(120)}>
              No repository contributions in this window.
            </p>
          )}
        </Shell>
      ),
    },
    {
      id: "community",
      nav: "Community",
      render: () => (
        <Shell kicker="Reach" wide>
          <p className="rise text-3xl font-bold text-white sm:text-4xl" style={delay(40)}>
            Your work reached {formatNumber(stats.stars)} stars and {formatNumber(stats.followers)} followers.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Stars" delayMs={140}>
              {formatCompact(stats.stars)}
            </Stat>
            <Stat label="Followers" delayMs={200}>
              {formatCompact(stats.followers)}
            </Stat>
            <Stat label="Public repos" delayMs={260}>
              {formatCompact(stats.ownedRepositories)}
            </Stat>
            <Stat label="Reviews" delayMs={320}>
              {formatCompact(stats.totals.reviews)}
            </Stat>
          </div>

          <p className="rise text-xs text-muted" style={delay(400)}>
            Stars are counted across your owned, non-fork repositories; private contributions never include repository
            detail.
          </p>
        </Shell>
      ),
    },
    ...(years.length > 1
      ? [
          {
            id: "years",
            nav: "Year by year",
            render: () => (
              <Shell kicker="Year by year" wide>
                <h2 className="rise text-balance text-4xl font-bold leading-tight text-white sm:text-5xl" style={delay(40)}>
                  Other years you can <span className="gradient-text">unwrap</span>.
                </h2>

                <div className="rise grid grid-cols-2 gap-3 sm:grid-cols-3" style={delay(140)}>
                  <Link
                    href={basePath}
                    className={`focus-ring flex flex-col gap-1 rounded-2xl border p-4 transition ${
                      activeYear === null ? "border-accent-soft bg-white/10" : "border-line bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-xl font-bold text-white">Last 12 months</span>
                    <span className="text-xs text-muted">{activeYear === null ? "You are here" : "Rolling view"}</span>
                  </Link>

                  {years.map((year) => (
                    <Link
                      key={year}
                      href={`${basePath}/${year}`}
                      className={`focus-ring flex flex-col gap-1 rounded-2xl border p-4 transition ${
                        activeYear === year ? "border-accent-soft bg-white/10" : "border-line bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span className="text-xl font-bold text-white">{year}</span>
                      <span className="text-xs text-muted">{activeYear === year ? "You are here" : "View wrapped"}</span>
                    </Link>
                  ))}
                </div>
              </Shell>
            ),
          } satisfies Slide,
        ]
      : []),
    {
      id: "share",
      nav: "Share",
      render: () => (
        <Shell kicker="Share it" wide>
          <p className="rise text-balance text-4xl font-bold leading-tight text-white sm:text-5xl" style={delay(40)}>
            That was your year in <span className="gradient-text">git</span>.
          </p>
          <p className="rise text-sm text-muted" style={delay(120)}>
            Everyone with this link sees the same stats - no sign-in, no repository contents.
          </p>
          <div className="rise" style={delay(200)}>
            <ShareRow
              username={profile.username}
              url={sharePath}
              cardUrl={shareCardPath}
              filename={`github-wrapped-${profile.username}${activeYear === null ? "" : `-${activeYear}`}.png`}
            />
          </div>
        </Shell>
      ),
    },
  ];
}
