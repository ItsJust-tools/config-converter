'use client';

import React from 'react';
import { ThemeProvider } from '../components/theme-provider/theme-provider';

export function MockThemeProvider({
  theme = 'light',
  children,
}: {
  theme?: 'light' | 'dark';
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div data-theme={theme}>{children}</div>
    </ThemeProvider>
  );
}

export function MockToastProvider({ children }: { children: React.ReactNode }) {
  return <div data-toast-mock>{children}</div>;
}

export function MockIntlProvider({
  locale = 'en',
  messages = {},
  children,
}: {
  locale?: string;
  messages?: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return (
    <div data-intl-mock={locale} data-messages={JSON.stringify(messages)}>
      {children}
    </div>
  );
}
