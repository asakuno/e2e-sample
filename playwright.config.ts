/// <reference types="node" />

import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright設定ファイル
 * Laravel + Inertia.js アプリケーション用
 */

// 環境変数の型ガードと検証
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8000';
if (!baseURL.startsWith('http://') && !baseURL.startsWith('https://')) {
  throw new Error('PLAYWRIGHT_BASE_URL must start with http:// or https://');
}

// Docker環境判定（nginx を含むURLはDocker内部ネットワーク）
const isDocker = baseURL.includes('nginx');
const browserBaseURL = isDocker ? baseURL.replace('nginx', 'localhost') : baseURL;

// リトライ回数を環境変数で設定可能に
const maxRetries = parseInt(process.env.PLAYWRIGHT_RETRIES ?? '2', 10);

export default defineConfig({
  testDir: './tests/e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? maxRetries : 0,
  workers: 1,
  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  reporter: process.env.CI
    ? [['blob'], ['github'], ['junit', { outputFile: 'test-results/results.xml' }]]
    : [['html', { outputFolder: 'playwright-report' }], ['list']],

  use: {
    baseURL: browserBaseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    ...(isDocker
      ? {
          launchOptions: {
            args: ['--host-resolver-rules=MAP localhost nginx'],
          },
        }
      : {}),
  },

  projects: [
    // 認証セットアップ
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Chrome
    {
      name: 'chromium',
      testIgnore: /.*\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    // モバイル（任意）
    // {
    //   name: 'mobile-chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //     storageState: 'playwright/.auth/user.json',
    //   },
    //   dependencies: ['setup'],
    // },
  ],

  // Docker環境ではwebServerを無効化（nginx経由でアクセス）
  ...(isDocker
    ? {}
    : {
        webServer: {
          command: 'php artisan serve --port=8000',
          url: 'http://localhost:8000',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      }),
});
