import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import type {
  StockDetail as StockDetailType,
  StockListItem,
  StockMarketOption,
  StocksPageProps,
} from '@/types/stocks';
import type { NewsPageProps } from '@/types/news';
import type { WatchlistPageProps } from '@/types/watchlist';

const routerGetMock = vi.hoisted(() => vi.fn());
const routerPostMock = vi.hoisted(() => vi.fn());
const routerDeleteMock = vi.hoisted(() => vi.fn());
const routerVisitMock = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
  Head: ({ title }: { title: string }) => <title>{title}</title>,
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  router: {
    get: routerGetMock,
    post: routerPostMock,
    delete: routerDeleteMock,
    visit: routerVisitMock,
  },
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

const appleStock: StockListItem = {
  id: 1,
  symbol: 'AAPL',
  name: 'Apple Inc.',
  market: 'us',
  exchange: 'NASDAQ',
  country: 'US',
  currency: 'USD',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  is_in_watchlist: false,
};

const toyotaStock: StockListItem = {
  id: 2,
  symbol: '7203',
  name: 'Toyota Motor Corporation',
  market: 'jp',
  exchange: 'TSE',
  country: 'JP',
  currency: 'JPY',
  sector: 'Consumer Discretionary',
  industry: 'Auto Manufacturers',
  is_in_watchlist: false,
};

const stocksProps: StocksPageProps = {
  app: { name: 'Web App', env: 'testing', locale: 'ja' },
  auth: { user: { id: 1, name: 'テストユーザー', email: 'test@example.com' } },
  flash: {},
  errors: {},
  filters: { q: '', market: '' },
  marketOptions,
  stocks: [appleStock, toyotaStock],
  watchlistedStockIds: [],
};

const watchlistProps: WatchlistPageProps = {
  app: stocksProps.app,
  auth: stocksProps.auth,
  flash: {},
  errors: {},
  watchlists: [
    {
      id: 1,
      memo: '決算前に確認',
      priority: 3,
      is_active: true,
      stock: appleStock,
    },
  ],
};

const newsProps: NewsPageProps = {
  app: stocksProps.app,
  auth: stocksProps.auth,
  flash: {},
  errors: {},
  filters: { stock_id: '', sentiment: '', from: '', to: '' },
  stockOptions: [{ value: 1, label: 'AAPL Apple Inc.' }],
  sentimentOptions: [
    { value: 1, label: 'ポジティブ' },
    { value: 0, label: '中立' },
    { value: -1, label: 'ネガティブ' },
  ],
  news: [
    {
      id: 1,
      title: 'Apple announces new product',
      summary: 'Apple product summary',
      url: 'https://example.com/apple-news',
      source: 'Reuters',
      provider: 'rss',
      language: 'en',
      published_at: '2026-06-15 10:00:00',
      stocks: [
        {
          id: 1,
          symbol: 'AAPL',
          name: 'Apple Inc.',
          market: 'us',
          relevance_score: 95,
          matched_by: 'symbol',
        },
      ],
      analyses: [
        {
          id: 1,
          stock: appleStock,
          summary: '売上成長にポジティブ',
          sentiment: 1,
          sentiment_label: 'ポジティブ',
          impact_score: 8,
          confidence_score: 90,
          analyzed_at: '2026-06-15 11:00:00',
        },
      ],
    },
  ],
};

const stockDetail: StockDetailType = {
  id: 1,
  symbol: 'AAPL',
  name: 'Apple Inc.',
  market: 'us',
  exchange: 'NASDAQ',
  country: 'US',
  currency: 'USD',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  description: 'Consumer technology company.',
  latest_price: {
    price_date: '2026-05-30',
    open: 180,
    high: 185,
    low: 178,
    close: 182.5,
    adjusted_close: 182.5,
    volume: 30000,
  },
  price_history: [
    {
      price_date: '2026-05-01',
      open: 170,
      high: 174,
      low: 168,
      close: 172,
      adjusted_close: 172,
      volume: 20000,
    },
    {
      price_date: '2026-05-30',
      open: 180,
      high: 185,
      low: 178,
      close: 182.5,
      adjusted_close: 182.5,
      volume: 30000,
    },
  ],
  related_news: [
    {
      id: 1,
      title: 'Apple supplier raises guidance',
      summary: 'Supplier demand indicates stronger iPhone sales.',
      url: 'https://example.com/apple-supplier',
      source: 'Reuters',
      provider: 'rss',
      language: 'en',
      published_at: '2026-06-15 10:00:00',
      stocks: [
        {
          id: 1,
          symbol: 'AAPL',
          name: 'Apple Inc.',
          market: 'us',
          relevance_score: 91,
          matched_by: 'symbol',
        },
      ],
      analyses: [],
    },
  ],
  analyses: [
    {
      id: 1,
      stock: appleStock,
      summary: '需要回復にポジティブ',
      sentiment: 1,
      sentiment_label: 'ポジティブ',
      impact_score: 8,
      confidence_score: 92,
      analyzed_at: '2026-06-15 11:00:00',
    },
  ],
  signals: [
    {
      id: 1,
      signal_date: '2026-06-15',
      news_score: 6.5,
      disclosure_score: 1,
      macro_score: -0.5,
      total_score: 7,
      positive_count: 3,
      negative_count: 1,
      neutral_count: 2,
      reason: 'ニュースと分析結果が上向きです。',
      generated_at: '2026-06-15 12:00:00',
    },
  ],
  selected_period: '1M',
  period_options: [
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '6M', label: '6M' },
    { value: '1Y', label: '1Y' },
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
    expect(screen.getAllByRole('button', { name: /ウォッチリストに追加/ })).toHaveLength(2);
  });

  it('Stocks ページでウォッチリスト追加ボタンを押した場合、追加リクエストが送信されること', async () => {
    const user = userEvent.setup();
    routerPostMock.mockClear();

    render(<Stocks {...stocksProps} />);
    await user.click(screen.getByRole('button', { name: 'AAPL をウォッチリストに追加' }));

    expect(routerPostMock).toHaveBeenCalledWith(
      '/watchlist',
      { stock_id: 1, memo: '', priority: 2 },
      expect.objectContaining({ preserveScroll: true }),
    );
  });

  it('Stocks ページで watchlistedStockIds に含まれる銘柄の追加ボタンが無効化されること', async () => {
    const user = userEvent.setup();
    routerPostMock.mockClear();

    render(<Stocks {...stocksProps} watchlistedStockIds={[appleStock.id]} />);
    const actual = screen.getByRole('button', {
      name: 'AAPL はウォッチリストに追加済み',
    });

    expect(actual).toBeDisabled();

    await user.click(actual);
    expect(routerPostMock).not.toHaveBeenCalled();
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

  it('StockDetail ページに価格履歴が表示されること', () => {
    render(<StockDetail {...stocksProps} stock={stockDetail} />);
    expect(document.querySelector('title')).toHaveTextContent('AAPL - Stocks');
    expect(screen.getByRole('heading', { name: 'AAPL' })).toBeInTheDocument();
    expect(screen.getByText('最新価格')).toBeInTheDocument();
    expect(screen.getAllByText('$182.50')).toHaveLength(2);
    expect(screen.getByRole('link', { name: '3M' })).toHaveAttribute('href', '/stocks/1?period=3M');
    expect(screen.getByText('価格履歴一覧')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '関連ニュース' })).toBeInTheDocument();
    expect(screen.getByText('Apple supplier raises guidance')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI分析結果' })).toBeInTheDocument();
    expect(screen.getByText('AI要約: 需要回復にポジティブ')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'シグナル' })).toBeInTheDocument();
    expect(screen.getByText('ニュースと分析結果が上向きです。')).toBeInTheDocument();
  });

  it('StockDetail ページのインサイトデータが空の場合、それぞれの空状態を表示すること', () => {
    // Arrange
    const stock = {
      ...stockDetail,
      related_news: [],
      analyses: [],
      signals: [],
    };
    const expected = [
      '関連ニュースはまだありません',
      'AI分析結果はまだありません',
      'シグナルはまだありません',
    ];

    // Act
    render(<StockDetail {...stocksProps} stock={stock} />);
    const actual = expected.map((message) => screen.getByText(message).textContent);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('Watchlist ページにウォッチリスト銘柄が表示されること', async () => {
    const user = userEvent.setup();
    routerDeleteMock.mockClear();

    render(<Watchlist {...watchlistProps} />);
    expect(document.querySelector('title')).toHaveTextContent('Watchlist');
    expect(screen.getByRole('heading', { name: 'ウォッチリスト' })).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('決算前に確認')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'AAPL をウォッチリストから削除' }));
    expect(routerDeleteMock).toHaveBeenCalledWith(
      '/watchlist/1',
      expect.objectContaining({ preserveScroll: true }),
    );
  });

  it('News ページにニュース一覧とAI分析が表示されること', () => {
    render(<News {...newsProps} />);
    expect(document.querySelector('title')).toHaveTextContent('News');
    expect(screen.getByRole('heading', { name: 'News' })).toBeInTheDocument();
    expect(screen.getByText('Apple announces new product')).toBeInTheDocument();
    expect(screen.getByText('AI要約: 売上成長にポジティブ')).toBeInTheDocument();
    expect(screen.getByText('impact score')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '元記事' })).toHaveAttribute(
      'href',
      'https://example.com/apple-news',
    );
  });

  it('News ページのフィルタフォームがクエリパラメータ付きで再取得すること', async () => {
    const user = userEvent.setup();
    routerGetMock.mockClear();

    render(<News {...newsProps} />);
    await user.selectOptions(screen.getByLabelText('銘柄'), '1');
    await user.selectOptions(screen.getByLabelText('sentiment'), '1');
    await user.type(screen.getByLabelText('期間 From'), '2026-06-01');
    await user.type(screen.getByLabelText('期間 To'), '2026-06-30');
    await user.click(screen.getByRole('button', { name: '検索' }));

    expect(routerGetMock).toHaveBeenCalledWith(
      '/news',
      { stock_id: '1', sentiment: '1', from: '2026-06-01', to: '2026-06-30' },
      expect.objectContaining({
        only: ['news', 'filters'],
        preserveState: true,
        replace: true,
      }),
    );
  });
});
