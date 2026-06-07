import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ctmiexmeufxvhfyffljx.supabase.co',
      },
    ],
  },
};

export default nextConfig;
