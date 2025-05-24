/** @type {import('next').NextConfig} */

// Configuration for Next.js 15.2.4
// - serverActions must be under experimental
// - serverComponentsExternalPackages is used for external packages in server components
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    optimizeCss: true,
    serverActions: true
  },
  serverComponentsExternalPackages: ['debug', 'supports-color'],
  webpack: (config, { isServer }) => {
    // Ensure proper handling of modules in standalone mode
    if (!isServer) {
      // Don't attempt to import server-only modules on the client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        debug: false,
        'supports-color': false,
        util: false,
        os: false,
        path: false
      }

      // Exclude server-only modules from client bundle
      config.module.rules.push({
        test: /node_modules[\\/](debug|follow-redirects|supports-color)[\\/].+/,
        use: 'null-loader'
      })
    } else {
      // Server-side specific configuration
      config.module.rules.push({
        test: /node_modules[\\/](debug|follow-redirects|supports-color)[\\/].+/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['next/babel']
          }
        }
      })
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
