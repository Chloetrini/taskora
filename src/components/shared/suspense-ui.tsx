export default function SuspenseUI() {
  return (
    <div className="flex h-dvh items-center justify-center" role="status" aria-label="Loading">
      <span className="size-8 animate-spin rounded-full border-3 border-primary/25 border-t-primary" />
    </div>
  )
}
