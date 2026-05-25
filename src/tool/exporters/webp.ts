import type { Exporter } from '@itsjust/core';
import { createCanvasExporter } from './utils';

const webpExporter: Exporter = createCanvasExporter('webp', 'image/webp', 'webp', 0.9);

export default webpExporter;
