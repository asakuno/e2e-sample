import { describe, expect, it } from 'vite-plus/test';
import { withAuthenticatedLayout } from '@/layouts/page-layouts';
import AnalysisCreate from '../Analysis/Create';
import AnalysisImportPreview from '../Analysis/ImportPreview';
import AnalysisIndex from '../Analysis/Index';
import AnalysisShow from '../Analysis/Show';
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
    ['AnalysisIndex', AnalysisIndex],
    ['AnalysisCreate', AnalysisCreate],
    ['AnalysisShow', AnalysisShow],
    ['AnalysisImportPreview', AnalysisImportPreview],
  ])('%s に共通のAuthenticatedLayoutを設定すること', (_name, Page) => {
    expect(Page.layout).toBe(withAuthenticatedLayout);
  });
});
