import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        general: resolve(__dirname, 'src/content-scripts/general.ts'),
        gemini: resolve(__dirname, 'src/content-scripts/gemini.ts'),
        xai: resolve(__dirname, 'src/content-scripts/xai.ts'),
      },
      output: {
        entryFileNames: 'content-scripts/[name].js',
      },
    },
    emptyOutDir: false,
  },
});
