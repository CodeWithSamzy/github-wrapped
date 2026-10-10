"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildSlides } from "@/components/slides";
import type { Wrapped } from "@/lib/types";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function scrollBehavior(): ScrollBehavior {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION).matches ? "auto" : "smooth";
}

/**
 * The full-screen scroll deck.
 *
 * Slides stack vertically and snap into place; whichever slide occupies most of
 * the viewport becomes active, which is what the CSS uses to trigger its staged
 * reveals (`[data-active="true"] .rise`). Navigation is a dot rail plus the
 * arrow, page, home, and end keys.
 */
export function WrappedDeck({ wrapped }: { wrapped: Wrapped }) {
  const slides = useMemo(() => buildSlides(wrapped), [wrapped]);
  const deckRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (Number.isInteger(index)) setActive(index);
        }
      },
      { root: deck, threshold: 0.55 },
    );

    for (const node of slideRefs.current) {
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [slides.length]);

  const goTo = useCallback((index: number) => {
    const last = slideRefs.current.length - 1;
    const clamped = Math.max(0, Math.min(index, last));
    slideRefs.current[clamped]?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;

      switch (event.key) {
        case "ArrowDown":
        case "PageDown":
        case " ":
          event.preventDefault();
          goTo(active + 1);
          break;
        case "ArrowUp":
        case "PageUp":
          event.preventDefault();
          goTo(active - 1);
          break;
        case "Home":
          event.preventDefault();
          goTo(0);
          break;
        case "End":
          event.preventDefault();
          goTo(slides.length - 1);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, goTo, slides.length]);

  const progress = slides.length > 0 ? ((active + 1) / slides.length) * 100 : 0;

  return (
    <div data-deck className="deck" ref={deckRef}>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 h-0.5 bg-white/5" aria-hidden="true">
        <div
          className="h-full transition-[width] duration-500 ease-out"
          style={{
            width: `${progress}%`,
            backgroundImage: "linear-gradient(90deg, var(--color-accent-soft), var(--color-mint), var(--color-blush))",
          }}
        />
      </div>

      <nav aria-label="Slides" className="fixed right-3 top-1/2 z-20 hidden -translate-y-1/2 sm:block">
        <ul className="flex flex-col items-end gap-2">
          {slides.map((slide, index) => {
            const current = index === active;
            return (
              <li key={slide.id}>
                <button
                  type="button"
                  onClick={() => goTo(index)}
                  aria-current={current ? "true" : undefined}
                  aria-label={slide.nav}
                  className="focus-ring group flex items-center gap-2 rounded-full py-1 pl-2 pr-1"
                >
                  <span
                    className={`text-[0.68rem] font-medium tracking-wide transition-opacity ${
                      current ? "text-mist opacity-100" : "text-muted opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {slide.nav}
                  </span>
                  <span
                    className={`h-2 rounded-full transition-all duration-300 ${
                      current ? "w-6 bg-accent-soft" : "w-2 bg-white/25 group-hover:bg-white/50"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {slides.map((slide, index) => (
        <section
          key={slide.id}
          id={slide.id}
          data-index={index}
          data-active={index === active}
          className="slide"
          ref={(node) => {
            slideRefs.current[index] = node;
          }}
        >
          {slide.render(index === active)}
        </section>
      ))}
    </div>
  );
}
