"use client";

import { useEffect, useState } from "react";
import { formatNumber } from "@/lib/format";

type CountUpProps = {
  value: number;
  /** Numbers only animate once their slide is on screen. */
  active: boolean;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
};

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CountUp({ value, active, duration = 1100, format = formatNumber, className }: CountUpProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active) return;

    if (prefersReducedMotion() || duration <= 0) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      setDisplay(value * easeOutCubic(progress));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, value, duration]);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {format(display)}
    </span>
  );
}
