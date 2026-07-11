# フロントエンド テスト規約

## テストの配置

コンポーネントテストは対象ファイルと同じディレクトリに配置する。命名は `{Component}.test.tsx` とする。

```
resources/js/
├── Components/
│   └── ui/
│       ├── Button.tsx
│       └── Button.test.tsx
```

## テストライブラリ

React Testing Library と Vitest を使用する。ユーザーの操作をシミュレートするテストを書く。実装の詳細ではなく、振る舞いをテストする。

## コンポーネントテストの書き方

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
    it('クリック時にonClickが呼ばれる', async () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>クリック</Button>);

        await userEvent.click(screen.getByRole('button', { name: 'クリック' }));

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('disabledの場合はクリックできない', async () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick} disabled>クリック</Button>);

        await userEvent.click(screen.getByRole('button', { name: 'クリック' }));

        expect(handleClick).not.toHaveBeenCalled();
    });
});
```

## Inertia ページのテスト

Inertia ページコンポーネントは props を渡してレンダリングし、表示内容を検証する。

```tsx
import { render, screen } from '@testing-library/react';
import Index from './Index';

describe('Members/Index', () => {
    it('メンバー一覧が表示される', () => {
        const members = [
            { id: '1', name: 'テストユーザー', email: 'test@example.com' },
        ];

        render(<Index members={members} />);

        expect(screen.getByText('テストユーザー')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
});
```

## モックの使用

Inertia の `router` や `usePage` はモックする。外部依存はテストダブルで置き換える。

```tsx
vi.mock('@inertiajs/react', () => ({
    router: {
        post: vi.fn(),
        visit: vi.fn(),
    },
    usePage: () => ({
        props: { auth: { user: { name: 'Test User' } } },
    }),
}));
```

## テストの命名

日本語でテスト内容を記述する。`it` または `test` を使用し、テスト内容が明確になるように記述する。

## コードカバレッジ基準

テストカバレッジの最低基準を設定し、品質を担保する。

### カバレッジ目標

- **UI コンポーネント**: 70%以上
- **カスタムフック**: 80%以上
- **ユーティリティ関数**: 80%以上
- **Page コンポーネント**: 60%以上

### カバレッジの確認

```bash
yarn test --coverage
```

カバレッジレポートは `coverage/` ディレクトリに生成される。HTML レポートで詳細を確認できる。

### カバレッジ不足時の対応

1. 未テストのブランチを特定
2. エッジケースのテストを追加
3. エラーハンドリングのテストを追加
4. カバレッジ基準を満たすまで追加テストを作成

**重要**: カバレッジ基準を満たさない場合は、次のフェーズに進まない。
