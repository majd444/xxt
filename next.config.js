/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // This ensures proper static file serving in production
  distDir: '.next',
  async redirects() {
    return [
      {
        source: '/create-agent',
        destination: '/new-agent',
        permanent: true,
      },
      // Add a redirect from the root to the deployment success page for easier verification
      {
        source: '/',
        destination: '/deployment-success.html',
        permanent: false,
      },
    ]
  },
  // Enable static optimization where possible
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },
}

module.exports = nextConfig
