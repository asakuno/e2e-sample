import { router } from '@inertiajs/react';

type VisitOptions = NonNullable<Parameters<typeof router.visit>[1]>;
type InertiaRequest = (options: VisitOptions) => void;

/**
 * Inertia のリクエスト完了まで action を pending に保つ。
 * リクエスト開始後のキャンセルは onFinish、開始前のキャンセルは before event で完了させる。
 */
export function runInertiaAction(
  request: InertiaRequest,
  options: VisitOptions = {},
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const { onBefore, onFinish } = options;
    let settled = false;
    let removeBeforeListener: (() => void) | undefined;

    const cleanup = () => {
      removeBeforeListener?.();
      removeBeforeListener = undefined;
    };

    const resolveOnce = () => {
      if (settled) return;

      settled = true;
      cleanup();
      resolve();
    };

    const rejectOnce = (error: unknown) => {
      if (settled) return;

      settled = true;
      cleanup();
      reject(error);
    };

    try {
      request({
        ...options,
        onBefore: (visit) => {
          const result = onBefore?.(visit);

          if (result === false) {
            resolveOnce();
            return false;
          }

          if (typeof document !== 'undefined') {
            const handleBefore = (event: Event) => {
              queueMicrotask(() => {
                if (event.defaultPrevented) {
                  resolveOnce();
                }
              });
            };

            document.addEventListener('inertia:before', handleBefore, {
              capture: true,
              once: true,
            });
            removeBeforeListener = () => {
              document.removeEventListener('inertia:before', handleBefore, true);
            };
          }

          return result;
        },
        onFinish: (visit) => {
          try {
            onFinish?.(visit);
            resolveOnce();
          } catch (error) {
            rejectOnce(error);
          }
        },
      });
    } catch (error) {
      rejectOnce(error);
    }
  });
}

export function inertiaAction(
  request: InertiaRequest,
  options?: VisitOptions,
): () => Promise<void> {
  return () => runInertiaAction(request, options);
}

/**
 * Inertia リクエストの pending を追跡するための action を返す。
 * Inertia React adapter が行うページ交換自体を React Transition に変換するものではない。
 */
export function visitAction(href: string, options?: VisitOptions): () => Promise<void> {
  return inertiaAction((visitOptions) => {
    router.visit(href, visitOptions);
  }, options);
}
