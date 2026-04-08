import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
