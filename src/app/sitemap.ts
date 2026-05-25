import type { MetadataRoute } from 'next';
import { getPublicSiteUrl } from '@/tool/template-metadata';

const SITE_URL = getPublicSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
