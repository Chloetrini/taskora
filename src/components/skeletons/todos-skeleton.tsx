export default function TodosSkeleton() {
  return (
    <ul className="divide-y divide-border h-[50%] rounded-lg border border-border bg-surface" aria-hidden>
      {[72, 54, 64].map(width => (
        <li key={width} className="flex items-center gap-3 px-4 py-4">
          <span className="skeleton size-5 rounded-full bg-border" />
          <span className="skeleton h-3.5 rounded-full bg-border" style={{ width: `${width}%` }} />
          <span className="skeleton h-3.5 rounded-full bg-border" style={{ width: `${width}%` }} />
          <span className="skeleton h-3.5 rounded-full bg-border" style={{ width: `${width}%` }} />
          <span className="skeleton h-3.5 rounded-full bg-border" style={{ width: `${width}%` }} />
          <span className="skeleton h-3.5 rounded-full bg-border" style={{ width: `${width}%` }} />
        </li>
      ))}
    </ul>
  )
}
