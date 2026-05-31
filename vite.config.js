import { defineConfig } from 'vite-plus';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [
    wayfinder(),
    laravel({
      input: ['resources/css/app.css', 'resources/js/app.tsx'],
      ssr: 'resources/js/ssr.tsx',
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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./resources/js/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'resources/js/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/',
        'dist/',
      ],
      thresholds: {
        'resources/js/hooks/**': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        'resources/js/lib/**': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        'resources/js/components/**': {
          lines: 70,
          functions: 70,
          branches: 70,
          statements: 70,
        },
        'resources/js/pages/**': {
          lines: 60,
          functions: 60,
          branches: 60,
          statements: 60,
        },
      },
    },
    include: ['resources/js/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'public'],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    ignorePatterns: [
      'node_modules/**',
      'vendor/**',
      'public/**',
      'storage/**',
      'dist/**',
      'resources/js/types/generated.d.ts',
      'resources/js/types/model.d.ts',
      'resources/js/actions/**',
      'resources/js/routes/**',
      'resources/js/wayfinder/**',
    ],
  },
  fmt: {
    useTabs: false,
    tabWidth: 2,
    printWidth: 100,
    singleQuote: true,
    semi: true,
    trailingComma: 'all',
    ignorePatterns: [
      'node_modules/**',
      'vendor/**',
      'public/**',
      'storage/**',
      'dist/**',
      'resources/js/types/generated.d.ts',
      'resources/js/types/model.d.ts',
      'resources/js/actions/**',
      'resources/js/routes/**',
      'resources/js/wayfinder/**',
    ],
  },
  staged: {
    '*.{js,ts,tsx}': 'vp check --fix',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    cors: {
      origin: process.env.VITE_DEV_SERVER_CORS_ORIGIN
        ? process.env.VITE_DEV_SERVER_CORS_ORIGIN.split(',')
        : ['http://localhost', 'http://localhost:80'],
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
