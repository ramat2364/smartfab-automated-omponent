import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'vnrt3000.elb.cisinlive.com',
    'localhost:3000',
    '127.0.0.1:3000'
  ],
  experimental: {
    workerThreads: false,
    cpus: 1
  },
  async rewrites() {
    const rawBackendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://smartfab-automated-omponent-production.up.railway.app';
    const backendHost = rawBackendUrl.replace(/\/api\/?$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${backendHost}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
