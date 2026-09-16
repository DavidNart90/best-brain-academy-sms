import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";

function resolveBuildId() {
  const configured =
    process.env.APP_BUILD_ID ??
    process.env.NEXT_DEPLOYMENT_ID ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.SOURCE_VERSION;
  if (configured) return configured.replace(/[^a-zA-Z0-9._-]/g, "-");
  try {
    return execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "development";
  }
}

const appBuildId = resolveBuildId();

const nextConfig: NextConfig = {
  agentRules: false,
  env: { NEXT_PUBLIC_APP_BUILD_ID: appBuildId },
  generateBuildId: async () => appBuildId,
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  // Never serialize financial forms (or other Server Function arguments) into logs.
  logging: { serverFunctions: false },
  experimental: { serverActions: { bodySizeLimit: "16kb" } },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Origin-Agent-Cluster", value: "?1" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
