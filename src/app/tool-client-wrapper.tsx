'use client';

import dynamic from 'next/dynamic';

const ToolClient = dynamic(() => import('./tool-client'), { ssr: false });

export default function ToolClientWrapper() {
  return <ToolClient />;
}
