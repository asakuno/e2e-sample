/**
 * RecentActivity コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ActivityItemData } from '@/types/dashboard';
import { RecentActivity } from '../RecentActivity';

describe('RecentActivity', () => {
  const activities: ActivityItemData[] = [
    {
      id: 1,
      title: 'タスク完了',
      description: 'タスクAを完了',
      timeAgo: '1分前',
      dotColor: 'green',
    },
    {
      id: 2,
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
