/**
 * The site's public origin, for canonical links, the sitemap and share tags.
 * `APP_URL` wins (the same variable Google sign-in uses); on Vercel it falls
 * back to the production domain, then the deployment URL; locally to localhost.
 * Read at build time by the metadata routes, so changing it needs a redeploy.
 */
export function siteUrl(): string {
  const explicit = process.env.APP_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}
