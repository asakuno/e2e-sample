import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { WatchlistPriorityBadge } from '../WatchlistPriorityBadge';

describe('WatchlistPriorityBadge', () => {
  it('priority が 3 の場合、高が表示されること', () => {
    // Arrange
    const expected = '高';

    // Act
    render(<WatchlistPriorityBadge priority={3} />);
    const actual = screen.getByText(expected);

    // Assert
    expect(actual).toBeInTheDocument();
  });

  it('priority が 2 の場合、中が表示されること', () => {
    // Arrange
    const expected = '中';

    // Act
    render(<WatchlistPriorityBadge priority={2} />);
    const actual = screen.getByText(expected);

    // Assert
    expect(actual).toBeInTheDocument();
  });

  it('未知の priority の場合、数値付きラベルが表示されること', () => {
    // Arrange
    const expected = '優先度 9';

    // Act
    render(<WatchlistPriorityBadge priority={9} />);
    const actual = screen.getByText(expected);

    // Assert
    expect(actual).toBeInTheDocument();
  });
});
