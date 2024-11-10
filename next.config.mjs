import { GenerateSW } from 'workbox-webpack-plugin';

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['cdn-dev.politikos.cloud'],
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      // Only add GenerateSW in production and on the client side
      config.plugins.push(
        new GenerateSW({
          swDest: '.next/sw.js',  // Ensure the service worker is created in .next
          clientsClaim: true,
          skipWaiting: true,
        })
      );
    }
    return config;
  },
};

export default nextConfig;
