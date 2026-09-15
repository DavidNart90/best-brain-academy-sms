const buildId = process.env.NEXT_PUBLIC_APP_BUILD_ID ?? "development";

const serviceWorker = `
"use strict";
const BUILD_ID = ${JSON.stringify(buildId)};

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
});
`;

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(serviceWorker, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
    },
  });
}
