/**
 * AuthenticatedLayout コンポーネントテスト
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';

vi.mock('@inertiajs/react', () => ({
  router: {
    post: vi.fn(),
    visit: vi.fn(),
  },
  usePage: vi.fn(() => ({
    url: '/dashboard',
    props: {
      auth: {
        user: { id: 1, name: 'テストユーザー' },
      },
    },
  })),
}));

import { AuthenticatedLayout } from '../AuthenticatedLayout';

describe('AuthenticatedLayout', () => {
  it('children が描画されること', () => {
    // Arrange & Act
    render(
      <AuthenticatedLayout>
        <p>テストコンテンツ</p>
      </AuthenticatedLayout>,
    );
    const actual = screen.getByText('テストコンテンツ');

    // Assert
    expect(actual).toBeInTheDocument();
  });

  it('main 要素が存在すること', () => {
    // Arrange & Act
    render(
      <AuthenticatedLayout>
        <p>コンテンツ</p>
      </AuthenticatedLayout>,
    );
    const actual = screen.getByRole('main');

    // Assert
    expect(actual).toBeInTheDocument();
  });

  it('スキップリンクがメインコンテンツを参照すること', () => {
    // Arrange
    const expected = {
      href: '#main-content',
      mainId: 'main-content',
    };

    // Act
    render(
      <AuthenticatedLayout>
        <p>コンテンツ</p>
      </AuthenticatedLayout>,
    );
    const skipLink = screen.getByRole('link', { name: 'メインコンテンツへ移動' });
    const main = screen.getByRole('main');
    const actual = {
      href: skipLink.getAttribute('href'),
      mainId: main.id,
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('Tab キーで最初にスキップリンクへ移動できること', async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <AuthenticatedLayout>
        <p>コンテンツ</p>
      </AuthenticatedLayout>,
    );
    const expected = screen.getByRole('link', { name: 'メインコンテンツへ移動' });

    // Act
    await user.tab();
    const actual = document.activeElement;

    // Assert
    expect(actual).toBe(expected);
  });

  it('投資助言ではない旨の注意表示が表示されること', () => {
    // Arrange & Act
    render(
      <AuthenticatedLayout>
        <p>コンテンツ</p>
      </AuthenticatedLayout>,
    );
    const footer = screen.getByRole('contentinfo');
    const actual = within(footer).getByText(/投資助言/);

    // Assert
    expect(actual).toBeInTheDocument();
  });

  it('モバイルメニューボタンに制御対象と閉じた状態が設定されること', () => {
    // Arrange & Act
    render(
      <AuthenticatedLayout>
        <p>コンテンツ</p>
      </AuthenticatedLayout>,
    );
    const menuButton = screen.getByRole('button', { name: 'メニューを開く' });
    const expected = {
      controls: 'mobile-navigation',
      expanded: 'false',
    };

    // Act
    const actual = {
      controls: menuButton.getAttribute('aria-controls'),
      expanded: menuButton.getAttribute('aria-expanded'),
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('モバイルナビゲーションで項目を選択した場合、ドロワーが閉じること', async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <AuthenticatedLayout>
        <p>コンテンツ</p>
      </AuthenticatedLayout>,
    );

    // Act
    await user.click(screen.getByRole('button', { name: 'メニューを開く' }));
    const dialog = screen.getByRole('dialog', { name: 'メインメニュー' });
    await user.click(within(dialog).getByRole('link', { name: 'News' }));
    const actual = screen.queryByRole('dialog', { name: 'メインメニュー' });

    // Assert
    expect(actual).not.toBeInTheDocument();
  });
});
