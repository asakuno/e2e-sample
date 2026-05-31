/**
 * GuestLayout コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GuestLayout } from '../GuestLayout';

describe('GuestLayout', () => {
  it('children が表示されること', () => {
    render(
      <GuestLayout>
        <p>テストコンテンツ</p>
      </GuestLayout>,
    );
    expect(screen.getByText('テストコンテンツ')).toBeInTheDocument();
  });

  it('「ログイン」見出しが表示されること', () => {
    render(
      <GuestLayout>
        <p>コンテンツ</p>
      </GuestLayout>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'ログイン' })).toBeInTheDocument();
  });

  it('title を指定できること', () => {
    render(
      <GuestLayout title="新規登録">
        <p>コンテンツ</p>
      </GuestLayout>,
    );
    expect(screen.getByRole('heading', { level: 1, name: '新規登録' })).toBeInTheDocument();
  });

  it('main 要素が存在すること', () => {
    render(
      <GuestLayout>
        <p>コンテンツ</p>
      </GuestLayout>,
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
