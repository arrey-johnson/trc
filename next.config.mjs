/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-lib", "pdfjs-dist", "jszip"],
  },
  webpack: (config, { dev }) => {
    config.resolve.alias.canvas = false;
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
