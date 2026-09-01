import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
};

export default nextConfig;
