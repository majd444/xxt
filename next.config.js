/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure for standalone deployment
  output: 'standalone',
  // Disable image optimization since it's not supported in export mode
  images: { unoptimized: true },
  // Server configuration
  experimental: {},
  serverActions: {
    bodySizeLimit: '2mb'
  },
  serverExternalPackages: ['pg', 'mammoth', 'pdf-parse'],
  // Static site doesn't support dynamic redirects but we can keep the permanent ones
  async redirects() {
    return [
      {
        source: '/create-agent',
        destination: '/new-agent',
        permanent: true,
      },
    ]
  },
  // This helps with GitHub Pages and other static hosts
  trailingSlash: true,
}

module.exports = nextConfig
