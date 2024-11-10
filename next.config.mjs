import { GenerateSW } from 'workbox-webpack-plugin';

const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      // Only add GenerateSW in production and on the client side
      config.plugins.push(
        new GenerateSW({
          swDest: 'public/sw.js',
          clientsClaim: true,
          skipWaiting: true,
        })
      );
    }
    return config;
  },
};

export default nextConfig;
