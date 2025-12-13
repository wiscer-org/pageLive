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
                grok: resolve(__dirname, '../src/content-scripts/page-adapters/grok.ts'),
                background: resolve(__dirname, '../src/background.ts'),
            },
        },
    },
});
