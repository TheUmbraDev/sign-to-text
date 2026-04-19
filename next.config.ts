import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Force Turbopack to use this directory as the root to avoid
  // incorrect selection when multiple lockfiles exist elsewhere.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
