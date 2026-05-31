/**
 * WelcomeBanner コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WelcomeBanner } from '../WelcomeBanner';

describe('WelcomeBanner', () => {
  it('ユーザー名が表示されること', () => {
    render(<WelcomeBanner userName="田中太郎" />);
    expect(screen.getByText(/田中太郎/)).toBeInTheDocument();
  });

  it('ウェルカムメッセージが表示されること', () => {
    render(<WelcomeBanner userName="田中太郎" />);
    expect(screen.getByText(/おかえりなさい/)).toBeInTheDocument();
  });
});
