/**
 * GuestLayout コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const pageState = vi.hoisted(() => ({
  flash: {} as { success?: string; error?: string },
}));

vi.mock('@inertiajs/react', () => ({
  usePage: vi.fn(() => ({ props: { flash: pageState.flash } })),
}));

import { GuestLayout } from '../GuestLayout';

describe('GuestLayout', () => {
  beforeEach(() => {
    pageState.flash = {};
  });

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

  it('成功フラッシュが共有された場合、カード内に通知を表示すること', () => {
    // Arrange
    const expected = '保存しました。';
    pageState.flash = { success: expected };

    // Act
    render(
      <GuestLayout>
        <p>コンテンツ</p>
      </GuestLayout>,
    );
    const actual = screen.getByRole('status').textContent;

    // Assert
    expect(actual).toBe(expected);
  });
});
