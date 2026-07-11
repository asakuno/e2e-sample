import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { NewsFilterForm } from '../NewsFilterForm';

describe('NewsFilterForm', () => {
  it('検索処理中の場合、処理中表示になり操作ボタンが無効化されること', () => {
    // Arrange
    const expected = {
      searchLabel: '検索中...',
      searchDisabled: true,
      searchBusy: 'true',
      resetLabel: 'クリア',
      resetDisabled: true,
      resetBusy: null,
      stockDisabled: true,
      sentimentDisabled: true,
      analysisStatusDisabled: true,
      fromDisabled: true,
      toDisabled: true,
    };

    // Act
    render(
      <NewsFilterForm
        filters={{
          article_id: '',
          stock_id: '',
          sentiment: '',
          analysis_status: '',
          from: '',
          to: '',
        }}
        stockOptions={[]}
        sentimentOptions={[]}
        searchProcessing
        onFiltersChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    const searchButton = screen.getByRole('button', { name: expected.searchLabel });
    const resetButton = screen.getByRole('button', { name: 'クリア' });
    const unanalyzedOption = screen.getByRole('option', {
      name: '未分析（ウォッチ銘柄）',
    });
    const actual = {
      searchLabel: searchButton.textContent?.trim(),
      searchDisabled: searchButton.hasAttribute('disabled'),
      searchBusy: searchButton.getAttribute('aria-busy'),
      resetLabel: resetButton.textContent?.trim(),
      resetDisabled: resetButton.hasAttribute('disabled'),
      resetBusy: resetButton.getAttribute('aria-busy'),
      stockDisabled: screen.getByLabelText('銘柄').hasAttribute('disabled'),
      sentimentDisabled: screen.getByLabelText('sentiment').hasAttribute('disabled'),
      analysisStatusDisabled: screen.getByLabelText('分析状態').hasAttribute('disabled'),
      fromDisabled: screen.getByLabelText('期間 From').hasAttribute('disabled'),
      toDisabled: screen.getByLabelText('期間 To').hasAttribute('disabled'),
    };

    // Assert
    expect(actual).toEqual(expected);
    expect(unanalyzedOption).toHaveValue('unanalyzed');
  });

  it('クリア処理中の場合、検索文言を維持してクリア側だけ処理中表示にすること', () => {
    // Arrange
    const expected = {
      searchLabel: '検索',
      searchDisabled: true,
      searchBusy: null,
      resetLabel: 'クリア中...',
      resetDisabled: true,
      resetBusy: 'true',
    };

    // Act
    render(
      <NewsFilterForm
        filters={{
          article_id: '',
          stock_id: '',
          sentiment: '',
          analysis_status: '',
          from: '',
          to: '',
        }}
        stockOptions={[]}
        sentimentOptions={[]}
        resetProcessing
        onFiltersChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    const searchButton = screen.getByRole('button', { name: expected.searchLabel });
    const resetButton = screen.getByRole('button', { name: expected.resetLabel });
    const actual = {
      searchLabel: searchButton.textContent?.trim(),
      searchDisabled: searchButton.hasAttribute('disabled'),
      searchBusy: searchButton.getAttribute('aria-busy'),
      resetLabel: resetButton.textContent?.trim(),
      resetDisabled: resetButton.hasAttribute('disabled'),
      resetBusy: resetButton.getAttribute('aria-busy'),
    };

    // Assert
    expect(actual).toEqual(expected);
  });
});
