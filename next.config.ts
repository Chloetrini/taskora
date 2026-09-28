import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Mongoose and bcryptjs are server-only Node packages — don't bundle them.
  serverExternalPackages: ['mongoose', 'bcryptjs'],
  poweredByHeader: false,
  async headers() {
    return [
      // JSON and image responses are not pages; keep them out of search results.
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
