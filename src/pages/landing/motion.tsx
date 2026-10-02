import { useEffect, useRef, useState } from "react";
import { useInView, usePrefersReducedMotion } from "./motionHooks";

/**
 * Count-up for the facts shelf (Phase 15B.1): settles on the exact catalog
 * value. Animates once, when first seen, and only when motion is allowed
 * and rAF exists; otherwise the real number renders at once.
 */
export function CountUp({
  value,
  duration = 650,
}: {
  value: number;
  duration?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const { supported, inView } = useInView(ref);
  const animate =
    supported && !reduced && typeof requestAnimationFrame === "function";
  const [display, setDisplay] = useState(() => (animate ? 0 : value));

  useEffect(() => {
    if (!animate || !inView) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * t));
      if (t < 1) frame = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, inView, value, duration]);

  return (
    <span ref={ref} className="lp-count">
      {display}
    </span>
  );
}
