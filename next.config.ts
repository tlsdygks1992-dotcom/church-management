import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zikneyjidzovvkmflibo.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['recharts', '@tiptap/react', '@tiptap/starter-kit'],
  },
  // 성능 최적화
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
