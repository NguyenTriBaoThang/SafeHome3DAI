/** @type {import('next').NextConfig} */
const nextConfig = {
  // Separate local QA/build output from a running development server when needed.
  distDir: process.env.SAFEHOME_BUILD_DIR || ".next",
  reactStrictMode: false, // Prevents double mount issues with Three.js WebGL contexts in dev
  experimental: { serverComponentsExternalPackages: ["@huggingface/transformers", "@google/genai"] },
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },
};

export default nextConfig;

