import type { MetadataRoute } from 'next';
import { templateMetadata } from '@/tool/template-metadata';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: templateMetadata.appName,
    short_name: templateMetadata.shortName,
    description: templateMetadata.appDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#111827',
    theme_color: '#111827',
    icons: [
      {
        src: templateMetadata.iconPath,
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-192-maskable.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/icon-512-maskable.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
