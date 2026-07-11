import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { StatusBadge } from '../status-badge';

describe('StatusBadge', () => {
  it('状態ラベルが表示されること', () => {
    // Arrange
    const expected = 'ポジティブ';

    // Act
    render(<StatusBadge variant="positive">{expected}</StatusBadge>);
    const actual = screen.getByText(expected);

    // Assert
    expect(actual).toBeInTheDocument();
  });

  it('状態の意味が data-variant として公開されること', () => {
    // Arrange
    const expected = 'warning';

    // Act
    render(<StatusBadge variant={expected}>要確認</StatusBadge>);
    const actual = screen.getByText('要確認').getAttribute('data-variant');

    // Assert
    expect(actual).toBe(expected);
  });
});
