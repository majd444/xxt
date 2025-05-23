/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure for static site export
  output: 'export',
  // Disable image optimization since it's not supported in export mode
  images: { unoptimized: true },
  // Remove experimental options entirely as they're causing issues
  experimental: {},
  // Remove redirects which are not compatible with static export
  // This helps with GitHub Pages and other static hosts
  trailingSlash: true,
}

module.exports = nextConfig
