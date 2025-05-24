/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to import server-only modules on the client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        debug: false
      }
    }
    return config
  },
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
