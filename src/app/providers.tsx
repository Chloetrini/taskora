'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Slide, ToastContainer } from 'react-toastify'
import { ThemeProvider } from '@/context/theme-context'

export default function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session (never shared between users on the server).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30 * 1000, gcTime: 5 * 60 * 1000, refetchOnWindowFocus: true, retry: 1 },
        },
      })
  )

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <ToastContainer position="bottom-center" autoClose={2500} hideProgressBar newestOnTop closeOnClick pauseOnFocusLoss={false} theme="light" transition={Slide} />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
