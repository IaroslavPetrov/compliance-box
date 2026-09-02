import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ToastProvider } from '../contexts/ToastContext'
import { PostHogProvider, PostHogPageView } from '../contexts/PostHogClient'
import './globals.css'

export const metadata: Metadata = {
  title: 'ComplianceBox',
  description: 'SaaS для автоматизации 152-ФЗ и ФСТЭК',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://compliance-box-backend.onrender.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://compliance-box-backend.onrender.com" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#0A0A0A' }}>
        <PostHogProvider>
          <ToastProvider>
            <Suspense fallback={null}>
              <PostHogPageView />
            </Suspense>
            {children}
          </ToastProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}