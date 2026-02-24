import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '22102959.dcism.org',
        pathname: '/biocella-api/**',
      },
    ],
  },
};

export default nextConfig;
