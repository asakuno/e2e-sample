import { router } from '@inertiajs/react';

type VisitOptions = NonNullable<Parameters<typeof router.visit>[1]>;

export function visitAction(href: string, options?: VisitOptions): () => Promise<void> {
  return () =>
    new Promise<void>((resolve) => {
      const onFinish = options?.onFinish;

      router.visit(href, {
        ...options,
        onFinish: (visit) => {
          try {
            onFinish?.(visit);
          } finally {
            resolve();
          }
        },
      });
    });
}
