import toolConfig from './tool.config';

export const templateMetadata = {
  htmlLang: 'en',
  appName: toolConfig.name,
  shortName: 'ConfigConv',
  appDescription: toolConfig.description,
  themeColor: '#eab308',
  backgroundColor: '#fefce8',
  siteName: toolConfig.name,
  siteUrl: 'https://itsjust.tools/tools/config-converter',
  socialImage: '/og-image.png',
  twitterHandle: '@itsjust_tools',
  generator: 'itsjust.tools',
  locale: 'en_US',
  author: 'ItsJust Tools',
  copyright: `© ${new Date().getFullYear()} ItsJust Tools`,
  license: 'MIT',
  repository: 'https://github.com/ItsJust-tools/config-converter',
  iconPath: '/icon.svg',
  splashBackground: '#fefce8',
};

export function getPublicSiteUrl(): string {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'itsjust.tools';
  return `https://${hostname}/tools/${toolConfig.id}`;
}
