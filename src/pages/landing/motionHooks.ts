import { useEffect, useState, type RefObject } from "react";

/**
 * Landing motion hooks (Phase 15B.1).
 *
 * Refs are passed in and never returned — render only reads plain booleans.
 * One viewport observer plus one media query; no animation library, no
 * render loops. Both hooks fail safe: without IntersectionObserver the
 * content is treated as visible, while automated motion stays off.
 */

/**
 * True while the visitor asks for reduced motion. Environments without
 * `matchMedia` fall back to `false` (motion allowed), matching the CSS
 * base layer, which always honours the media query when it exists.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}

export interface InViewResult {
  /** IntersectionObserver exists in this environment (false under jsdom). */
  supported: boolean;
  /** Element is (or would be) inside the viewport. */
  inView: boolean;
}

/**
 * One viewport observer attached to the caller's ref. `once` disconnects
 * after the first intersection (scroll reveals); without it the state
 * tracks visibility so demos can pause while off screen. Without
 * IntersectionObserver the hook fails open: content is visible, but
 * automated motion stays off (callers gate timers on `supported && inView`).
 */
export function useInView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: { once?: boolean } = {},
): InViewResult {
  const { once = true } = options;
  const [supported] = useState(
    () => typeof IntersectionObserver !== "undefined",
  );
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (!supported) return;
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) io.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -4% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [ref, supported, once]);

  return { supported, inView };
}

/**
 * Scroll-reveal state for a section container: hidden until first viewport
 * entry, then settled. Environments without IntersectionObserver (or with
 * reduced motion) simply get visible content — never hidden behind an
 * animation that cannot run.
 */
export function useReveal<T extends HTMLElement>(
  ref: RefObject<T | null>,
): string {
  const { inView } = useInView(ref);
  return inView ? "lp-reveal is-in" : "lp-reveal";
}
