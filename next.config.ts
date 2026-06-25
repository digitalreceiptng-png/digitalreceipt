import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ctmiexmeufxvhfyffljx.supabase.co',
      },
    ],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      // non-www → www
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'digitalreceipt.ng' }],
        destination: 'https://www.digitalreceipt.ng/:path*',
        permanent: true,
      },
      // admin non-www → admin www (just in case)
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
