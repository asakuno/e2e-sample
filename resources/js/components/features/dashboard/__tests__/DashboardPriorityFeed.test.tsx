import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { DashboardPriorityFeedItem } from '../priority-feed-presentation';
import { DashboardPriorityFeed } from '../DashboardPriorityFeed';

vi.mock('@inertiajs/react', () => ({
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  router: { visit: vi.fn() },
}));

const importantNewsItem: DashboardPriorityFeedItem = {
  id: 'important-news-11',
  kind: 'importantNews',
  label: '重要ニュース',
  variant: 'negative',
  title: '半導体セクターに新しい重要材料',
  description: 'ウォッチ銘柄への影響度が高いニュースです。',
  meta: 'NVDA・2時間前',
  href: '/news?stock=11',
};

const topStockItem: DashboardPriorityFeedItem = {
  id: 'top-stock-22',
  kind: 'topStock',
  label: '注目銘柄',
  variant: 'positive',
  title: 'AAPLの総合スコアが上昇',
  description: 'ポジティブ材料が増加しています。',
  href: '/stocks/22',
};

const unanalyzedNewsItem: DashboardPriorityFeedItem = {
  id: 'unanalyzed-news',
  kind: 'unanalyzedNews',
  label: '分析待ち',
  variant: 'warning',
  title: '3件のニュースが分析待ちです',
  description: 'ウォッチ銘柄に関するニュースを確認してください',
  href: '/news?analysis_status=unanalyzed',
};

const nonNavigableItem: DashboardPriorityFeedItem = {
  id: 'important-news-without-article',
  kind: 'importantNews',
  label: '重要ニュース',
  variant: 'negative',
  title: '半導体セクターに新しい重要材料',
  description: 'ウォッチ銘柄への影響度が高いニュースです。',
  meta: 'NVDA・2時間前',
};

const items = [importantNewsItem, topStockItem];

describe('DashboardPriorityFeed', () => {
  it('確認候補を受け取った順序で表示すること', () => {
    // Arrange
    render(<DashboardPriorityFeed items={items} />);

    // Act
    const renderedItems = within(screen.getByRole('list')).getAllByRole('listitem');

    // Assert
    expect(screen.getByRole('heading', { name: '現在の確認候補' })).toBeVisible();
    expect(
      screen.getByText('重要ニュース、シグナル、分析待ちから代表項目を合計最大3件表示しています。'),
    ).toBeVisible();
    expect(renderedItems).toHaveLength(2);
    expect(screen.getByRole('list').tagName).toBe('UL');
    expect(within(screen.getByRole('list')).queryByText(/^[12]$/)).not.toBeInTheDocument();
    expect(renderedItems.map((item) => item.textContent)).toEqual([
      expect.stringContaining('半導体セクターに新しい重要材料'),
      expect.stringContaining('AAPLの総合スコアが上昇'),
    ]);
  });

  it('各項目の文字ラベルと遷移先を表示すること', () => {
    // Arrange
    render(<DashboardPriorityFeed items={items} />);

    // Act
    const importantNewsLink = screen.getByRole('link', {
      name: /重要ニュース.*半導体セクターに新しい重要材料/,
    });
    const topStockLink = screen.getByRole('link', {
      name: /注目銘柄.*AAPLの総合スコアが上昇/,
    });

    // Assert
    expect(screen.getByText('重要ニュース')).toBeVisible();
    expect(screen.getByText('注目銘柄')).toBeVisible();
    expect(importantNewsLink).toHaveAttribute('href', '/news?stock=11');
    expect(topStockLink).toHaveAttribute('href', '/stocks/22');
    expect(screen.getByRole('link', { name: 'ニュース一覧' })).toHaveAttribute('href', '/news');
    expect(screen.getByRole('link', { name: '銘柄一覧' })).toHaveAttribute('href', '/stocks');
  });

  it('補足情報がない項目もタイトルと説明を含むリンクとして表示すること', () => {
    // Arrange
    render(<DashboardPriorityFeed items={[topStockItem]} />);

    // Act
    const link = screen.getByRole('link', {
      name: /注目銘柄.*AAPLの総合スコアが上昇.*ポジティブ材料が増加しています。/,
    });

    // Assert
    expect(link).toHaveAttribute('href', '/stocks/22');
    expect(within(link).queryByText('NVDA・2時間前')).not.toBeInTheDocument();
  });

  it('分析待ち候補は未分析ニュース一覧へのリンクとして表示すること', () => {
    // Arrange
    render(<DashboardPriorityFeed items={[unanalyzedNewsItem]} />);

    // Act
    const link = screen.getByRole('link', { name: /3件のニュースが分析待ちです/ });

    // Assert
    expect(link).toHaveAttribute('href', '/news?analysis_status=unanalyzed');
  });

  it('遷移先がない候補はリンクにせず表示すること', () => {
    // Arrange
    render(<DashboardPriorityFeed items={[nonNavigableItem]} />);

    // Act
    const title = screen.getByText('半導体セクターに新しい重要材料');

    // Assert
    expect(title).toBeVisible();
    expect(
      screen.queryByRole('link', { name: /半導体セクターに新しい重要材料/ }),
    ).not.toBeInTheDocument();
  });

  it('項目が空の場合は正常な空状態と銘柄一覧への導線を表示すること', () => {
    // Arrange
    render(<DashboardPriorityFeed items={[]} />);

    // Act
    const stocksLink = screen.getByRole('link', { name: '銘柄を探す' });

    // Assert
    expect(screen.getByText('現時点で確認する項目はありません')).toBeVisible();
    expect(stocksLink).toHaveAttribute('href', '/stocks');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
