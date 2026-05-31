/**
 * WelcomeBanner コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { WelcomeBanner } from '../WelcomeBanner';

describe('WelcomeBanner', () => {
  it('ユーザー名が表示されること', () => {
    render(<WelcomeBanner userName="田中太郎" />);
    expect(screen.getByText(/田中太郎/)).toBeInTheDocument();
  });

  it('マーケットダッシュボードの見出しが表示されること', () => {
    render(<WelcomeBanner userName="田中太郎" />);
    expect(screen.getByText('マーケットダッシュボード')).toBeInTheDocument();
  });
});
