import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { StockMarketOption, StocksPageProps } from '@/types/stocks';

const routerGetMock = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
  Head: ({ title }: { title: string }) => <title>{title}</title>,
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  router: { get: routerGetMock, post: vi.fn() },
  usePage: vi.fn(() => ({
    url: '/stocks',
    props: {
      auth: { user: { id: 1, name: 'テストユーザー' } },
    },
  })),
}));

import News from '../News';
import StockDetail from '../StockDetail';
import Stocks from '../Stocks';
import Watchlist from '../Watchlist';

const marketOptions: StockMarketOption[] = [
  { value: 'jp', label: '日本株' },
  { value: 'us', label: '米国株' },
];

const stocksProps: StocksPageProps = {
  app: { name: 'Web App', env: 'testing', locale: 'ja' },
  auth: { user: { id: 1, name: 'テストユーザー', email: 'test@example.com' } },
  flash: {},
  errors: {},
  filters: { q: '', market: '' },
  marketOptions,
  stocks: [
    {
      id: 1,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'us',
      exchange: 'NASDAQ',
      country: 'US',
      currency: 'USD',
      sector: 'Technology',
      industry: 'Consumer Electronics',
    },
    {
      id: 2,
      symbol: '7203',
      name: 'Toyota Motor Corporation',
      market: 'jp',
      exchange: 'TSE',
      country: 'JP',
      currency: 'JPY',
      sector: 'Consumer Discretionary',
      industry: 'Auto Manufacturers',
    },
  ],
};

describe('Stock app navigation pages', () => {
  it('Stocks ページに銘柄一覧が表示されること', () => {
    render(<Stocks {...stocksProps} />);
    expect(document.querySelector('title')).toHaveTextContent('Stocks');
    expect(screen.getByRole('heading', { name: '銘柄検索' })).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Toyota Motor Corporation')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /開く/ })).toHaveLength(2);
  });

  it('Stocks ページの検索フォームがクエリパラメータ付きで再取得すること', async () => {
    const user = userEvent.setup();
    routerGetMock.mockClear();

    render(<Stocks {...stocksProps} />);
    await user.type(screen.getByLabelText('銘柄コード・企業名'), 'Apple');
    await user.selectOptions(screen.getByLabelText('市場'), 'us');
    await user.click(screen.getByRole('button', { name: '検索' }));

    expect(routerGetMock).toHaveBeenCalledWith(
      '/stocks',
      { q: 'Apple', market: 'us' },
      expect.objectContaining({
        only: ['stocks', 'filters'],
        preserveState: true,
        replace: true,
      }),
    );
  });

  it('StockDetail ページの仮導線先が表示されること', () => {
    render(
      <StockDetail
        {...stocksProps}
        stock={{
          id: 1,
          symbol: 'AAPL',
          name: 'Apple Inc.',
          market: 'us',
          exchange: 'NASDAQ',
          country: 'US',
          currency: 'USD',
          sector: 'Technology',
          industry: 'Consumer Electronics',
        }}
      />,
    );
    expect(document.querySelector('title')).toHaveTextContent('AAPL - Stocks');
    expect(screen.getByRole('heading', { name: 'AAPL' })).toBeInTheDocument();
    expect(screen.getByText('価格・分析')).toBeInTheDocument();
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
