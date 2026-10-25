import type { NextConfig } from "next";

/**
 * Baseline security headers (docs/PLAN.md §7). The CSP is tightened further
 * when third-party scripts (Kakao login, Sentry) are added in Phase 1.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Microphone stays allowed for our own origin: shadowing records on-device.
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
];

// Monorepo root: lets Turbopack and output tracing resolve workspace packages.
const monorepoRoot = new URL("../..", import.meta.url).pathname;

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  turbopack: { root: monorepoRoot },
  transpilePackages: [
    "@fluentloop/ai",
    "@fluentloop/core",
    "@fluentloop/db",
    "@fluentloop/evals",
    "@fluentloop/ui",
  ],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
