import {
  expect,
  test as base,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test';

type BrowserCheckFixtures = {
  originGuard: void;
};

const configuredBaseURL = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8000');
if (configuredBaseURL.hostname === 'nginx') {
  configuredBaseURL.hostname = 'localhost';
}
if (!['http:', 'https:'].includes(configuredBaseURL.protocol)) {
  throw new Error('PLAYWRIGHT_BASE_URL must use http or https');
}
const allowedOrigin = configuredBaseURL.origin;

type RuntimeMethod = (...arguments_: unknown[]) => unknown;

function replaceMethod(
  target: object,
  methodName: string,
  replacementFactory: (original: RuntimeMethod) => RuntimeMethod,
): () => void {
  const original = Reflect.get(target, methodName);
  if (typeof original !== 'function') {
    throw new Error(`Cannot protect unavailable Playwright method ${methodName}`);
  }
  const hadOwnProperty = Object.prototype.hasOwnProperty.call(target, methodName);
  const originalDescriptor = Object.getOwnPropertyDescriptor(target, methodName);
  const replacement = replacementFactory(original.bind(target) as RuntimeMethod);
  if (
    !Reflect.defineProperty(target, methodName, {
      configurable: true,
      writable: true,
      value: replacement,
    })
  ) {
    throw new Error(`Cannot protect Playwright method ${methodName}`);
  }

  return () => {
    if (hadOwnProperty && originalDescriptor) {
      Reflect.defineProperty(target, methodName, originalDescriptor);
    } else {
      Reflect.deleteProperty(target, methodName);
    }
  };
}

function normalizedNetworkOrigin(rawUrl: string): string | undefined {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return undefined;
  }

  if (url.protocol === 'ws:') {
    url.protocol = 'http:';
  } else if (url.protocol === 'wss:') {
    url.protocol = 'https:';
  }

  if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'blob:') {
    return url.origin;
  }

  return undefined;
}

function isAllowedUrl(rawUrl: string): boolean {
  return normalizedNetworkOrigin(rawUrl) === allowedOrigin;
}

function isAllowedNavigationUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl, configuredBaseURL);
  } catch {
    return false;
  }
  return ['http:', 'https:'].includes(url.protocol) && url.origin === allowedOrigin;
}

function resolvedApiUrl(input: unknown): string | undefined {
  if (typeof input === 'string') {
    try {
      return new URL(input, configuredBaseURL).toString();
    } catch {
      return undefined;
    }
  }
  if (!input || typeof input !== 'object') {
    return undefined;
  }
  const urlMember = Reflect.get(input, 'url');
  if (typeof urlMember === 'string') {
    return urlMember;
  }
  if (typeof urlMember === 'function') {
    const result = urlMember.call(input);
    return typeof result === 'string' ? result : undefined;
  }
  return undefined;
}

export const test = base.extend<BrowserCheckFixtures>({
  originGuard: [
    async ({ browser, context, request }, use) => {
      const violations = new Set<string>();
      const restoreActions: Array<() => void> = [];
      const pageListenerCleanups: Array<() => void> = [];
      const protectedApiContexts = new WeakSet<APIRequestContext>();
      const observedPages = new WeakSet<Page>();
      let approvedNavigationObserved = false;
      const recordViolation = (kind: string, url: string): void => {
        violations.add(`${kind}: ${url}`);
      };
      const rejectPlaywrightMethod = (kind: string, methodName: string): RuntimeMethod => {
        return () => {
          recordViolation(kind, methodName);
          throw new Error(`${methodName} is disabled for isolated browser checks`);
        };
      };
      const protectApiContext = (apiContext: APIRequestContext, label: string): void => {
        if (protectedApiContexts.has(apiContext)) {
          return;
        }
        protectedApiContexts.add(apiContext);
        for (const methodName of ['delete', 'fetch', 'get', 'head', 'patch', 'post', 'put']) {
          restoreActions.push(
            replaceMethod(apiContext, methodName, (original) => {
              return (...arguments_) => {
                const url = resolvedApiUrl(arguments_[0]);
                if (!url || !isAllowedUrl(url)) {
                  recordViolation(
                    `${label} API request blocked outside the approved origin`,
                    url ?? '<invalid URL>',
                  );
                  throw new Error(`${label}.${methodName} may target only ${allowedOrigin}`);
                }
                return original(...arguments_);
              };
            }),
          );
        }
      };
      const protectRoutingMethods = (target: BrowserContext | Page, label: string): void => {
        for (const methodName of [
          'route',
          'routeFromHAR',
          'routeWebSocket',
          'unroute',
          'unrouteAll',
        ]) {
          if (typeof Reflect.get(target, methodName) === 'function') {
            restoreActions.push(
              replaceMethod(target, methodName, () =>
                rejectPlaywrightMethod(
                  `${label} attempted to replace the approved network policy`,
                  methodName,
                ),
              ),
            );
          }
        }
      };
      const protectPageListenerMethods = (page: Page): void => {
        for (const methodName of [
          'addListener',
          'off',
          'on',
          'once',
          'prependListener',
          'prependOnceListener',
          'removeAllListeners',
          'removeListener',
        ]) {
          if (typeof Reflect.get(page, methodName) === 'function') {
            restoreActions.push(
              replaceMethod(page, methodName, () =>
                rejectPlaywrightMethod(
                  'page attempted to replace the approved listener policy',
                  methodName,
                ),
              ),
            );
          }
        }
      };
      const observePage = (page: Page): void => {
        if (observedPages.has(page)) {
          return;
        }
        observedPages.add(page);
        const onFrameNavigated = (frame: ReturnType<Page['mainFrame']>): void => {
          if (frame !== page.mainFrame()) {
            return;
          }
          if (!isAllowedNavigationUrl(frame.url())) {
            recordViolation('top-level navigation left the approved HTTP(S) origin', frame.url());
          } else {
            approvedNavigationObserved = true;
          }
        };
        const onClose = (): void => {
          if (!isAllowedNavigationUrl(page.url())) {
            recordViolation(
              'closed page did not finish on the approved HTTP(S) origin',
              page.url(),
            );
          }
        };
        page.on('framenavigated', onFrameNavigated);
        page.on('close', onClose);
        pageListenerCleanups.push(() => {
          page.off('framenavigated', onFrameNavigated);
          page.off('close', onClose);
        });
        restoreActions.push(
          replaceMethod(page, 'goto', (original) => {
            return (...arguments_) => {
              const target = arguments_[0];
              if (typeof target !== 'string') {
                recordViolation('page.goto blocked an invalid target', '<non-string URL>');
                throw new Error(`page.goto may target only ${allowedOrigin}`);
              }
              let resolvedTarget: string;
              try {
                resolvedTarget = new URL(target, configuredBaseURL).toString();
              } catch {
                recordViolation('page.goto blocked an invalid target', target);
                throw new Error(`page.goto may target only ${allowedOrigin}`);
              }
              if (!isAllowedNavigationUrl(resolvedTarget)) {
                recordViolation(
                  'page.goto blocked a target outside the approved HTTP(S) origin',
                  resolvedTarget,
                );
                throw new Error(`page.goto may target only ${allowedOrigin}`);
              }
              return original(...arguments_);
            };
          }),
        );
        protectRoutingMethods(page, 'page');
        protectPageListenerMethods(page);
      };

      const unexpectedContext = (createdContext: BrowserContext): void => {
        if (createdContext !== context) {
          recordViolation('additional browser context was created', '<new context>');
          void createdContext.close().catch(() => undefined);
        }
      };

      let useError: unknown;
      try {
        context.pages().forEach(observePage);
        context.on('page', observePage);
        browser.on('context', unexpectedContext);
        await context.route('**/*', async (route) => {
          const url = route.request().url();
          if (!isAllowedUrl(url)) {
            recordViolation('network request blocked outside the approved origin', url);
            await route.abort('blockedbyclient');
            return;
          }
          await route.continue();
        });
        await context.routeWebSocket(/.*/, async (webSocketRoute) => {
          const url = webSocketRoute.url();
          if (!isAllowedUrl(url)) {
            recordViolation('WebSocket blocked outside the approved origin', url);
            await webSocketRoute.close({ code: 1008, reason: 'Origin not approved' });
            return;
          }
          webSocketRoute.connectToServer();
        });

        protectApiContext(request, 'request fixture');
        protectApiContext(context.request, 'browser-context request');
        protectRoutingMethods(context, 'browser context');

        for (const methodName of ['newBrowserCDPSession', 'newContext', 'newPage']) {
          restoreActions.push(
            replaceMethod(browser, methodName, () =>
              rejectPlaywrightMethod(
                'browser attempted to create an unguarded execution surface',
                methodName,
              ),
            ),
          );
        }
        restoreActions.push(
          replaceMethod(context, 'newCDPSession', () =>
            rejectPlaywrightMethod(
              'browser context attempted to create an unguarded CDP session',
              'newCDPSession',
            ),
          ),
        );
        const browserType = browser.browserType();
        for (const methodName of [
          'connect',
          'connectOverCDP',
          'launch',
          'launchPersistentContext',
          'launchServer',
        ]) {
          if (typeof Reflect.get(browserType, methodName) === 'function') {
            restoreActions.push(
              replaceMethod(browserType, methodName, () =>
                rejectPlaywrightMethod(
                  'browser type attempted to create an unguarded browser',
                  methodName,
                ),
              ),
            );
          }
        }
        try {
          await use();
        } catch (error) {
          useError = error;
        }

        const remainingPages = context.pages();
        for (const remainingPage of remainingPages) {
          if (!isAllowedNavigationUrl(remainingPage.url())) {
            recordViolation(
              'remaining page did not finish on the approved HTTP(S) origin',
              remainingPage.url(),
            );
          }
        }
        if (remainingPages.length === 0 && !approvedNavigationObserved) {
          recordViolation('no approved top-level navigation was observed', '<no remaining page>');
        }
      } finally {
        browser.off('context', unexpectedContext);
        context.off('page', observePage);
        for (const restore of restoreActions.reverse()) {
          restore();
        }
        for (const cleanup of pageListenerCleanups) {
          cleanup();
        }
      }

      expect(
        [...violations],
        `browser check attempted to leave approved origin ${allowedOrigin}`,
      ).toEqual([]);
      if (useError !== undefined) {
        throw useError;
      }
    },
    { auto: true },
  ],
});

export { expect };
