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
    iconColorClass: 'text-info',
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

  it('up 方向を上昇として読み上げられること', () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByLabelText('上昇: +12.5%')).toBeInTheDocument();
  });

  it('down 方向を下降として読み上げられること', () => {
    render(<StatCard {...defaultProps} change="-5.2%" changeDirection="down" />);
    expect(screen.getByLabelText('下降: -5.2%')).toBeInTheDocument();
  });

  it('アイコンが表示されること', () => {
    const { container } = render(<StatCard {...defaultProps} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
