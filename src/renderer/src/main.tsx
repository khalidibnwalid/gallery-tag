import '@/style.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  RouterProvider,
  createHashHistory,
  createRouter,
} from '@tanstack/react-router'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { LighthouseProvider } from './components/providers/LighthouseProvider'
import { ThemeProvider } from './components/providers/ThemeProvider'
import { routeTree } from './routeTree.gen'

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
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LighthouseProvider>
          <RouterProvider router={router} />
          <ReactQueryDevtools initialIsOpen={false} />
        </LighthouseProvider>
      </ThemeProvider>
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
