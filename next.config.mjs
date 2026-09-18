/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained build for a small Cloud Run container image.
  output: "standalone",
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "@anthropic-ai/sdk"],
  eslint: {
    // Do not fail production builds on lint; we run lint separately in CI.
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    // Clean URL for the Business Model Canvas one-pager (served from public/).
    return [{ source: "/bmc", destination: "/bmc.html" }];
  },
};

export default nextConfig;
