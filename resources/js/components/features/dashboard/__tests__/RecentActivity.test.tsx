/**
 * RecentActivity コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import type { ActivityItemData } from '@/types/dashboard';
import { RecentActivity } from '../RecentActivity';

describe('RecentActivity', () => {
  const activities: ActivityItemData[] = [
    {
      id: 1,
      articleId: null,
      title: 'タスク完了',
      description: 'タスクAを完了',
      timeAgo: '1分前',
      dotColor: 'green',
    },
    {
      id: 2,
      articleId: null,
      title: 'コメント追加',
      description: 'コメントを投稿',
      timeAgo: '3分前',
      dotColor: 'blue',
    },
  ];

  it('タイトル「最近のアクティビティ」が表示されること', () => {
    render(<RecentActivity activities={activities} />);
    expect(screen.getByText('最近のアクティビティ')).toBeInTheDocument();
  });

  it('アイテムリストが表示されること', () => {
    render(<RecentActivity activities={activities} />);
    expect(screen.getByText('タスク完了')).toBeInTheDocument();
    expect(screen.getByText('コメント追加')).toBeInTheDocument();
  });
});
