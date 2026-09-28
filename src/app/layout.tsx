import type { Metadata, Viewport } from 'next'
import Providers from './providers'
import { SITE } from '@/constants/site'
import './globals.css'

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: SITE.tagline,
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='9' fill='%232F5BEA'/><path d='M9 16.5l4.5 4.5L23 11' stroke='white' stroke-width='3.2' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>",
  },
  openGraph: { title: SITE.name, description: SITE.tagline, siteName: SITE.name, type: 'website' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F3F6FC' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1524' },
  ],
}

// Runs before first paint so dark mode never flashes white.
// Key must match STORAGE_KEY in context/theme-context.tsx.
const themeScript = `try{var s=localStorage.getItem('taskora-theme');var d=s?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The pre-paint script may add class="dark" before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router root layout applies fonts to every page */}
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Geist:wght@400..600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
