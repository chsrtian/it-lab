import "@testing-library/jest-dom/vitest";

/**
 * jsdom has no ResizeObserver. React Flow, the terminal, and any layout
 * observers constructed during render hit it immediately, so a no-op
 * observer with the real callback contract keeps the component graph intact
 * without pretending layout actually changed.
 */
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}

/**
 * jsdom has no window.matchMedia. xterm queries it for device-pixel-ratio
 * changes when the terminal opens, so a listener-less stub keeps the real
 * terminal component mountable without faking a media query.
 */
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
