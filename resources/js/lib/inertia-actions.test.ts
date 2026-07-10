import { router } from '@inertiajs/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { visitAction } from './inertia-actions';

type VisitOptions = NonNullable<Parameters<typeof router.visit>[1]>;
type PendingVisit = Parameters<NonNullable<VisitOptions['onBefore']>>[0];
type ActiveVisit = Parameters<NonNullable<VisitOptions['onFinish']>>[0];

describe('visitAction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('onBefore が false を返した場合も action が完了すること', async () => {
    // Arrange
    const onBefore = vi.fn(() => false);
    const visit = {} as PendingVisit;
    const visitSpy = vi.spyOn(router, 'visit').mockImplementation(() => {});
    const action = visitAction('/stocks', { onBefore });
    const expected = { beforeResult: false, onBeforeCalls: 1, result: undefined };

    // Act
    const promise = action();
    const options = visitSpy.mock.calls[0]?.[1];
    const beforeResult = options?.onBefore?.(visit);
    const result = await promise;
    const actual = {
      beforeResult,
      onBeforeCalls: onBefore.mock.calls.length,
      result,
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('global before event で遷移がキャンセルされた場合も action が完了すること', async () => {
    // Arrange
    const visit = {} as PendingVisit;
    const visitSpy = vi.spyOn(router, 'visit').mockImplementation(() => {});
    const cancelVisit = (event: Event) => event.preventDefault();
    const action = visitAction('/stocks');
    const expected = undefined;

    // Act
    const promise = action();
    const options = visitSpy.mock.calls[0]?.[1];
    options?.onBefore?.(visit);
    document.addEventListener('inertia:before', cancelVisit);
    document.dispatchEvent(new CustomEvent('inertia:before', { cancelable: true }));
    document.removeEventListener('inertia:before', cancelVisit);
    const actual = await promise;

    // Assert
    expect(actual).toBe(expected);
  });

  it('onFinish が呼ばれた場合、利用側の callback を実行して action が完了すること', async () => {
    // Arrange
    const onFinish = vi.fn();
    const visit = {} as ActiveVisit;
    const visitSpy = vi.spyOn(router, 'visit').mockImplementation(() => {});
    const action = visitAction('/stocks', { onFinish });
    const expected = { onFinishCalls: 1, result: undefined };

    // Act
    const promise = action();
    const options = visitSpy.mock.calls[0]?.[1];
    options?.onFinish?.(visit);
    const result = await promise;
    const actual = { onFinishCalls: onFinish.mock.calls.length, result };

    // Assert
    expect(actual).toEqual(expected);
  });
});
