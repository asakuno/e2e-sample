import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vite-plus/test';
import type { NewsArticle } from '@/types/news';
import { NewsArticleList } from '../NewsArticleList';

function buildArticle(overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    id: 1,
    title: 'Appleの新製品発表',
    summary: 'Appleが新製品と今後の販売計画を発表しました。',
    url: 'https://example.com/news/apple-product',
    source: 'Example News',
    provider: 'example-provider',
    language: 'ja',
    published_at: '2026-07-10T09:30:00',
    stocks: [
      {
        id: 1,
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'NASDAQ',
        relevance_score: 95,
        matched_by: 'symbol',
      },
      {
        id: 2,
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        market: 'NASDAQ',
        relevance_score: 62,
        matched_by: 'content',
      },
    ],
    analyses: [
      {
        id: 101,
        stock: {
          id: 1,
          symbol: 'AAPL',
          name: 'Apple Inc.',
          market: 'NASDAQ',
        },
        summary: '新製品の需要が堅調で、売上への追い風です。',
        sentiment: 1,
        sentiment_label: 'ポジティブ',
        impact_score: 3,
        confidence_score: 74,
        analyzed_at: '2026-07-10T10:00:00',
      },
      {
        id: 102,
        stock: {
          id: 2,
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          market: 'NASDAQ',
        },
        summary: '競争激化により大きな下振れリスクがあります。',
        sentiment: -1,
        sentiment_label: 'ネガティブ',
        impact_score: -9,
        confidence_score: 88,
        analyzed_at: '2026-07-10T10:05:00',
      },
    ],
    ...overrides,
  };
}

function getDetailsElement(toggle: HTMLElement): HTMLElement {
  const detailsId = toggle.getAttribute('aria-controls');

  expect(detailsId).not.toBeNull();

  const details = document.getElementById(detailsId ?? '');

  expect(details).not.toBeNull();

  return details as HTMLElement;
}

function expectSingleVisibleText(text: string): HTMLElement {
  const visibleElements = screen
    .getAllByText(text)
    .filter((element) => element.closest('[hidden]') === null);
  const visibleElement = visibleElements[0];

  expect(visibleElements).toHaveLength(1);
  expect(visibleElement).toBeDefined();

  if (visibleElement === undefined) {
    throw new Error(`表示中のテキストが見つかりません: ${text}`);
  }

  expect(visibleElement).toBeVisible();

  return visibleElement;
}

describe('NewsArticleList', () => {
  it('通常表示では記事詳細を閉じ、詳細領域と元記事リンクを操作対象から外すこと', () => {
    // Arrange
    const article = buildArticle();

    // Act
    render(<NewsArticleList articles={[article]} />);
    const toggle = screen.getByRole('button', {
      name: `記事と分析の詳細：${article.title}`,
    });
    const details = getDetailsElement(toggle);

    // Assert
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(details).toHaveAttribute('hidden');
    expect(details).not.toBeVisible();
    expect(screen.queryByRole('link', { name: /元記事を読む/ })).not.toBeInTheDocument();
  });

  it('絶対値が最大のAI分析を折りたたみ時の代表として表示すること', () => {
    // Arrange & Act
    render(<NewsArticleList articles={[buildArticle()]} />);
    const visiblePrimary = screen.getByText('AI要約: 競争激化により大きな下振れリスクがあります。');
    const hiddenPrimary = screen.getByText('競争激化により大きな下振れリスクがあります。');
    const positiveSummary = screen.getByText('新製品の需要が堅調で、売上への追い風です。');

    // Assert
    expect(visiblePrimary).toBeVisible();
    expect(hiddenPrimary).not.toBeVisible();
    expect(positiveSummary).not.toBeVisible();
  });

  it('折りたたみ時に代表分析の選定基準を表示すること', () => {
    // Arrange & Act
    render(<NewsArticleList articles={[buildArticle()]} />);
    const actual = screen.getByText('影響度が最も大きい分析');

    // Assert
    expect(actual).toBeVisible();
  });

  it('折りたたみ時は関連銘柄を2件まで表示し、残数と他の分析件数を示すこと', () => {
    // Arrange
    const article = buildArticle();
    const stocks = [
      ...article.stocks,
      {
        id: 3,
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        market: 'NASDAQ',
        relevance_score: 55,
        matched_by: 'content',
      },
    ];

    // Act
    render(<NewsArticleList articles={[{ ...article, stocks }]} />);
    const compactStocks = screen.getByRole('list', { name: '関連銘柄' });

    // Assert
    expect(within(compactStocks).getByText('AAPL')).toBeVisible();
    expect(within(compactStocks).getByText('MSFT')).toBeVisible();
    expect(within(compactStocks).queryByText('GOOGL')).not.toBeInTheDocument();
    expect(within(compactStocks).getByText('他1銘柄')).toBeVisible();
    expect(screen.getByText('他1件の分析')).toBeVisible();
  });

  it('詳細ボタンを押すたびに記事詳細を開閉すること', async () => {
    // Arrange
    const user = userEvent.setup();
    const article = buildArticle();
    render(<NewsArticleList articles={[article]} />);
    const toggle = screen.getByRole('button', {
      name: `記事と分析の詳細：${article.title}`,
    });
    const details = getDetailsElement(toggle);

    // Act
    await user.click(toggle);

    // Assert
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(details).not.toHaveAttribute('hidden');
    expect(details).toBeVisible();
    expect(screen.getByRole('link', { name: /元記事を読む/ })).toBeVisible();

    // Act
    await user.click(toggle);

    // Assert
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(details).toHaveAttribute('hidden');
    expect(details).not.toBeVisible();
    expect(screen.queryByRole('link', { name: /元記事を読む/ })).not.toBeInTheDocument();
  });

  it('展開時に記事要約、全関連銘柄、全AI分析、元記事リンクを表示すること', () => {
    // Arrange
    const article = buildArticle();

    // Act
    render(<NewsArticleList articles={[article]} initialExpandedArticleId={article.id} />);
    const toggle = screen.getByRole('button', {
      name: `記事と分析の詳細：${article.title}`,
    });
    const details = getDetailsElement(toggle);
    const detailQueries = within(details);
    const sourceLink = detailQueries.getByRole('link', { name: /元記事を読む/ });

    // Assert
    expect(details).toBeVisible();
    expect(detailQueries.getByText(article.summary ?? '')).toBeVisible();
    expect(detailQueries.getAllByText('Apple Inc.')).toHaveLength(2);
    expect(detailQueries.getAllByText('Microsoft Corporation')).toHaveLength(2);
    detailQueries.getAllByText(/^(Apple Inc.|Microsoft Corporation)$/).forEach((stockName) => {
      expect(stockName).toBeVisible();
    });
    expect(detailQueries.getByText('新製品の需要が堅調で、売上への追い風です。')).toBeVisible();
    expect(detailQueries.getByText('競争激化により大きな下振れリスクがあります。')).toBeVisible();
    expect(detailQueries.getByText('+3/10')).toBeVisible();
    expect(detailQueries.getByText('−9/10')).toBeVisible();
    expect(sourceLink).toHaveAttribute('href', article.url);
    expect(sourceLink).toHaveAttribute('target', '_blank');
    expect(sourceLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('別の記事を開くと、それまで開いていた記事を閉じること', async () => {
    // Arrange
    const user = userEvent.setup();
    const firstArticle = buildArticle();
    const secondArticle = buildArticle({ id: 2, title: 'Microsoftの決算発表' });
    render(<NewsArticleList articles={[firstArticle, secondArticle]} />);
    const firstToggle = screen.getByRole('button', {
      name: `記事と分析の詳細：${firstArticle.title}`,
    });
    const secondToggle = screen.getByRole('button', {
      name: `記事と分析の詳細：${secondArticle.title}`,
    });

    // Act
    await user.click(firstToggle);
    await user.click(secondToggle);

    // Assert
    expect(firstToggle).toHaveAttribute('aria-expanded', 'false');
    expect(getDetailsElement(firstToggle)).not.toBeVisible();
    expect(secondToggle).toHaveAttribute('aria-expanded', 'true');
    expect(getDetailsElement(secondToggle)).toBeVisible();
  });

  it('AI分析がなくても未実施状態を表示し、記事詳細と元記事を開けること', async () => {
    // Arrange
    const user = userEvent.setup();
    const article = buildArticle({ analyses: [] });
    render(<NewsArticleList articles={[article]} />);
    const toggle = screen.getByRole('button', {
      name: `記事と分析の詳細：${article.title}`,
    });

    // Act & Assert
    expectSingleVisibleText('AI分析は未実施です');

    // Act
    await user.click(toggle);

    // Assert
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expectSingleVisibleText('AI分析は未実施です');
    expect(screen.getByRole('link', { name: /元記事を読む/ })).toHaveAttribute('href', article.url);
  });

  it('記事がない場合は空状態を表示すること', () => {
    // Arrange & Act
    render(<NewsArticleList articles={[]} />);

    // Assert
    expect(screen.getByText('該当するニュースがありません')).toBeVisible();
    expect(screen.getByText('条件を変更して再度検索してください。')).toBeVisible();
  });

  it('初期展開IDが記事に一致する場合だけ、その記事を開いて表示すること', () => {
    // Arrange
    const article = buildArticle();

    // Act
    const { unmount } = render(
      <NewsArticleList articles={[article]} initialExpandedArticleId={article.id} />,
    );
    const matchingToggle = screen.getByRole('button', {
      name: `記事と分析の詳細：${article.title}`,
    });

    // Assert
    expect(matchingToggle).toHaveAttribute('aria-expanded', 'true');
    expect(getDetailsElement(matchingToggle)).toBeVisible();

    // Arrange & Act
    unmount();
    render(<NewsArticleList articles={[article]} initialExpandedArticleId={999} />);
    const missingToggle = screen.getByRole('button', {
      name: `記事と分析の詳細：${article.title}`,
    });

    // Assert
    expect(missingToggle).toHaveAttribute('aria-expanded', 'false');
    expect(getDetailsElement(missingToggle)).not.toBeVisible();
  });
});
