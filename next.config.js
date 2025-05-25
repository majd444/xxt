/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // For Vercel, we should use 'standalone' instead of 'export'
  output: 'standalone',
  // Disable TypeScript checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Minimal experimental features
  experimental: {},
  // Remove redirects for now as they can cause issues
  // async redirects() {
  //   return [
  //     {
  //       source: '/create-agent',
  //       destination: '/new-agent',
  //       permanent: true,
  //     },
  //   ]
  // },
  // Disable trailing slash for Vercel
  trailingSlash: false,
}

module.exports = nextConfig
