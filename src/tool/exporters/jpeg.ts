import type { Exporter } from '@itsjust/core';
import { createCanvasExporter } from './utils';

const jpegExporter: Exporter = createCanvasExporter('jpeg', 'image/jpeg', 'jpg', 0.92);

export default jpegExporter;
