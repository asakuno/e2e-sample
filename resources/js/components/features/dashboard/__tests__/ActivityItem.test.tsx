/**
 * ActivityItem コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import type { ActivityItemData } from '@/types/dashboard';
import { ActivityItem } from '../ActivityItem';

describe('ActivityItem', () => {
  const defaultProps: ActivityItemData = {
    id: 1,
    articleId: null,
    title: 'プロジェクト作成',
    description: '新規プロジェクト「テスト」を作成しました',
    timeAgo: '5分前',
    dotColor: 'blue',
    source: null,
    publishedAt: null,
  };

  it('タイトルが表示されること', () => {
    render(<ActivityItem {...defaultProps} />);
    expect(screen.getByText('プロジェクト作成')).toBeInTheDocument();
  });

  it('説明が表示されること', () => {
    render(<ActivityItem {...defaultProps} />);
    expect(screen.getByText('新規プロジェクト「テスト」を作成しました')).toBeInTheDocument();
  });

  it('時間が表示されること', () => {
    render(<ActivityItem {...defaultProps} />);
    expect(screen.getByText('5分前')).toBeInTheDocument();
  });
});
