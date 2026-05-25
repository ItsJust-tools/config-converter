import { generateJsonLd } from '@/lib/seo';
import type { ToolConfig } from '@itsjust/core';

export function JsonLd({ config }: { config: ToolConfig }) {
  const jsonLd = generateJsonLd(config);
  // Escape </script> sequences by replacing `<` with `<` so the JSON
  // string cannot break out of the `<script>` tag even if ToolConfig contains HTML.
  const safeJson = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson }} />;
}
