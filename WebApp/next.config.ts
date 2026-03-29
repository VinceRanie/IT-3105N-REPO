import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/favicon.ico",
        destination: "/UI/img/BiocellaLogo.png",
      },
    ];
  },
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
