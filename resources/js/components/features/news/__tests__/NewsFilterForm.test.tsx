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
      resetDisabled: true,
      stockDisabled: true,
      sentimentDisabled: true,
      fromDisabled: true,
      toDisabled: true,
    };

    // Act
    render(
      <NewsFilterForm
        filters={{ stock_id: '', sentiment: '', from: '', to: '' }}
        stockOptions={[]}
        sentimentOptions={[]}
        processing
        onFiltersChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    const searchButton = screen.getByRole('button', { name: expected.searchLabel });
    const resetButton = screen.getByRole('button', { name: 'クリア' });
    const actual = {
      searchLabel: searchButton.textContent?.trim(),
      searchDisabled: searchButton.hasAttribute('disabled'),
      searchBusy: searchButton.getAttribute('aria-busy'),
      resetDisabled: resetButton.hasAttribute('disabled'),
      stockDisabled: screen.getByLabelText('銘柄').hasAttribute('disabled'),
      sentimentDisabled: screen.getByLabelText('sentiment').hasAttribute('disabled'),
      fromDisabled: screen.getByLabelText('期間 From').hasAttribute('disabled'),
      toDisabled: screen.getByLabelText('期間 To').hasAttribute('disabled'),
    };

    // Assert
    expect(actual).toEqual(expected);
  });
});
