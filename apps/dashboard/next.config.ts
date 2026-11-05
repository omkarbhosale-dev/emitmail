import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // Keep Next's static page generation stable on memory-constrained hosts.
    cpus: 1,
  },
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    const apiTarget = process.env.API_TARGET_URL || "http://127.0.0.1:4000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
