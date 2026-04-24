import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.56.1"],

  // Required for @xenova/transformers (ONNX Runtime) to work in API routes
  serverExternalPackages: ['sharp', 'onnxruntime-node', '@xenova/transformers'],

  // Empty turbopack config to silence the warning
  turbopack: {},
};

export default nextConfig;
