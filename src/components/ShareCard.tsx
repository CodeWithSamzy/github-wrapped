import type { CSSProperties, ReactElement } from "react";
import { CARD_FONT_FAMILY } from "@/lib/card-fonts";
import { formatCompact, formatMonth, formatNumber, formatPercent, formatRange } from "@/lib/format";
import type { Wrapped } from "@/lib/types";

/**
 * The PNG share card, rendered by Satori through `next/og`.
 *
 * Satori is not a browser: it understands a flexbox-only subset of CSS and no
 * stylesheets, so every rule here is inline and every container declares
 * `display: flex` explicitly.
 */

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const palette = {
  text: "#ffffff",
  dim: "rgba(255,255,255,0.62)",
  faint: "rgba(255,255,255,0.38)",
  line: "rgba(255,255,255,0.14)",
  panel: "rgba(255,255,255,0.06)",
};

const root: CSSProperties = {
  width: CARD_WIDTH,
  height: CARD_HEIGHT,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: 56,
  backgroundImage:
    "radial-gradient(900px 520px at 8% -10%, rgba(124,92,255,0.55), transparent 62%)," +
    "radial-gradient(760px 460px at 96% 6%, rgba(47,224,168,0.28), transparent 58%)," +
    "radial-gradient(900px 600px at 60% 118%, rgba(255,122,198,0.32), transparent 60%)," +
    "linear-gradient(140deg, #06070f 0%, #0d1024 52%, #070812 100%)",
  color: palette.text,
  fontFamily: CARD_FONT_FAMILY,
};

function Tile({ label, value, accent }: { label: string; value: string; accent: string }): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 0",
        padding: "18px 20px",
        marginRight: 14,
        background: palette.panel,
        border: `1px solid ${palette.line}`,
        borderRadius: 18,
      }}
    >
      <div style={{ display: "flex", fontSize: 17, letterSpacing: 1.4, color: palette.faint, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ display: "flex", fontSize: 40, fontWeight: 700, marginTop: 6, color: accent }}>{value}</div>
    </div>
  );
}

export function ShareCard({ wrapped }: { wrapped: Wrapped }): ReactElement {
  const { profile, stats, window } = wrapped;
  const headline = stats.languages[0];
  const streak = stats.longestStreak;
  const busiest = stats.busiestMonth;

  const tiles = [
    { label: "Commits", value: formatCompact(stats.totals.commits), accent: "#ffffff" },
    { label: "Pull requests", value: formatCompact(stats.totals.pullRequests), accent: "#ffffff" },
    { label: "Longest streak", value: streak ? `${formatNumber(streak.days)}d` : "0d", accent: "#2fe0a8" },
    { label: "Top language", value: headline?.name ?? "Unknown", accent: headline?.color ?? "#ffffff" },
    { label: "Busiest month", value: busiest ? formatMonth(busiest.month).split(" ")[0]! : "None", accent: "#ffc94d" },
  ];

  const barTop = stats.languages.slice(0, 5);

  return (
    <div style={root}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.avatarUrl}
            alt=""
            width={84}
            height={84}
            style={{ borderRadius: 999, border: `2px solid ${palette.line}` }}
          />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 20 }}>
            <div style={{ display: "flex", fontSize: 20, letterSpacing: 3, color: palette.faint }}>GITHUB WRAPPED</div>
            <div style={{ display: "flex", fontSize: 42, fontWeight: 700 }}>@{profile.username}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, color: "#a78bff", lineHeight: 1 }}>
            {formatCompact(stats.totals.contributions)}
          </div>
          <div style={{ display: "flex", fontSize: 20, color: palette.dim, marginTop: 4 }}>contributions</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 24, color: palette.dim }}>
          {stats.activeDays} active days · {stats.totals.reviews} reviews · {stats.stars} stars · {stats.followers} followers
        </div>
        <div style={{ display: "flex", marginTop: 12, height: 14, borderRadius: 999, overflow: "hidden", background: palette.panel }}>
          {barTop.map((language) => (
            <div
              key={language.name}
              style={{
                display: "flex",
                width: `${Math.round(language.percent * 9)}px`,
                background: language.color ?? "#8b949e",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 10 }}>
          {barTop.map((language) => (
            <div key={language.name} style={{ display: "flex", alignItems: "center", marginRight: 22, fontSize: 19, color: palette.dim }}>
              <div
                style={{
                  display: "flex",
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  marginRight: 8,
                  background: language.color ?? "#8b949e",
                }}
              />
              <div style={{ display: "flex" }}>
                {language.name} {formatPercent(language.percent, 0)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex" }}>
        {tiles.map((tile) => (
          <Tile key={tile.label} label={tile.label} value={tile.value} accent={tile.accent} />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 18, color: palette.faint }}>
        <div style={{ display: "flex" }}>{formatRange(window.from, window.to)}</div>
        <div style={{ display: "flex" }}>github-wrapped</div>
      </div>
    </div>
  );
}
