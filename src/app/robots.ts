import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    // Only the public pages are for crawlers; the signed-in app and the API are not.
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard', '/tasks', '/trash', '/profile'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
