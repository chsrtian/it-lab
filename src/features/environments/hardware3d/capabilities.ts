export type ViewMode = "3d" | "2d";

const STORAGE_KEY = "itlab.hardwareView";

export function supportsWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    return gl !== null;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function readStoredView(): ViewMode | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "3d" || v === "2d" ? v : null;
  } catch {
    return null;
  }
}

export function storeView(view: ViewMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, view);
  } catch {
    /* storage unavailable — preference stays session-only */
  }
}

/**
 * Deterministic initial view resolution (unit-tested):
 * - no WebGL → 2D always (chunk never fetched)
 * - explicit user preference wins when WebGL is available
 * - reduced motion defaults to 2D; user may still opt into static 3D
 */
export function resolveInitialView(input: {
  webgl: boolean;
  reducedMotion: boolean;
  stored: ViewMode | null;
}): ViewMode {
  if (!input.webgl) return "2d";
  if (input.stored) return input.stored;
  return input.reducedMotion ? "2d" : "3d";
}
