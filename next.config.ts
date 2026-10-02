import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  images: { qualities: [75, 90], formats: ['image/avif', 'image/webp'] },
  turbopack: { root: path.resolve(__dirname) },
  outputFileTracingRoot: path.resolve(__dirname),
  // The share card reads its fonts and the cat cutout from disk at runtime.
  outputFileTracingIncludes: {
    '/api/card': ['./assets/fonts/**', './public/art/catana.png'],
    '/opengraph-image': ['./assets/fonts/**', './public/art/catana.png'],
  },
  async headers() {
    return [
      {
        source: '/art/:path*',
        headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
