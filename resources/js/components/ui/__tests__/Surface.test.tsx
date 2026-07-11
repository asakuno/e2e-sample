import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { Surface } from '../surface';

describe('Surface', () => {
  it('asChild を指定した場合、子要素のセマンティクスを維持すること', () => {
    // Arrange
    const expected = '分析サマリー';

    // Act
    render(
      <Surface asChild>
        <section aria-label={expected}>内容</section>
      </Surface>,
    );
    const actual = screen.getByRole('region', { name: expected });

    // Assert
    expect(actual).toBeInTheDocument();
  });

  it('native div props が透過されること', () => {
    // Arrange
    const expected = 'market-summary';

    // Act
    render(<Surface data-testid={expected}>内容</Surface>);
    const actual = screen.getByTestId(expected);

    // Assert
    expect(actual).toHaveTextContent('内容');
  });
});
