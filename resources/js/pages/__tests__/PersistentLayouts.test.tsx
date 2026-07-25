import { describe, expect, it } from 'vite-plus/test';
import { withAuthenticatedLayout } from '@/layouts/page-layouts';
import Dashboard from '../Dashboard';
import News from '../News';
import StockDetail from '../StockDetail';
import Stocks from '../Stocks';
import Watchlist from '../Watchlist';

describe('認証後ページのPersistent Layout', () => {
  it.each([
    ['Dashboard', Dashboard],
    ['Stocks', Stocks],
    ['StockDetail', StockDetail],
    ['Watchlist', Watchlist],
    ['News', News],
  ])('%s に共通のAuthenticatedLayoutを設定すること', (_name, Page) => {
    expect(Page.layout).toBe(withAuthenticatedLayout);
  });
});
