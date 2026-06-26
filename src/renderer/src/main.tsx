import '@/style.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  RouterProvider,
  createHashHistory,
  createRouter,
} from '@tanstack/react-router'
import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { LighthouseProvider } from './components/providers/LighthouseProvider'
import { ThemeProvider } from './components/providers/ThemeProvider'
import { Toaster } from './components/ui/toast'
import { setupGlobalNotifier } from './lib/notifier'
import { routeTree } from './routeTree.gen'
import { HotkeysProvider } from '@tanstack/react-hotkeys'

import { useSelectionStore } from './lib/store/selection'

// wails go docs recommend using hash history
const hashHistory = createHashHistory()
const router = createRouter({ routeTree, history: hashHistory })

const queryClient = new QueryClient()

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  useEffect(() => setupGlobalNotifier(queryClient), [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const activeEl = document.activeElement
        if (
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.getAttribute('contenteditable') === 'true')
        )
          return
        const selectionStore = useSelectionStore.getState()
        if (selectionStore.isSelectionMode)
          selectionStore.toggleSelectionMode(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Toaster />
        <HotkeysProvider>
          <LighthouseProvider>
            <RouterProvider router={router} />
          </LighthouseProvider>
        </HotkeysProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
