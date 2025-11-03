import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/lib/providers/auth-provider'
import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// const inter = Inter({
//   subsets: ['latin'],
//   variable: '--font-inter',
//   display: 'swap',
// })

// const roboto_mono = Roboto_Mono({
//   subsets: ['latin'],
//   variable: '--font-roboto-mono',
//   display: 'swap',
// })

export const metadata: Metadata = {
  title: 'Open Agent Kit',
  description:
    'Open source AI Agent development platform with visual builder, LangCrew framework, chat engine, and developer studio for tracing and evaluation.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="tracking-[-0.01em]">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
