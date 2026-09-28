/**
 * Landing hero image: an app window with a grid of task cards, plus floating
 * "done" and progress badges. Pure SVG drawn with the design tokens
 * (fill-surface, stroke-border, fill-primary…), so it follows dark mode and
 * needs no image file. Static on purpose — no dates, so server and client
 * HTML always match.
 */
function MiniCard({ x, y, accent, done, title, lines }: { x: number; y: number; accent: string; done?: boolean; title: number; lines: number[] }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="176" height="150" rx="14" className="fill-surface stroke-border" strokeWidth="1.5" />
      {/* category + priority dot */}
      <rect x="16" y="16" width="46" height="8" rx="4" className="fill-muted-foreground/40" />
      <circle cx="74" cy="20" r="4" className={accent} />
      <line x1="16" y1="36" x2="160" y2="36" className="stroke-border" strokeWidth="1.5" />
      {/* checkbox + title */}
      {done ? (
        <g>
          <circle cx="26" cy="54" r="10" className="fill-done" />
          <path d="M21 54.5l3.5 3.5 6.5-7" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : (
        <circle cx="26" cy="54" r="9" fill="none" className="stroke-muted-foreground/50" strokeWidth="2.4" />
      )}
      <rect x="44" y="49" width={title} height="10" rx="5" className={done ? 'fill-muted-foreground/35' : 'fill-foreground/80'} />
      {done && <line x1="42" y1="54" x2={46 + title} y2="54" className="stroke-muted-foreground" strokeWidth="2" strokeLinecap="round" />}
      {lines.map((w, i) => (
        <rect key={i} x="44" y={70 + i * 12} width={w} height="7" rx="3.5" className="fill-muted-foreground/25" />
      ))}
      {/* Edit / Delete buttons */}
      <rect x="16" y="114" width="68" height="22" rx="7" className="fill-primary" />
      <rect x="36" y="122" width="28" height="6" rx="3" className="fill-primary-foreground/80" />
      <rect x="92" y="114" width="68" height="22" rx="7" className="fill-surface stroke-border" strokeWidth="1.5" />
      <rect x="110" y="122" width="32" height="6" rx="3" className="fill-destructive/60" />
    </g>
  )
}

export default function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 400" className={className} role="img" aria-label="Taskora showing a grid of task cards, with three tasks done today">
      {/* soft backdrop */}
      <circle cx="300" cy="200" r="190" className="fill-primary-soft" />
      <circle cx="120" cy="90" r="44" className="fill-primary/10" />

      {/* app window */}
      <g transform="translate(40 50)">
        <rect width="420" height="272" rx="20" className="fill-background stroke-border" strokeWidth="1.5" />
        <rect width="420" height="44" rx="20" className="fill-surface" />
        <rect y="24" width="420" height="20" className="fill-surface" />
        <line x1="0" y1="44" x2="420" y2="44" className="stroke-border" strokeWidth="1.5" />
        <circle cx="24" cy="22" r="5" className="fill-destructive/70" />
        <circle cx="42" cy="22" r="5" className="fill-warning/70" />
        <circle cx="60" cy="22" r="5" className="fill-done/70" />
        {/* category tabs */}
        <rect x="24" y="60" width="64" height="20" rx="10" className="fill-primary" />
        <rect x="96" y="60" width="54" height="20" rx="10" className="fill-surface stroke-border" strokeWidth="1.5" />
        <rect x="158" y="60" width="54" height="20" rx="10" className="fill-surface stroke-border" strokeWidth="1.5" />
        <rect x="220" y="60" width="54" height="20" rx="10" className="fill-surface stroke-border" strokeWidth="1.5" />
        {/* card grid */}
        <MiniCard x={24} y={96} accent="fill-destructive" title={92} lines={[110, 84]} />
        <MiniCard x={220} y={96} accent="fill-warning" done title={80} lines={[96]} />
      </g>

      {/* floating "done today" badge */}
      <g transform="translate(330 20)">
        <rect width="170" height="58" rx="16" className="fill-surface stroke-border" strokeWidth="1.5" />
        <circle cx="30" cy="29" r="15" className="fill-done" />
        <path d="M23 29.5l5 5 9-10" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="56" y="18" width="90" height="9" rx="4.5" className="fill-foreground/80" />
        <rect x="56" y="34" width="60" height="7" rx="3.5" className="fill-muted-foreground/40" />
      </g>

      {/* floating progress card */}
      <g transform="translate(0 300)">
        <rect width="190" height="76" rx="16" className="fill-surface stroke-border" strokeWidth="1.5" />
        <circle cx="38" cy="38" r="20" fill="none" className="stroke-border" strokeWidth="6" />
        <circle
          cx="38"
          cy="38"
          r="20"
          fill="none"
          className="stroke-done"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="125.7"
          strokeDashoffset="42"
          transform="rotate(-90 38 38)"
        />
        <rect x="72" y="24" width="96" height="9" rx="4.5" className="fill-foreground/80" />
        <rect x="72" y="42" width="70" height="7" rx="3.5" className="fill-muted-foreground/40" />
      </g>
    </svg>
  )
}
