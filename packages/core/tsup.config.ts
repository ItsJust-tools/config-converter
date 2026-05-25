import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['next', 'react', 'react-dom'],
    minify: true,
    treeshake: true,
  },
  {
    entry: ['src/testing/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: false,
    external: ['next', 'react', 'react-dom', '@testing-library/react'],
    minify: true,
    treeshake: true,
  },
]);
