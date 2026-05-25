import type { MetadataRoute } from 'next';
import { getPublicSiteUrl } from '@/tool/template-metadata';

const SITE_URL = getPublicSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
