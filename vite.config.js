import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        tailwindcss(),
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
        },
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        cors: {
            origin: ['http://localhost', 'http://localhost:80'],
            credentials: true,
        },
        hmr: {
            host: 'localhost',
        },
        watch: {
            ignored: [
                '**/storage/framework/views/**',
                '**/node_modules/**',
                '**/dist/**',
                '**/vendor/**',
                '**/.git/**',
            ],
            usePolling: true,
            interval: 500,
            binaryInterval: 10000,
        },
    },
});
