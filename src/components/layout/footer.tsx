import { SITE } from '@/constants/site'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-border py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <p>
          Built by{' '}
          <a href={SITE.author.url} target="_blank" rel="noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">
            {SITE.author.name}
          </a>{' '}
          for HNG 15.
        </p>
        <p>{SITE.name}</p>
      </div>
    </footer>
  )
}
