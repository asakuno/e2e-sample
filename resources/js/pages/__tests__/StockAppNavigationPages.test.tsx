import { render, screen, within } from '@testing-library/react';
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
  stocks: {
    data: [appleStock, toyotaStock],
    links: {
      first: '/stocks?page=1',
      last: '/stocks?page=1',
      prev: null,
      next: null,
    },
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      path: '/stocks',
      per_page: 25,
      to: 2,
      total: 2,
    },
  },
};

const watchlistProps: WatchlistPageProps = {
  app: stocksProps.app,
  auth: stocksProps.auth,
  flash: {},
  errors: {},
  watchlists: {
    data: [
      {
        id: 1,
        memo: '決算前に確認',
        priority: 3,
        is_active: true,
        stock: appleStock,
      },
    ],
    links: {
      first: '/watchlists?page=1',
      last: '/watchlists?page=1',
      prev: null,
      next: null,
    },
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      path: '/watchlists',
      per_page: 20,
      to: 1,
      total: 1,
    },
  },
};

const newsProps: NewsPageProps = {
  app: stocksProps.app,
  auth: stocksProps.auth,
  flash: {},
  errors: {},
  filters: {
    article_id: '',
    stock_id: '',
    sentiment: '',
    analysis_status: '',
    from: '',
    to: '',
  },
  stockOptions: [{ value: 1, label: 'AAPL Apple Inc.' }],
  sentimentOptions: [
    { value: 1, label: 'ポジティブ' },
    { value: 0, label: '中立' },
    { value: -1, label: 'ネガティブ' },
  ],
  news: {
    data: [
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
            time_horizon: 2,
            time_horizon_label: '中期',
            positive_factors: ['売上成長'],
            negative_factors: ['開発費増加'],
            risk_points: ['需要変動'],
            reason: '新製品需要が既存予測を上回っています。',
            analyzed_at: '2026-06-15 11:00:00',
          },
        ],
      },
    ],
    links: {
      first: '/news?page=1',
      last: '/news?page=1',
      prev: null,
      next: null,
    },
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      path: '/news',
      per_page: 20,
      to: 1,
      total: 1,
    },
  },
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
  watchlist: null,
  latest_price: {
    price_date: '2026-05-30',
    open: 180,
    high: 185,
    low: 178,
    close: 182.5,
    adjusted_close: 182.5,
    effective_close: 182.5,
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
      effective_close: 172,
      volume: 20000,
    },
    {
      price_date: '2026-05-30',
      open: 180,
      high: 185,
      low: 178,
      close: 182.5,
      adjusted_close: 182.5,
      effective_close: 182.5,
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
      time_horizon: 2,
      time_horizon_label: '中期',
      positive_factors: ['需要回復'],
      negative_factors: ['部材価格上昇'],
      risk_points: ['為替変動'],
      reason: '需要指標が改善しています。',
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
  latest_period_analysis: null,
  period_signal: null,
  selected_period: '1M',
  period_options: [
    { value: '1M', label: '1M', available: true },
    { value: '3M', label: '3M', available: true },
    { value: '6M', label: '6M', available: true },
    { value: '1Y', label: '1Y', available: true },
  ],
  price_history_notice: null,
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

  it('Stocks ページに総件数と次ページ導線を表示すること', () => {
    // Arrange
    const stocks = {
      ...stocksProps.stocks,
      links: { ...stocksProps.stocks.links, next: '/stocks?page=2' },
      meta: { ...stocksProps.stocks.meta, last_page: 2, total: 30 },
    };
    const expected = { total: '30', nextHref: '/stocks?page=2' };

    // Act
    render(<Stocks {...stocksProps} stocks={stocks} />);
    const actual = {
      total: screen.getByText(expected.total).textContent,
      nextHref: screen.getByRole('link', { name: '次のページ' }).getAttribute('href'),
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('Stocks ページでウォッチリスト追加ボタンを押した場合、追加リクエストが送信されること', async () => {
    const user = userEvent.setup();
    routerPostMock.mockClear();

    render(<Stocks {...stocksProps} />);
    await user.click(screen.getByRole('button', { name: 'AAPL をウォッチリストに追加' }));

    expect(routerPostMock).toHaveBeenCalledWith(
      '/watchlists',
      { stock_id: 1, memo: '', priority: 2 },
      expect.objectContaining({ preserveScroll: true }),
    );
  });

  it('Stocks ページで登録済み銘柄の追加ボタンが無効化されること', async () => {
    const user = userEvent.setup();
    routerPostMock.mockClear();
    const stocks = {
      ...stocksProps.stocks,
      data: [{ ...appleStock, is_in_watchlist: true }, toyotaStock],
    };

    render(<Stocks {...stocksProps} stocks={stocks} />);
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
    const priceMetric = screen.getByText('基準価格（調整後優先）').closest('div');
    const historyTable = screen.getByRole('columnheader', { name: '調整後終値' }).closest('table');
    const historyRow =
      historyTable === null ? null : within(historyTable).getByText('2026-05-30').closest('tr');

    expect(document.querySelector('title')).toHaveTextContent('AAPL - Stocks');
    expect(screen.getByRole('heading', { name: 'AAPL' })).toBeInTheDocument();
    expect(priceMetric).not.toBeNull();
    expect(within(priceMetric!).getByText('$182.50')).toBeInTheDocument();
    expect(historyRow).not.toBeNull();
    expect(within(historyRow!).getAllByText('$182.50')).toHaveLength(2);
    expect(screen.getByRole('link', { name: '3M' })).toHaveAttribute('href', '/stocks/1?period=3M');
    expect(screen.getByText('価格履歴一覧')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '関連ニュース' })).toBeInTheDocument();
    expect(screen.getByText('Apple supplier raises guidance')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Current期間ニュース分析' })).toBeInTheDocument();
    expect(screen.getByText('この銘柄の期間ニュース分析はまだありません。')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI分析サマリー・材料' })).toBeInTheDocument();
    expect(screen.getByText('需要回復にポジティブ')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'シグナル' })).toBeInTheDocument();
    expect(screen.getByText('ニュースと分析結果が上向きです。')).toBeInTheDocument();
  });

  it('StockDetail ページで履歴が不足する期間を無効化して注意を表示すること', () => {
    // Arrange
    const notice = '指定期間の価格履歴が不足しているため、1Mを表示しています。';
    const stock = {
      ...stockDetail,
      period_options: stockDetail.period_options.map((option) => ({
        ...option,
        available: option.value === '1M',
      })),
      price_history_notice: notice,
    };

    // Act
    render(<StockDetail {...stocksProps} stock={stock} />);
    const unavailablePeriod = screen.getByRole('button', { name: '1Y（価格履歴不足）' });

    // Assert
    expect(unavailablePeriod).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(notice);
  });

  it('StockDetail ページで1か月未満の履歴だけの場合も選択中期間を無効状態で示すこと', () => {
    // Arrange
    const notice = '価格履歴が1か月分に満たないため、取得済みの範囲のみ表示しています。';
    const stock = {
      ...stockDetail,
      period_options: stockDetail.period_options.map((option) => ({
        ...option,
        available: false,
      })),
      price_history_notice: notice,
    };

    // Act
    render(<StockDetail {...stocksProps} stock={stock} />);
    const selectedPeriod = screen.getByRole('button', { name: '1M（価格履歴不足）' });

    // Assert
    expect(selectedPeriod).toBeDisabled();
    expect(selectedPeriod).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('status')).toHaveTextContent(notice);
  });

  it('StockDetail ページで未登録銘柄をウォッチリストに追加できること', async () => {
    // Arrange
    const user = userEvent.setup();
    routerPostMock.mockClear();
    render(<StockDetail {...stocksProps} stock={stockDetail} />);

    // Act
    await user.click(screen.getByRole('button', { name: 'AAPL をウォッチリストに追加' }));

    // Assert
    expect(routerPostMock).toHaveBeenCalledWith(
      '/watchlists',
      { stock_id: 1, memo: '', priority: 2 },
      expect.objectContaining({ preserveScroll: true }),
    );
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
      '/watchlists/1',
      expect.objectContaining({ preserveScroll: true }),
    );
  });

  it('News ページにニュース一覧とAI分析が表示されること', () => {
    render(<News {...newsProps} />);

    const detailsButton = screen.getByRole('button', {
      name: '記事と分析の詳細：Apple announces new product',
    });

    expect(document.querySelector('title')).toHaveTextContent('News');
    expect(screen.getByRole('heading', { name: 'News' })).toBeInTheDocument();
    expect(screen.getByText('Apple announces new product')).toBeInTheDocument();
    expect(screen.getByText('AI要約: 売上成長にポジティブ')).toBeVisible();
    expect(detailsButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /元記事を読む/ })).not.toBeInTheDocument();
  });

  it('News ページに該当総数と次ページ導線を表示すること', () => {
    // Arrange
    const news = {
      ...newsProps.news,
      links: { ...newsProps.news.links, next: '/news?page=2' },
      meta: { ...newsProps.news.meta, last_page: 2, total: 26 },
    };
    const expected = { total: '26', nextHref: '/news?page=2' };

    // Act
    render(<News {...newsProps} news={news} />);
    const actual = {
      total: screen.getByText(expected.total).textContent,
      nextHref: screen.getByRole('link', { name: '次のページ' }).getAttribute('href'),
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('News ページのフィルタフォームがクエリパラメータ付きで再取得すること', async () => {
    const user = userEvent.setup();
    routerGetMock.mockClear();

    render(<News {...newsProps} />);
    await user.selectOptions(screen.getByLabelText('銘柄'), '1');
    await user.selectOptions(screen.getByLabelText('sentiment'), '1');
    await user.selectOptions(screen.getByLabelText('分析状態'), 'unanalyzed');
    expect(screen.getByLabelText('sentiment')).toBeDisabled();
    await user.type(screen.getByLabelText('期間 From'), '2026-06-01');
    await user.type(screen.getByLabelText('期間 To'), '2026-06-30');
    await user.click(screen.getByRole('button', { name: '検索' }));

    expect(routerGetMock).toHaveBeenCalledWith(
      '/news',
      {
        stock_id: '1',
        analysis_status: 'unanalyzed',
        from: '2026-06-01',
        to: '2026-06-30',
      },
      expect.objectContaining({
        only: ['news', 'filters'],
        preserveState: true,
        replace: true,
      }),
    );
  });

  it('News ページでクリアした場合、検索ボタンを検索中表示にしないこと', async () => {
    // Arrange
    const user = userEvent.setup();
    routerGetMock.mockClear();
    render(<News {...newsProps} />);
    const expected = {
      searchLabel: '検索',
      resetLabel: 'クリア中...',
    };

    // Act
    await user.click(screen.getByRole('button', { name: 'クリア' }));
    const actual = {
      searchLabel: screen.getByRole('button', { name: expected.searchLabel }).textContent?.trim(),
      resetLabel: screen.getByRole('button', { name: expected.resetLabel }).textContent?.trim(),
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('News ページでダッシュボードから選択した記事を検索フォームより先に表示すること', () => {
    render(<News {...newsProps} filters={{ ...newsProps.filters, article_id: '1' }} />);

    const selectedStatus = screen.getByRole('heading', {
      name: 'ダッシュボードから選択した記事を表示中',
    });
    const articleHeading = screen.getByRole('heading', {
      name: 'Apple announces new product',
    });
    const otherNewsSearchHeading = screen.getByRole('heading', { name: '他のニュースを探す' });
    const detailsButton = screen.getByRole('button', {
      name: '記事と分析の詳細：Apple announces new product',
    });

    expect(selectedStatus).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '一覧に戻す' })).toHaveAttribute('href', '/news');
    expect(detailsButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Apple product summary')).toBeVisible();
    expect(screen.getByRole('link', { name: /元記事を読む/ })).toHaveAttribute(
      'href',
      'https://example.com/apple-news',
    );
    expect(
      articleHeading.compareDocumentPosition(otherNewsSearchHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('News ページで別の記事が選択された場合、新しい記事だけを初期展開すること', () => {
    // Arrange
    const firstArticle = newsProps.news.data[0];

    if (firstArticle === undefined) {
      throw new Error('Newsページのテスト記事がありません');
    }

    const secondArticle = {
      ...firstArticle,
      id: 2,
      title: 'Microsoft announces cloud expansion',
      url: 'https://example.com/microsoft-news',
    };
    const { rerender } = render(
      <News {...newsProps} filters={{ ...newsProps.filters, article_id: '1' }} />,
    );

    // Act
    rerender(
      <News
        {...newsProps}
        news={{ ...newsProps.news, data: [secondArticle] }}
        filters={{ ...newsProps.filters, article_id: '2' }}
      />,
    );

    // Assert
    expect(
      screen.queryByRole('button', {
        name: '記事と分析の詳細：Apple announces new product',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: '記事と分析の詳細：Microsoft announces cloud expansion',
      }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('News ページで選択中の記事を引き継がずに他のニュースを検索すること', async () => {
    const user = userEvent.setup();
    routerGetMock.mockClear();

    render(<News {...newsProps} filters={{ ...newsProps.filters, article_id: '1' }} />);
    await user.click(screen.getByRole('button', { name: '検索' }));

    expect(routerGetMock).toHaveBeenCalledWith(
      '/news',
      {},
      expect.objectContaining({
        only: ['news', 'filters'],
        preserveState: true,
        replace: true,
      }),
    );
  });
});
