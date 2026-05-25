import { JsonLd } from './json-ld';
import toolConfig from '@/tool/tool.config';
import ToolClient from './tool-client-wrapper';

export default function ToolPage() {
  return (
    <>
      <JsonLd config={toolConfig} />
      <ToolClient />
    </>
  );
}
