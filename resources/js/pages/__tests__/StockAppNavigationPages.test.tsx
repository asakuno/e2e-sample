import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';

vi.mock('@inertiajs/react', () => ({
  Head: ({ title }: { title: string }) => <title>{title}</title>,
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  router: { post: vi.fn() },
  usePage: vi.fn(() => ({
    url: '/stocks',
    props: {
      auth: { user: { id: 1, name: 'テストユーザー' } },
    },
  })),
}));

import News from '../News';
import Stocks from '../Stocks';
import Watchlist from '../Watchlist';

describe('Stock app navigation pages', () => {
  it('Stocks ページの仮コンテンツが表示されること', () => {
    render(<Stocks />);
    expect(document.querySelector('title')).toHaveTextContent('Stocks');
    expect(screen.getByRole('heading', { name: 'Stocks' })).toBeInTheDocument();
    expect(screen.getByText('銘柄検索とフィルタ')).toBeInTheDocument();
  });

  it('Watchlist ページの仮コンテンツが表示されること', () => {
    render(<Watchlist />);
    expect(document.querySelector('title')).toHaveTextContent('Watchlist');
    expect(screen.getByRole('heading', { name: 'Watchlist' })).toBeInTheDocument();
    expect(screen.getByText('監視銘柄一覧')).toBeInTheDocument();
  });

  it('News ページの仮コンテンツが表示されること', () => {
    render(<News />);
    expect(document.querySelector('title')).toHaveTextContent('News');
    expect(screen.getByRole('heading', { name: 'News' })).toBeInTheDocument();
    expect(screen.getByText('市場ニュース一覧')).toBeInTheDocument();
  });
});
