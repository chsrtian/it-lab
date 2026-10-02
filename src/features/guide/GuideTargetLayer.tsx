import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { GuideAnchorState } from "./anchor";
import type { GuideCue } from "./logic";

/** Padding (px) between the target rect and the focus ring. */
const RING_PAD = 6;
/** Arrowhead size (px) where the leader meets the ring. */
const ARROW = 7;
const ARROW_W = 4.5;
/** Minimum leader length (px) — below this the line is visual noise. */
const MIN_LEADER = 26;
/** Gap (px) between the ring top edge and the interaction cue chip. */
const CUE_GAP = 4;

const CARD_SELECTOR = '[data-testid="guide-overlay"]';

/** Center glyph per cue — the reticle itself says what kind of action this is. */
const CUE_GLYPH: Record<string, string> = {
  CLICK: "\u261e",
  TOGGLE: "\u21c4",
  CONNECT: "\u21d4",
  TYPE: ">_",
  VERIFY: "\u2713",
};

interface Point {
  x: number;
  y: number;
}

interface LeaderGeometry {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  arrow: string;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Point where a ray leaving (cx, cy) along (ux, uy) exits the rect. */
function rectEdge(cx: number, cy: number, halfW: number, halfH: number, ux: number, uy: number): Point {
  const tx = Math.abs(ux) > 1e-6 ? halfW / Math.abs(ux) : Number.POSITIVE_INFINITY;
  const ty = Math.abs(uy) > 1e-6 ? halfH / Math.abs(uy) : Number.POSITIVE_INFINITY;
  const t = Math.min(tx, ty);
  return { x: cx + ux * t, y: cy + uy * t };
}

function computeLeader(card: DOMRect, ring: Rect): LeaderGeometry | null {
  const cardC = { x: card.left + card.width / 2, y: card.top + card.height / 2 };
  const ringC = { x: ring.left + ring.width / 2, y: ring.top + ring.height / 2 };
  const dx = ringC.x - cardC.x;
  const dy = ringC.y - cardC.y;
  const len = Math.hypot(dx, dy);
  if (!Number.isFinite(len) || len < MIN_LEADER) return null;
  const ux = dx / len;
  const uy = dy / len;

  const start = rectEdge(cardC.x, cardC.y, card.width / 2, card.height / 2, ux, uy);
  const end = rectEdge(ringC.x, ringC.y, ring.width / 2 + RING_PAD, ring.height / 2 + RING_PAD, -ux, -uy);

  const bx = end.x - ux * ARROW;
  const by = end.y - uy * ARROW;
  const px = -uy * ARROW_W;
  const py = ux * ARROW_W;
  const arrow = [
    `${end.x},${end.y}`,
    `${bx + px},${by + py}`,
    `${bx - px},${by - py}`,
  ].join(" ");

  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y, arrow };
}

function escapeAttr(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

/**
 * Inline-transform chain of the marker's first three ancestors. drei <Html>
 * writes the projection to its positioned root element (the marker's
 * grandparent); the marker itself and its centering wrapper only carry static
 * transforms, so the signature must cover the whole chain or camera movement
 * goes unnoticed.
 */
function transformChain(el: HTMLElement | null): string {
  let sig = "";
  let node: HTMLElement | null = el;
  for (let i = 0; i < 3 && node; i += 1, node = node.parentElement) {
    sig += `${node.style.transform}|`;
  }
  return sig;
}

export interface GuideTargetLayerProps {
  /** Current step target id; null hides the layer. */
  targetId: string | null;
  /** Measured anchor for that id (from `useGuideAnchor`). */
  anchor: GuideAnchorState;
  /**
   * Interaction cue for the current step (OBSERVE / INSPECT / CLICK / TOGGLE /
   * CONNECT / TYPE / VERIFY). Selects the reticle variant and the cue chip;
   * null omits both.
   */
  cue?: GuideCue | null;
  /** Step target label — rendered under the reticle so the ring names its object. */
  label?: string | null;
}

/**
 * Guide focus ring + leader line. Portals to `document.body` as a fixed,
 * `aria-hidden`, pointer-events-free layer so it never blocks the lab and
 * never mounts when the guide is closed or the target is unresolvable
 * (the overlay shows the step's authored fallback instead).
 *
 * In 3D mode the layer tracks the scene's projected marker
 * (`[data-guide-anchor-3d]`, a drei <Html> anchored to the target Object3D
 * and re-projected whenever the camera renders): a rAF loop compares the
 * marker's transform signature each frame and, only when it changed,
 * re-measures the marker and writes the ring/leader/cue positions directly
 * to the DOM — no React state churn, nothing while the camera is still.
 */
export function GuideTargetLayer({ targetId, anchor, cue = null, label = null }: GuideTargetLayerProps) {
  const ringRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const arrowRef = useRef<SVGPolygonElement>(null);
  const sigRef = useRef<string | null>(null);

  // Any React commit re-applies the render-time geometry; the tracker must
  // re-read the marker on the next frame instead of trusting its cache.
  useLayoutEffect(() => {
    sigRef.current = null;
  });

  const live3d = targetId !== null && anchor.rect !== null && anchor.mode === "3d";

  useEffect(() => {
    if (!live3d || !targetId) return;
    const selector = `[data-guide-anchor-3d="${escapeAttr(targetId)}"]`;
    let raf = 0;

    const apply = (rect: DOMRect): void => {
      const ring = ringRef.current;
      if (!ring) return;
      if (rect.width === 0 && rect.height === 0) {
        // Marker parked (e.g. occluded) — hide honestly rather than ring nothing.
        ring.style.display = "none";
        if (cueRef.current) cueRef.current.style.display = "none";
        if (labelRef.current) labelRef.current.style.display = "none";
        if (lineRef.current) lineRef.current.style.display = "none";
        if (arrowRef.current) arrowRef.current.style.display = "none";
        return;
      }
      ring.style.display = "";
      ring.style.left = `${rect.left - RING_PAD}px`;
      ring.style.top = `${rect.top - RING_PAD}px`;
      ring.style.width = `${rect.width + RING_PAD * 2}px`;
      ring.style.height = `${rect.height + RING_PAD * 2}px`;

      const cueEl = cueRef.current;
      if (cueEl) {
        cueEl.style.display = "";
        cueEl.style.left = `${rect.left - RING_PAD}px`;
        cueEl.style.top = `${rect.top - RING_PAD - CUE_GAP}px`;
      }

      const labelEl = labelRef.current;
      if (labelEl) {
        labelEl.style.display = "";
        labelEl.style.left = `${rect.left - RING_PAD}px`;
        labelEl.style.top = `${rect.top + rect.height + RING_PAD + CUE_GAP}px`;
      }

      const card = document.querySelector(CARD_SELECTOR);
      const leader = card
        ? computeLeader(card.getBoundingClientRect(), {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          })
        : null;
      const line = lineRef.current;
      const arrow = arrowRef.current;
      if (line && arrow) {
        if (!leader) {
          line.style.display = "none";
          arrow.style.display = "none";
        } else {
          line.style.display = "";
          arrow.style.display = "";
          line.setAttribute("x1", String(leader.x1));
          line.setAttribute("y1", String(leader.y1));
          line.setAttribute("x2", String(leader.x2));
          line.setAttribute("y2", String(leader.y2));
          arrow.setAttribute("points", leader.arrow);
        }
      }
    };

    const tick = (): void => {
      raf = requestAnimationFrame(tick);
      const marker = document.querySelector<HTMLElement>(selector);
      if (!marker) return;
      const signature = transformChain(marker);
      if (signature === sigRef.current) return;
      sigRef.current = signature;
      apply(marker.getBoundingClientRect());
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live3d, targetId]);

  if (!targetId || !anchor.rect || typeof document === "undefined") return null;

  // Derived during render: the card is position-fixed or in-flow in the
  // utility rail; its rect is re-read whenever this layer re-renders (and by
  // the tracker whenever the scene moves).
  const rect = anchor.rect;
  const card = document.querySelector(CARD_SELECTOR);
  const leader = card ? computeLeader(card.getBoundingClientRect(), rect) : null;

  const ringStyle = {
    left: rect.left - RING_PAD,
    top: rect.top - RING_PAD,
    width: rect.width + RING_PAD * 2,
    height: rect.height + RING_PAD * 2,
  };

  const glyph = cue ? CUE_GLYPH[cue] : undefined;

  return createPortal(
    <div className="guide-layer" aria-hidden="true">
      <div
        className={`guide-ring${cue ? ` guide-ring--${cue.toLowerCase()}` : ""}`}
        data-testid="guide-ring"
        data-guide-target-id={targetId}
        data-guide-anchor-mode={anchor.mode ?? "none"}
        data-guide-cue={cue ?? undefined}
        ref={ringRef}
        style={ringStyle}
      >
        <span className="guide-ring-corner guide-ring-corner--tl" />
        <span className="guide-ring-corner guide-ring-corner--tr" />
        <span className="guide-ring-corner guide-ring-corner--bl" />
        <span className="guide-ring-corner guide-ring-corner--br" />
        {glyph ? (
          <span className="guide-ring-glyph" aria-hidden>
            {glyph}
          </span>
        ) : (
          <span className="guide-ring-dot" />
        )}
      </div>
      {cue && (
        <span
          className="guide-cue"
          data-testid="guide-cue"
          data-guide-cue={cue}
          ref={cueRef}
          style={{
            left: rect.left - RING_PAD,
            top: rect.top - RING_PAD - CUE_GAP,
            transform: "translateY(-100%)",
          }}
        >
          {cue}
        </span>
      )}
      {label && (
        <span
          className="guide-ring-label"
          data-testid="guide-ring-label"
          ref={labelRef}
          style={{
            left: rect.left - RING_PAD,
            top: rect.top + rect.height + RING_PAD + CUE_GAP,
          }}
        >
          {label}
        </span>
      )}
      <svg className="guide-leader" xmlns="http://www.w3.org/2000/svg">
        {leader ? (
          <>
            <line
              className="guide-leader-line"
              ref={lineRef}
              x1={leader.x1}
              y1={leader.y1}
              x2={leader.x2}
              y2={leader.y2}
            />
            <polygon className="guide-leader-arrow" ref={arrowRef} points={leader.arrow} />
          </>
        ) : (
          <>
            <line className="guide-leader-line" ref={lineRef} style={{ display: "none" }} />
            <polygon className="guide-leader-arrow" ref={arrowRef} style={{ display: "none" }} />
          </>
        )}
      </svg>
    </div>,
    document.body,
  );
}
