import { useEffect, useState } from "react";

/** Viewport-space rect of the current guide target (client coordinates). */
export interface GuideAnchorRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GuideAnchorState {
  /** Screen rect of the target, or null when nothing resolves right now. */
  rect: GuideAnchorRect | null;
  /**
   * "dom" → a2D lab element / ReactFlow node / dock control;
   * "3d" → a projected marker inside the WebGL stage;
   * null → no anchor found (overlay falls back to authored text).
   */
  mode: "dom" | "3d" | null;
}

export const GUIDE_ANCHOR_NONE: GuideAnchorState = { rect: null, mode: null };

function escapeAttr(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

function measure(el: Element): GuideAnchorRect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function sameRect(a: GuideAnchorRect | null, b: GuideAnchorRect | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height
  );
}

function sameState(a: GuideAnchorState, b: GuideAnchorState): boolean {
  return a.mode === b.mode && sameRect(a.rect, b.rect);
}

/**
 * Resolution order for a target id: explicit hotspot hit area → fine-grained
 * guide anchor → ReactFlow topology node. Purely generic — no scenario- or
 * family-specific selectors. Returns null when nothing matches (the overlay
 * then shows the step's authored fallback instead of crashing).
 */
export function resolveGuideAnchor(id: string): HTMLElement | null {
  const q = escapeAttr(id);
  return (
    document.querySelector<HTMLElement>(`[data-hotspot-id="${q}"]`) ??
    document.querySelector<HTMLElement>(`[data-guide-anchor="${q}"]`) ??
    document.querySelector<HTMLElement>(`.react-flow__node[data-id="${q}"]`)
  );
}

/** One-shot measurement pass for the current target id. */
export function resolveGuideAnchorState(id: string | null): GuideAnchorState {
  if (!id) return GUIDE_ANCHOR_NONE;

  // 1.2D DOM anchors (also dock controls such as the terminal button).
  const dom = resolveGuideAnchor(id);
  if (dom) return { rect: measure(dom), mode: "dom" };

  // 2.3D stage: the scene projects a marker element for the active target
  //    when its geometry has an interactive part for this id.
  const q = escapeAttr(id);
  const marker = document.querySelector<HTMLElement>(`[data-guide-anchor-3d="${q}"]`);
  if (marker) return { rect: measure(marker), mode: "3d" };

  // 3.3D stage present but no marker for this id → honest "nothing to ring":
  //    no crash, no ring, overlay falls back to authored text.
  if (document.querySelector(`[data-guide-3d-target="${q}"]`)) {
    return { rect: null, mode: "3d" };
  }

  return GUIDE_ANCHOR_NONE;
}

/**
 * Measures the current guide target while the guide is open. Re-measures on
 * target change, window resize, layout resize, scroll, and DOM insertion of
 * new anchors — never per frame, and never while the guide is closed
 * (targetId null → inert).
 */
export function useGuideAnchor(targetId: string | null): GuideAnchorState {
  const [state, setState] = useState<GuideAnchorState>(GUIDE_ANCHOR_NONE);
  const [prevTargetId, setPrevTargetId] = useState<string | null>(null);

  // Target changed → re-measure during render (conditional adjustment; the
  // anchor elements are committed from earlier renders).
  if (prevTargetId !== targetId) {
    setPrevTargetId(targetId);
    const next = resolveGuideAnchorState(targetId);
    setState((prev) => (sameState(prev, next) ? prev : next));
  }

  useEffect(() => {
    if (targetId === null) return;
    const onChange = (): void => {
      const next = resolveGuideAnchorState(targetId);
      setState((prev) => (sameState(prev, next) ? prev : next));
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(onChange);
      observer.observe(document.body);
    }

    // Late-mounted anchors (same commit as the guide opening, lazy 3D
    // chunks, docked controls) re-trigger a measurement pass when they
    // appear; the microtask also runs before first paint.
    let mutations: MutationObserver | undefined;
    if (typeof MutationObserver !== "undefined") {
      mutations = new MutationObserver(onChange);
      mutations.observe(document.body, { childList: true, subtree: true });
    }
    queueMicrotask(onChange);

    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
      observer?.disconnect();
      mutations?.disconnect();
    };
  }, [targetId]);

  return state;
}
