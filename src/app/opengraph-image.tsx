import { ImageResponse } from 'next/og'
import { SITE } from '@/constants/site'

// The picture shown when a Taskora link is shared (WhatsApp, Slack, X, LinkedIn…).
// Colours are the design tokens' light values; this renders outside the page's CSS.
export const alt = `${SITE.name}: ${SITE.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px', background: '#F3F6FC', color: '#16233F' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 84, height: 84, borderRadius: 24, background: '#2F5BEA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="52" height="52" viewBox="0 0 24 24">
              <path d="M6 12.5l3.8 3.8L18 8" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontSize: 60, fontWeight: 700 }}>{SITE.name}</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, display: 'flex' }}>Get it out of your head and onto a list.</div>
        <div style={{ marginTop: 32, fontSize: 34, color: '#5B6B8C', display: 'flex' }}>{SITE.tagline}</div>
      </div>
    ),
    size
  )
}
