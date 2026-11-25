/** @type {import('next').NextConfig} */
const nextConfig = {
  // Separate local QA/build output from a running development server when needed.
  distDir: process.env.SAFEHOME_BUILD_DIR || ".next",
  reactStrictMode: false, // Prevents double mount issues with Three.js WebGL contexts in dev
  // Private household images are served only through authenticated API routes.
  images: { unoptimized: true },
  experimental: {
    middlewareClientMaxBodySize: "15mb",
  },
  serverExternalPackages: ["@google/genai"],
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },
};

export default nextConfig;

