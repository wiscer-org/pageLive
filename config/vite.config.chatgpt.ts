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
                chatgpt: resolve(__dirname, '../src/content-scripts/page-adapters/chatgpt/chatgpt.ts'),
            },
        },
    },
});
