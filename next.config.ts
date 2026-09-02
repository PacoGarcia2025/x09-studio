import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@google/model-viewer"],
  outputFileTracingIncludes: {
    "/**/*": ["./templates/**/*"],
  },
  experimental: {
    // Default Next = 1 MB; upload da biblioteca aceita até 24 MB + overhead multipart.
    serverActions: {
      bodySizeLimit: "25mb",
    },
    proxyClientMaxBodySize: "25mb",
    middlewareClientMaxBodySize: "25mb",
  } as NextConfig["experimental"],
  async redirects() {
    return [{ source: "/3d", destination: "/assets", permanent: false }];
  },
};

export default nextConfig;
