/** Inspection frame mark: two corner brackets around the object under test. */
export function BenchMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden focusable="false">
      <path
        d="M2.25 7.25V2.25H7.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
      />
      <path
        d="M17.75 12.75V17.75H12.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
      />
      <rect x="7.5" y="7.5" width="5" height="5" fill="#e2560f" />
    </svg>
  );
}
