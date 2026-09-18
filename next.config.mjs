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
};

export default nextConfig;
