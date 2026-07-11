import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { StockSearchForm } from '../StockSearchForm';

describe('StockSearchForm', () => {
  it('検索処理中の場合、フィルターと操作ボタンが無効化されること', () => {
    // Arrange
    const expected = {
      queryDisabled: true,
      marketDisabled: true,
      searchDisabled: true,
      searchBusy: 'true',
      resetDisabled: true,
    };

    // Act
    render(
      <StockSearchForm
        filters={{ q: '', market: '' }}
        marketOptions={[]}
        processing
        onFiltersChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    const searchButton = screen.getByRole('button', { name: '検索中...' });
    const actual = {
      queryDisabled: screen.getByLabelText('銘柄コード・企業名').hasAttribute('disabled'),
      marketDisabled: screen.getByLabelText('市場').hasAttribute('disabled'),
      searchDisabled: searchButton.hasAttribute('disabled'),
      searchBusy: searchButton.getAttribute('aria-busy'),
      resetDisabled: screen.getByRole('button', { name: 'クリア' }).hasAttribute('disabled'),
    };

    // Assert
    expect(actual).toEqual(expected);
  });
});
