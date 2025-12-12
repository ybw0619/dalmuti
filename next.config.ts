import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // 개발 환경에서 빠른 로딩
  },
};

export default nextConfig;
