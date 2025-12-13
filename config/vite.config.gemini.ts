import { defineConfig, mergeConfig } from 'vite';
import { resolve } from 'path';
import baseConfig from '../vite.config';

export default defineConfig({
    ...baseConfig,
    build: {
        ...baseConfig.build,
        rollupOptions: {
            ...baseConfig.build?.rollupOptions,
            input: {
                gemini: resolve(__dirname, '../src/content-scripts/page-adapters/gemini.ts'),
                background: resolve(__dirname, '../src/background.ts'),
            },
        },
    },
});
