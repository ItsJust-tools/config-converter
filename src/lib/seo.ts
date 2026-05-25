import type { Metadata } from 'next';
import type { ToolConfig } from '@itsjust/core';
import { getPublicSiteUrl, templateMetadata } from '@/tool/template-metadata';

const SITE_URL = getPublicSiteUrl();

export function generateToolMetadata(config: ToolConfig): Metadata {
  const title = config.name;
  const description = config.description;
  const url = `${SITE_URL}`;
  const ogImage = config.ogImage ? `${SITE_URL}${config.ogImage}` : `${SITE_URL}/og.svg`;

  return {
    title: {
      default: title,
      template: `%s`,
    },
    description,
    keywords: [
      config.name,
      config.id,
      ...config.exportFormats.map((f) => `${f} export`),
      ...config.exportFormats.map((f) => `export to ${f}`),
    ],
    authors: [{ name: config.name }],
    creator: config.name,
    publisher: config.name,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'website',
      locale: templateMetadata.locale,
      url,
      title,
      description,
      siteName: config.name,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: config.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export function generateJsonLd(config: ToolConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: config.name,
    description: config.description,
    url: SITE_URL,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    featureList: [
      config.features.export && `Export as ${config.exportFormats.join(', ')}`,
      config.features.autoSave && 'Auto-save',
      config.features.undoRedo && 'Undo & Redo',
      config.features.darkMode && 'Dark mode',
    ].filter((s): s is string => typeof s === 'string'),
  };
}
