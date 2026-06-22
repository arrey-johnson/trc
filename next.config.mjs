/** @type {import('next').NextConfig} */
const nextConfig = {
  // Avoid stale webpack chunks breaking CSS/JS in dev (layout.css 404, *.js missing)
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
