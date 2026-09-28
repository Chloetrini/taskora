import type { Metadata } from 'next'
import LandingView from '@/views/landing-view'
import { SITE } from '@/constants/site'
import { siteUrl } from '@/lib/site-url'

// The landing page has its own title (no "| Taskora" suffix) and description.
const LANDING_TITLE = `${SITE.name}: a private to-do list with subtasks, tags and filters`
export const metadata: Metadata = {
  title: { absolute: LANDING_TITLE },
  description: SITE.description,
  alternates: { canonical: '/' },
  openGraph: { title: LANDING_TITLE, description: SITE.description, url: '/' },
  twitter: { title: LANDING_TITLE, description: SITE.description },
}

// Structured data so search engines know what this site is.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE.name,
  description: SITE.description,
  url: siteUrl(),
  applicationCategory: 'ProductivityApplication',
  operatingSystem: 'Any (web browser)',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: SITE.author.name, url: SITE.author.url },
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // "<" is escaped so nothing in the data can close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <LandingView />
    </>
  )
}
