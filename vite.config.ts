import { defineConfig } from 'vite';
import { resolve } from 'path';
import hotReloadExtension from 'hot-reload-extension-vite';


export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  },
  plugins: [
    process.env.NODE_ENV === 'development' && hotReloadExtension({
      log: true,
      backgroundPath: 'src/background.ts'
    }),
  ].filter(Boolean),
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        gemini: resolve(__dirname, 'src/content-scripts/page-adapters/gemini.ts'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        format: 'es',
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background.js'; // Output background script at dist/background.js
          }
          return 'content-scripts/[name].js'; // Content scripts in dist/content-scripts/
        },
        chunkFileNames: 'content-scripts/[name]-[hash].js', // Shared chunks
      },
    },
    emptyOutDir: false,
  },
});