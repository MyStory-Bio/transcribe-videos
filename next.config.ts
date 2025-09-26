import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/transcribe": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
};

export default nextConfig;
