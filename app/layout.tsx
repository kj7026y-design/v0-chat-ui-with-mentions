import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { BottomNavBar } from '@/components/chat/bottom-nav-bar'
import { CreditHydrator } from '@/components/credit-hydrator'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'StoryChat AI',
  description: 'AI 캐릭터와 함께하는 인터랙티브 스토리 채팅',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          disableTransitionOnChange
        >
          <CreditHydrator />
          {/* App Shell - flex column, nav stacks as a normal block below the single scroll area */}
          <div className="flex flex-col h-[100dvh] overflow-hidden">
            <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
              {children}
            </div>

            {/* Global Bottom Navigation - Mobile Only */}
            <div className="shrink-0 sm:hidden">
              <BottomNavBar />
            </div>
          </div>

          <Toaster position="top-center" swipeDirections={["left", "right", "top"]} />
        </ThemeProvider>
        
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
