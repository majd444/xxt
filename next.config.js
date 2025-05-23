/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure for static site export
  output: 'export',
  // Disable image optimization since it's not supported in export mode
  images: { unoptimized: true },
  // Disable server actions for static export
  experimental: {
    serverActions: false,
    serverComponentsExternalPackages: ['pg', 'mammoth', 'pdf-parse']
  },
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
