import type { Metadata } from 'next'

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
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f8fafc' }}>
        {children}
      </body>
    </html>
  )
}