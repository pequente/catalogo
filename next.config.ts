import type { NextConfig } from "next";
import path from "node:path";

const runnerStub = path.join(
  process.cwd(),
  "src/lib/data/migrations/runner-edge-stub.ts",
);

const nextConfig: NextConfig = {
  webpack: (config, { nextRuntime, webpack }) => {
    if (nextRuntime !== "nodejs") {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /[/\\]src[/\\]lib[/\\]data[/\\]migrations[/\\]runner\.ts$/,
          runnerStub,
        ),
      );
    }

    return config;
  },
  images: {
    localPatterns: [
      {
        pathname: "/media/**",
      },
      {
        pathname: "/icon",
      },
      {
        pathname: "/apple-icon",
      },
    ],
  },
  async rewrites() {
    // Browsers still request /favicon.ico; map it to the dynamic store logo icon.
    return [{ source: "/favicon.ico", destination: "/icon" }];
  },
};

export default nextConfig;
