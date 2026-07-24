import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vite-plus/test';

vi.mock('@/components/ui/InertiaActionLink', () => ({
  InertiaActionLink: ({
    href,
    children,
    pendingClassName: _pendingClassName,
    visitOptions: _visitOptions,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    pendingClassName?: string;
    visitOptions?: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { Pagination } from '@/components/ui/Pagination';

describe('Pagination', () => {
  const baseMeta = {
    current_page: 2,
    from: 21,
    last_page: 4,
    path: 'http://localhost/stocks',
    per_page: 20,
    to: 40,
    total: 80,
  };

  test('複数ページの場合、現在範囲と前後の遷移先を表示すること', () => {
    // Arrange
    const expected = {
      status: '80件中 21–40件を表示',
      previous: 'http://localhost/stocks?page=1',
      next: 'http://localhost/stocks?page=3',
    };

    // Act
    render(
      <Pagination
        links={{
          first: 'http://localhost/stocks?page=1',
          last: 'http://localhost/stocks?page=4',
          prev: expected.previous,
          next: expected.next,
        }}
        meta={baseMeta}
      />,
    );
    const actual = {
      status: screen.getByRole('status').textContent,
      previous: screen.getByRole('link', { name: '前のページ' }).getAttribute('href'),
      next: screen.getByRole('link', { name: '次のページ' }).getAttribute('href'),
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  test('1ページだけの場合、ページネーションを表示しないこと', () => {
    // Arrange
    const expected = null;

    // Act
    render(
      <Pagination
        links={{ first: null, last: null, prev: null, next: null }}
        meta={{ ...baseMeta, current_page: 1, last_page: 1 }}
      />,
    );
    const actual = screen.queryByRole('navigation', { name: 'ページネーション' });

    // Assert
    expect(actual).toBe(expected);
  });

  test('先頭ページの場合、前のページを無効状態で表示すること', () => {
    // Arrange
    const expected = 'true';

    // Act
    render(
      <Pagination
        links={{ first: null, last: null, prev: null, next: '/stocks?page=2' }}
        meta={{ ...baseMeta, current_page: 1 }}
      />,
    );
    const actual = screen.getByText('前のページ').getAttribute('aria-disabled');

    // Assert
    expect(actual).toBe(expected);
  });

  test('最終ページの場合、次のページを無効状態で表示すること', () => {
    // Arrange
    const expected = 'true';

    // Act
    render(
      <Pagination
        links={{ first: null, last: null, prev: '/stocks?page=3', next: null }}
        meta={{ ...baseMeta, current_page: 4 }}
      />,
    );
    const actual = screen.getByText('次のページ').getAttribute('aria-disabled');

    // Assert
    expect(actual).toBe(expected);
  });
});
