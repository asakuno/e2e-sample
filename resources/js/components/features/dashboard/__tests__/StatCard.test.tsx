/**
 * StatCard コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import type { StatCardData } from '../StatCard';
import { StatCard } from '../StatCard';

describe('StatCard', () => {
  const defaultProps: StatCardData = {
    label: '総ユーザー数',
    value: '1,234',
    change: '+12.5%',
    changeDirection: 'up',
    icon: 'group',
    iconColorClass: 'text-blue-500',
  };

  it('ラベルが表示されること', () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText('総ユーザー数')).toBeInTheDocument();
  });

  it('値が表示されること', () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('変化率が表示されること', () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
  });

  it('up 方向で緑色のスタイルが適用されること', () => {
    render(<StatCard {...defaultProps} />);
    const change = screen.getByText('+12.5%');
    expect(change.className).toContain('text-green');
  });

  it('down 方向で赤色のスタイルが適用されること', () => {
    render(<StatCard {...defaultProps} change="-5.2%" changeDirection="down" />);
    const change = screen.getByText('-5.2%');
    expect(change.className).toContain('text-red');
  });

  it('アイコンが表示されること', () => {
    const { container } = render(<StatCard {...defaultProps} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
