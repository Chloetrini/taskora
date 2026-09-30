import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'

// Public pages only. Signed-in pages are private and are not listed.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  return [
    { url: `${base}/`, changeFrequency: 'monthly', priority: 1 },
  ]
}
