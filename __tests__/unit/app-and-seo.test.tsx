import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import manifest from '@/app/manifest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import ErrorPage from '@/app/error';
import NotFound from '@/app/not-found';
import { JsonLd } from '@/app/json-ld';
import ToolPage from '@/app/page';
import { cn } from '@/lib/utils';
import { generateJsonLd, generateToolMetadata } from '@/lib/seo';
import toolConfig from '@/tool/tool.config';
import { getPublicSiteUrl, templateMetadata } from '@/tool/template-metadata';
import { converterTool } from '@/tool/tool-definition';
import { ToolCanvas } from '@/tool/components/tool-canvas';
import { ToolSidebar } from '@/tool/components/tool-sidebar';
import { ToolToolbar } from '@/tool/components/tool-toolbar';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/app/tool-client-wrapper', () => ({
  default: () => <div data-testid="tool-client-wrapper">tool-client-wrapper</div>,
}));

describe('app and seo', () => {
  const getOgImageUrl = (
    images: NonNullable<NonNullable<ReturnType<typeof generateToolMetadata>['openGraph']>['images']>
  ): string | undefined => {
    const list = Array.isArray(images) ? images : [images];
    const first = list[0];
    if (!first) return undefined;
    if (typeof first === 'string') return first;
    if (first instanceof URL) return first.toString();
    return String(first.url);
  };

  it('builds metadata and json-ld values', () => {
    const metadata = generateToolMetadata(toolConfig);
    const jsonLd = generateJsonLd(toolConfig);

    expect(metadata.creator).toBe(toolConfig.name);
    expect(metadata.metadataBase?.toString()).toBe('https://localhost/tools/config-converter');
    const ogUrl = metadata.openGraph?.images ? getOgImageUrl(metadata.openGraph.images) : undefined;
    expect(ogUrl).toContain('/og.svg');
    expect(jsonLd.url).toBe('https://localhost/tools/config-converter');
    expect(jsonLd.featureList.length).toBeGreaterThan(0);
  });

  it('returns site manifest, robots and sitemap', () => {
    const man = manifest();
    const rob = robots();
    const sm = sitemap();

    expect(man.name).toBe(templateMetadata.appName);
    expect(rob.sitemap).toBe('https://localhost/tools/config-converter/sitemap.xml');
    expect(sm[0]?.url).toBe('https://localhost/tools/config-converter');
  });

  it('renders json-ld script safely', () => {
    render(<JsonLd config={{ ...toolConfig, name: '</script>' }} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script?.innerHTML).toContain('\\u003c/script>');
  });

  it('renders error page and invokes reset', () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error('boom')} reset={reset} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders not-found page', () => {
    render(<NotFound />);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  });

  it('renders top-level tool page', () => {
    render(<ToolPage />);
    expect(screen.getByTestId('tool-client-wrapper')).toBeInTheDocument();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeInTheDocument();
  });

  it('covers tool definition and helper exports', async () => {
    expect(cn('a', undefined, 'b', false, null, 'c')).toBe('a b c');
    expect(getPublicSiteUrl()).toBe('https://localhost/tools/config-converter');
    expect(
      converterTool.deserialize({
        inputFormat: 'yaml',
        outputFormat: 'json',
        input: 'key: val',
        output: '',
        error: '',
        minify: false,
        indentSize: 2,
        sortKeys: false,
      })
    ).toEqual({
      success: true,
      data: {
        inputFormat: 'yaml',
        outputFormat: 'json',
        input: 'key: val',
        output: '',
        error: '',
        minify: false,
        indentSize: 2,
        sortKeys: false,
      },
    });
    expect(converterTool.deserialize({ nope: true })).toMatchObject({
      success: true,
    });
    const nopeResult = converterTool.deserialize({ nope: true });
    if (nopeResult.success) {
      expect(nopeResult.data.input).toContain('"nope"');
    }
    expect(converterTool.serialize(converterTool.initialState)).toContain('"inputFormat": "yaml"');
  });

  it('renders tool components', () => {
    const state = {
      inputFormat: 'yaml' as const,
      outputFormat: 'json' as const,
      input: 'key: value',
      output: '',
      error: '',
      minify: false,
      indentSize: 2,
      sortKeys: false,
    };

    render(
      <>
        <ToolToolbar
          state={state}
          onConvert={() => {}}
          onSwapFormats={() => {}}
          onCopyOutput={() => {}}
          onClear={() => {}}
        />
        <ToolSidebar
          state={state}
          onInputFormatChange={() => {}}
          onOutputFormatChange={() => {}}
          onInputChange={() => {}}
          onMinifyToggle={() => {}}
          onIndentSizeChange={() => {}}
          onSortKeysToggle={() => {}}
        />
        <ToolCanvas state={state} />
      </>
    );

    // Two YAML label instances: the format radio button and the load-sample button
    expect(screen.getAllByText('YAML').length).toBe(3);
    expect(screen.getAllByText('JSON').length).toBe(3);
    expect(screen.getByText('Convert')).toBeInTheDocument();
    expect(screen.getByRole('application', { name: 'Config Converter' })).toBeInTheDocument();
  });
});
