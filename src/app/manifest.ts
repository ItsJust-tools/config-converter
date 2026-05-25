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
    ],
  };
}
