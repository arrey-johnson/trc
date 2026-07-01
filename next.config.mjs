/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["epubjs"],
  experimental: {
    serverComponentsExternalPackages: ["pdf-lib", "pdfjs-dist", "jszip"],
  },
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    if (!isServer) {
      config.module.rules.push({
        test: /pdfjs-dist[\\/].*\.mjs$/,
        type: "javascript/auto",
        resolve: {
          fullySpecified: false,
        },
      });
    }

    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
