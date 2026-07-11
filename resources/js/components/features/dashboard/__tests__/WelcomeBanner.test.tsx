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

  it('ユーザー名がない場合に「さん」だけを表示しないこと', () => {
    render(<WelcomeBanner userName="" />);
    expect(screen.queryByText(/さん/)).not.toBeInTheDocument();
    expect(screen.getByText(/^ウォッチ銘柄と最新ニュースから/)).toBeInTheDocument();
  });

  it('ページの主見出しが表示されること', () => {
    render(<WelcomeBanner userName="田中太郎" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'マーケットダッシュボード' }),
    ).toBeInTheDocument();
  });

  it('未実装の主要指数を案内しないこと', () => {
    render(<WelcomeBanner userName="田中太郎" />);
    expect(screen.queryByText(/主要指数/)).not.toBeInTheDocument();
  });

  it('最新分析日時が指定された場合に表示すること', () => {
    render(<WelcomeBanner userName="田中太郎" latestAnalysisAt="2026-06-15 11:00" />);
    expect(screen.getByText('2026-06-15 11:00')).toHaveAttribute('datetime', '2026-06-15T11:00');
  });

  it('最新分析日時がない場合はラベルを表示しないこと', () => {
    render(<WelcomeBanner userName="田中太郎" latestAnalysisAt={null} />);
    expect(screen.queryByText(/最新分析日時/)).not.toBeInTheDocument();
  });
});
