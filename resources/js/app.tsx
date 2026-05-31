import './bootstrap';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { hydrateRoot } from 'react-dom/client';
import { appName, progressConfig } from './config/app';

void createInertiaApp({
  title: (title) => `${title} - ${appName}`,
  resolve: (name) =>
    resolvePageComponent(
      `./pages/${name}.tsx`,
      import.meta.glob(['./pages/**/*.tsx', '!./pages/**/__tests__/**', '!./pages/**/*.test.tsx']),
    ),
  setup({ el, App, props }) {
    hydrateRoot(el, <App {...props} />);
  },
  progress: progressConfig,
});
