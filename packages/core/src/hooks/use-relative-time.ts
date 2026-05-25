'use client';

import { useEffect, useState } from 'react';

const UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
  { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
  { unit: 'day', ms: 1000 * 60 * 60 * 24 },
  { unit: 'hour', ms: 1000 * 60 * 60 },
  { unit: 'minute', ms: 1000 * 60 },
  { unit: 'second', ms: 1000 },
];

function formatRelativeTime(dateIso: string | null): string {
  if (!dateIso) return 'Ready';
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return 'Ready';
  const diff = Date.now() - date.getTime();
  if (diff < 5000) return 'Saved just now';

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const { unit, ms } of UNITS) {
    const value = Math.round(diff / ms);
    if (Math.abs(value) >= 1) {
      return `Saved ${rtf.format(-value, unit).replace(/^in /, '').replace(/ ago$/, '')} ago`;
    }
  }
  return 'Saved just now';
}

export function useRelativeTime(dateIso: string | null): string {
  const [, forceRefresh] = useState(0);

  useEffect(() => {
    if (!dateIso) return;
    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) return;
    const intervalMs = Date.now() - date.getTime() < 10000 ? 5000 : 30000;
    const interval = setInterval(() => {
      forceRefresh((v) => v + 1);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [dateIso]);

  return formatRelativeTime(dateIso);
}
