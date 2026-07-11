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
    changeTone: 'positive',
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

  it('表示色だけから変化方向を推測して読み上げないこと', () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText('+12.5%')).not.toHaveAttribute('aria-label');
  });

  it('明示された読み上げラベルを付与すること', () => {
    render(
      <StatCard
        {...defaultProps}
        change="-5.2%"
        changeTone="negative"
        changeAccessibleLabel="前週比5.2%減少"
      />,
    );
    expect(screen.getByLabelText('前週比5.2%減少')).toBeInTheDocument();
  });

  it('アイコンが表示されること', () => {
    const { container } = render(<StatCard {...defaultProps} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
