#!/usr/bin/env node

import { runDockerBrowserCheck } from './run-browser-check-smoke.mjs';

const runDirRelative = process.env.BROWSER_CHECK_RUN_DIR?.trim();
if (!runDirRelative) {
  throw new Error('BROWSER_CHECK_RUN_DIR is required for Docker browser-check execution');
}

const authStateInput = process.env.BROWSER_CHECK_USE_AUTH_STATE?.trim() || 'false';
if (!['true', 'false'].includes(authStateInput)) {
  throw new Error('BROWSER_CHECK_USE_AUTH_STATE must be true or false when provided');
}

process.exitCode = await runDockerBrowserCheck(runDirRelative, {
  useAuthState: authStateInput === 'true',
  wrapperArguments: process.argv.slice(2),
});
