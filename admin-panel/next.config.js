/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/admin',
  trailingSlash: true,
  images: { unoptimized: true },
  // Output built files to server/public/admin for Express to serve
  distDir: '../server/public/admin',
};

module.exports = nextConfig;
