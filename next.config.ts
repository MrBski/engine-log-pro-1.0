import type {NextConfig} from 'next';
import WithPWA from '@ducanh2912/next-pwa';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // This will disable source maps in production, drastically reducing build size.
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Add the following to address the cross-origin warning
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  experimental: {
    // This allows specific cross-origin requests in development.
    allowedDevOrigins: [
      'https://*.cloudworkstations.dev',
      'https://*.firebase.studio',
    ],
  },
};

const withPWA = WithPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

export default withPWA(nextConfig);
