import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/adapter-pg', 'pg', 'dotenv'],
  images: {
    remotePatterns: [
      {
        // VendeTuNave — CloudFront CDN
        protocol: 'https',
        hostname: 'd3bmp4azzreq60.cloudfront.net',
      },
      {
        // Autocosmos
        protocol: 'https',
        hostname: '**.autocosmos.com.co',
      },
      {
        // Carroya
        protocol: 'https',
        hostname: '**.carroya.com',
      },
      {
        // Fallback genérico para otros portales
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
