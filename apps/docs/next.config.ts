import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

const withMDX = createMDX();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    cpus: 1,
  },
};

export default withMDX(nextConfig);

