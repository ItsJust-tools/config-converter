import type { Exporter } from '@itsjust/core';
import { createCanvasExporter } from './utils';

const pngExporter: Exporter = createCanvasExporter('png', 'image/png', 'png');

export default pngExporter;
