import { useEffect, useState, type TransitionStartFunction } from 'react';

type UseDebouncedValueOptions = {
  intervalMs: number;
  startTransition: TransitionStartFunction;
};

function sleep(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      resolve(true);
    }, ms);

    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeoutId);
        resolve(false);
      },
      { once: true },
    );
  });
}

export function useDebouncedValue<T>(value: T, options: UseDebouncedValueOptions): T {
  const { intervalMs, startTransition } = options;
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    if (Object.is(value, debouncedValue)) {
      return;
    }

    const controller = new AbortController();

    startTransition(async () => {
      const shouldUpdate = await sleep(intervalMs, controller.signal);

      if (!shouldUpdate) {
        return;
      }

      startTransition(() => {
        setDebouncedValue(value);
      });
    });

    return () => {
      controller.abort();
    };
  }, [value, debouncedValue, intervalMs, startTransition]);

  return debouncedValue;
}
