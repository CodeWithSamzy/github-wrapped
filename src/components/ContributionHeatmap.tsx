import { heatmapColumns, intensityLevel } from "@/lib/stats";
import type { CalendarDay } from "@/lib/types";

const LEVEL_COLORS = [
  "rgba(255,255,255,0.07)",
  "rgba(47,224,168,0.26)",
  "rgba(47,224,168,0.46)",
  "rgba(47,224,168,0.70)",
  "#2fe0a8",
] as const;

type HeatmapProps = {
  days: readonly CalendarDay[];
  label?: string;
};

/**
 * A GitHub-style contribution calendar. Columns are weeks and rows are
 * weekdays; cells stretch with the container so the grid stays readable on
 * every screen size.
 */
export function ContributionHeatmap({ days, label = "Contribution activity over the last twelve months" }: HeatmapProps) {
  const columns = heatmapColumns(days);
  const max = days.reduce((peak, day) => Math.max(peak, day.count), 0);

  return (
    <div role="img" aria-label={label} className="flex w-full gap-[3px]">
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex flex-1 flex-col gap-[3px]">
          {column.map((day, dayIndex) => (
            <div
              key={day?.date ?? `${columnIndex}-${dayIndex}`}
              title={day ? `${day.date} · ${day.count}` : undefined}
              className="aspect-square w-full rounded-[2px]"
              style={{ background: day ? LEVEL_COLORS[intensityLevel(day.count, max)] : "transparent" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
