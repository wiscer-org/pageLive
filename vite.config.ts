import { defineConfig } from 'vite';
import { resolve } from 'path';
import hotReloadExtension from 'hot-reload-extension-vite';


export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  },
  plugins: [
    hotReloadExtension({
      log: true,
      // Background script is mandatory
      backgroundPath: 'src/background.ts'
    }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        general: resolve(__dirname, 'src/content-scripts/general.ts'),
        gemini: resolve(__dirname, 'src/content-scripts/gemini.ts'),
        xai: resolve(__dirname, 'src/content-scripts/xai.ts'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background.js'; // Output background script at dist/background.js
          }
          return 'content-scripts/[name].js'; // Content scripts in dist/content-scripts/
        },
      },
    },
    emptyOutDir: false,
  },
});