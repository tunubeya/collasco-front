import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com'
      },
      {
        protocol: 'https',
        hostname: 'storage.cloud.google.com'
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        pathname: '/uc'
      }
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '9mb'
    }
  }
};

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');
export default withNextIntl(nextConfig);
