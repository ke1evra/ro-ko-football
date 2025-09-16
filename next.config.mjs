import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js config here
  output: 'standalone', // Required for Docker deployment
  // Lightweight build settings for low-RAM VPS
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack: (config, { dev }) => {
    if (!dev) {
      config.optimization.minimize = false
    }
    return config
  },

  // Allow external images for flags and other assets
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

  // Rewrites for media files and pretty date routes
  async rewrites() {
    return [
      // Pretty route for matches-by-date → query param
      {
        source: '/leagues/:leagueId/matches/:date',
        destination: '/leagues/:leagueId/matches?date=:date',
      },
      {
        source: '/media/:path*',
        destination: '/api/media/:path*',
      },
    ]
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default withPayload(nextConfig)
