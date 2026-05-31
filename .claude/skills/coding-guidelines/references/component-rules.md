# コンポーネント実装規約

## コンポーネントの分類

UIコンポーネント（`Components/ui/`）はビジネスロジックを持たない汎用的なコンポーネントとする。Button、Input、Modal、Card などが該当する。

機能コンポーネント（`Components/features/`）は特定の機能に紐づくコンポーネントとする。MemberCard、MemberForm などが該当し、ドメインの知識を持つ。

## コンポーネント実装

関数コンポーネントを使用する。props の型は interface で定義し、コンポーネントの上部に配置する。デフォルトエクスポートは使用せず、名前付きエクスポートを使用する。

```tsx
interface ButtonProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    onClick?: () => void;
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    onClick,
}: ButtonProps) {
    return (
        <button
            className={cn(
                'rounded-md font-medium',
                variants[variant],
                sizes[size],
            )}
            disabled={disabled}
            onClick={onClick}
        >
            {children}
        </button>
    );
}
```

## Props の設計

必須の props は optional にしない。デフォルト値がある props は optional とし、デフォルト値を明示する。コールバック props は `on` プレフィックスを使用する（例: `onClick`, `onChange`, `onSubmit`）。

## children の使用

コンテナコンポーネントは `children` を受け取る。`children` の型は `React.ReactNode` とする。

## 状態管理

コンポーネント内の状態は `useState` で管理する。複雑な状態は `useReducer` を検討する。グローバル状態が必要な場合は Inertia の shared data または Context を使用する。

## カスタムフック

コンポーネントから抽出可能なロジックはカスタムフックとして `hooks/` に配置する。命名は `use` プレフィックスを使用する。

```tsx
// hooks/useMembers.ts
export function useMembers() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(() => {
        router.reload({ only: ['members'] });
    }, []);

    return { members, loading, refresh };
}
```
