/**
 * Centralized, environment-aware callback URL helper.
 *
 * Local development resolves to http://localhost:<whatever port Vite picked>/auth/callback
 * because it derives from window.location.origin. In production the same code
 * resolves to https://<production-domain>/auth/callback — no hardcoded hosts,
 * no hardcoded ports, no preview URLs.
 */
export function getAuthCallbackUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/auth/callback`;
  }
  return "/auth/callback";
}
