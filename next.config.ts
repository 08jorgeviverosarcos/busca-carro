import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/adapter-pg', 'pg', 'dotenv'],
};

export default nextConfig;
