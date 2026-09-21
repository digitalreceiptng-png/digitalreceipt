import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ctmiexmeufxvhfyffljx.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'www.digitalreceipt.ng',
      },
    ],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      // admin non-www -> admin www (just in case)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'admin.digitalreceipt.ng' }],
        destination: 'https://admin.digitalreceipt.ng/:path*',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
