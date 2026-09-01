import "server-only";

// request.nextUrl.origin can report a placeholder host (e.g. "localhost") that
// does not match the real Host header, so compare against Host directly instead.
export function isSameOriginAsHost(origin: string, host: string) {
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
