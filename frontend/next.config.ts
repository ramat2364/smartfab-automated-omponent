import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'vnrt3000.elb.cisinlive.com',
    'localhost:3000',
    '127.0.0.1:3000'
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
