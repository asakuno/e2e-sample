import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { FeedbackMessage, FlashMessages } from '../FlashMessages';

describe('FlashMessages', () => {
  it('成功メッセージがある場合、処理結果として読み上げられること', () => {
    // Arrange
    const expected = 'ウォッチリストに追加しました。';

    // Act
    render(<FlashMessages flash={{ success: expected }} />);
    const actual = screen.getByRole('status').textContent;

    // Assert
    expect(actual).toBe(expected);
  });

  it('エラーメッセージがある場合、警告として読み上げられること', () => {
    // Arrange
    const expected = '処理に失敗しました。';

    // Act
    render(<FlashMessages flash={{ error: expected }} />);
    const actual = screen.getByRole('alert').textContent;

    // Assert
    expect(actual).toBe(expected);
  });

  it('共有メッセージがない場合、通知領域を表示しないこと', () => {
    // Arrange & Act
    const { container } = render(<FlashMessages flash={{}} />);
    const actual = container.firstChild;

    // Assert
    expect(actual).toBeNull();
  });

  it('空文字のページ固有メッセージは表示しないこと', () => {
    // Arrange & Act
    const { container } = render(<FeedbackMessage message="" tone="success" />);
    const actual = container.firstChild;

    // Assert
    expect(actual).toBeNull();
  });
});
