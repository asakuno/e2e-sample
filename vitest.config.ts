import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    // テスト環境
    environment: 'jsdom',

    // グローバル設定
    globals: true,

    // セットアップファイル
    setupFiles: ['./resources/js/test/setup.ts'],

    // カバレッジ設定
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
        // カスタムフック: 80%以上
        'resources/js/hooks/**': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        // ユーティリティ関数: 80%以上
        'resources/js/lib/**': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        // UIコンポーネント: 70%以上
        'resources/js/components/**': {
          lines: 70,
          functions: 70,
          branches: 70,
          statements: 70,
        },
        // ページコンポーネント: 60%以上
        'resources/js/pages/**': {
          lines: 60,
          functions: 60,
          branches: 60,
          statements: 60,
        },
      },
    },

    // インクルード/エクスクルード
    include: ['resources/js/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'public'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './resources/js'),
    },
  },
});
