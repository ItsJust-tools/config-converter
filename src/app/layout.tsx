import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { ThemeProvider, ThemeScript, ToastProvider } from '@itsjust/core';
import { generateToolMetadata } from '@/lib/seo';
import toolConfig from '@/tool/tool.config';
import { templateMetadata } from '@/tool/template-metadata';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  ...generateToolMetadata(toolConfig),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0e14' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={templateMetadata.htmlLang}
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript toolTheme={toolConfig.theme} />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="skip-nav">
          Skip to content
        </a>
        <ThemeProvider toolTheme={toolConfig.theme}>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
