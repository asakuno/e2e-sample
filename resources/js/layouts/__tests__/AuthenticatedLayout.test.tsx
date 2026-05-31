/**
 * AuthenticatedLayout コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';

vi.mock('@inertiajs/react', () => ({
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  router: {
    post: vi.fn(),
  },
  usePage: vi.fn(() => ({
    url: '/dashboard',
    props: {
      auth: {
        user: { id: 1, name: 'テストユーザー' },
      },
    },
  })),
}));

import { AuthenticatedLayout } from '../AuthenticatedLayout';

describe('AuthenticatedLayout', () => {
  it('children が描画されること', () => {
    render(
      <AuthenticatedLayout>
        <p>テストコンテンツ</p>
      </AuthenticatedLayout>,
    );
    expect(screen.getByText('テストコンテンツ')).toBeInTheDocument();
  });

  it('main 要素が存在すること', () => {
    render(
      <AuthenticatedLayout>
        <p>コンテンツ</p>
      </AuthenticatedLayout>,
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('投資助言ではない旨の注意表示が表示されること', () => {
    render(
      <AuthenticatedLayout>
        <p>コンテンツ</p>
      </AuthenticatedLayout>,
    );
    expect(screen.getAllByText(/投資助言/).length).toBeGreaterThan(0);
  });
});
