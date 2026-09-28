'use client'

import { SITE } from '@/constants/site'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CalendarDays, Filter, ListChecks, Lock, NotebookPen, Pin } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { buttonVariants } from '@/components/ui/button'
import PageWrapper from '@/components/layout/page-wrapper'
import HeroIllustration from '@/components/marketing/hero-illustration'
import { useMe } from '@/hooks/auth/use-auth'
import { cn } from '@/lib/utils'

// Each feature opens the part of the app it describes (via the sign-up modal when signed out).
const FEATURES = [
  { icon: NotebookPen, title: 'Notes on every task', body: 'Keep links, context and details with the task, not in another app.', href: '/tasks/new' },
  { icon: ListChecks, title: 'Subtasks', body: 'Break big jobs into steps and watch the count go up as you tick them.', href: '/tasks/new' },
  { icon: Filter, title: 'Filters that stick', body: 'Category, priority, tag, due date and search. Refresh and your view is still there.', href: '/tasks' },
  { icon: CalendarDays, title: 'Due dates that make sense', body: 'Due today, overdue, or the next seven days, always in your own timezone.', href: '/tasks?due=today' },
  { icon: Pin, title: 'Pin what matters', body: 'Pinned tasks stay at the top whatever you sort by.', href: '/tasks' },
  { icon: Lock, title: 'Yours alone', body: 'Your own account and your own list. Nobody else sees your tasks.', href: '/profile' },
]

type Feature = (typeof FEATURES)[number]

export default function HomeView() {
  const router = useRouter()
  const [chosen, setChosen] = useState<Feature | null>(null)

  const { data: user } = useMe()

  // Signed in: go straight to the feature. Signed out: ask them to sign up or log in first.
  const openFeature = (feature: Feature) => (user ? router.push(feature.href) : setChosen(feature))

  return (
    <>
      <section className="pt-14 pb-20 sm:pt-20">
        <PageWrapper size="wide" className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="font-display text-[clamp(2.6rem,7vw,4.6rem)] leading-[0.98] font-extrabold tracking-[-0.035em]">
              Get it out of your head and onto a list.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {SITE.name} is a to-do list with notes, subtasks, tags and filters. Sign up in seconds and keep every task in one place.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {user ? (
                <Link href="/dashboard" className={cn(buttonVariants(), 'h-11 px-6')}>
                  Go to your dashboard
                </Link>
              ) : (
                <>
                  <Link href="/register" className={cn(buttonVariants(), 'h-11 px-6')}>
                    Create your free account
                  </Link>
                  <Link href="/login" className={cn(buttonVariants({ variant: 'outline' }), 'h-11 px-6')}>
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
          <HeroIllustration className="mx-auto w-full max-w-lg" />
        </PageWrapper>
      </section>

      <section id="features" className="scroll-mt-20 border-t border-border py-16">
        <PageWrapper size="wide">
          <h2 className="max-w-lg font-display text-3xl font-bold tracking-tight">Everything a to-do list should do, and nothing it shouldn’t.</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(feature => {
              const Icon = feature.icon
              return (
                <li key={feature.title}>
                  <button
                    type="button"
                    onClick={() => openFeature(feature)}
                    className="group flex h-full w-full gap-4 rounded-lg border border-border bg-surface p-5 text-left transition-colors hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                    <span>
                      <span className="block font-semibold">{feature.title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{feature.body}</span>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                        Try it <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <Modal
            open={Boolean(chosen)}
            onClose={() => setChosen(null)}
            title="Create a free account to continue"
            description={chosen ? `Sign up or log in to use ${chosen.title.toLowerCase()} and everything else in ${SITE.name}.` : undefined}
          >
            <div className="grid gap-2.5">
              <Link href={chosen ? `/register?next=${encodeURIComponent(chosen.href)}` : '/register'} className={cn(buttonVariants(), 'h-11')}>
                Create account
              </Link>
              <Link href={chosen ? `/login?next=${encodeURIComponent(chosen.href)}` : '/login'} className={cn(buttonVariants({ variant: 'outline' }), 'h-11')}>
                Log in
              </Link>
              <button type="button" onClick={() => setChosen(null)} className="mt-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                Not now
              </button>
            </div>
          </Modal>
        </PageWrapper>
      </section>
    </>
  )
}
