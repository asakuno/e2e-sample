# セレクタ戦略

Playwrightの公式ドキュメントでは、**ユーザー視点のセレクタを優先**することが推奨されている。

## 目次

- [セレクタ優先順位](#セレクタ優先順位)
- [ロールベースロケーター](#ロールベースロケーター)
- [ラベルベースロケーター](#ラベルベースロケーター)
- [プレースホルダーベースロケーター](#プレースホルダーベースロケーター)
- [テキストベースロケーター](#テキストベースロケーター)
- [TestIDロケーター](#testidロケーター)
- [高度なロケーターテクニック](#高度なロケーターテクニック)
- [良い例と悪い例](#良い例と悪い例)
- [TestIDを使うべき場面](#testidを使うべき場面)
- [アクセシビリティの考慮](#アクセシビリティの考慮)

## セレクタ優先順位

| 優先度 | メソッド | 使用場面 | 例 |
|--------|----------|----------|-----|
| 1️⃣ | `getByRole()` | ボタン、チェックボックス、見出し、リンク | `getByRole('button', { name: '送信' })` |
| 2️⃣ | `getByLabel()` | ラベル付きのフォーム要素 | `getByLabel('メールアドレス')` |
| 3️⃣ | `getByPlaceholder()` | プレースホルダー付き入力欄 | `getByPlaceholder('検索...')` |
| 4️⃣ | `getByText()` | 非インタラクティブ要素 | `getByText('ようこそ')` |
| 5️⃣ | `getByTestId()` | 明示的なテスト用契約 | `getByTestId('submit-button')` |
| ⚠️ | CSS/XPath | **最後の手段のみ** | `locator('.btn-primary')` |

## ロールベースロケーター

### 基本的な使用例

```typescript
// ボタン
page.getByRole('button', { name: '送信' });
page.getByRole('button', { name: /送信|submit/i });

// リンク
page.getByRole('link', { name: 'ホーム' });

// 見出し
page.getByRole('heading', { name: 'ユーザー登録' });
page.getByRole('heading', { level: 1 });

// チェックボックス
page.getByRole('checkbox', { name: 'ニュースレターを購読' });

// ラジオボタン
page.getByRole('radio', { name: '男性' });

// テキストボックス
page.getByRole('textbox', { name: 'ユーザー名' });

// コンボボックス（select要素）
page.getByRole('combobox', { name: '都道府県' });

// テーブル
page.getByRole('table');
page.getByRole('row');
page.getByRole('cell', { name: '山田太郎' });

// ナビゲーション
page.getByRole('navigation');
page.getByRole('navigation', { name: 'メインメニュー' });

// アラート
page.getByRole('alert');

// ダイアログ
page.getByRole('dialog');
page.getByRole('alertdialog');

// メニュー
page.getByRole('menu');
page.getByRole('menuitem', { name: 'ログアウト' });
```

### ロールオプション

```typescript
// 名前でマッチング
page.getByRole('button', { name: '送信' });

// 正規表現でマッチング
page.getByRole('button', { name: /送信|submit/i });

// 完全一致
page.getByRole('button', { name: '送信', exact: true });

// 見出しレベル
page.getByRole('heading', { level: 2 });

// 状態でフィルタリング
page.getByRole('checkbox', { checked: true });
page.getByRole('button', { disabled: true });
page.getByRole('button', { pressed: true });
page.getByRole('option', { selected: true });
page.getByRole('textbox', { expanded: true });
```

## ラベルベースロケーター

フォーム要素に最適:

```typescript
// ラベルテキストでマッチング
page.getByLabel('メールアドレス');
page.getByLabel('パスワード');

// 正規表現
page.getByLabel(/メール|email/i);

// 完全一致
page.getByLabel('名前', { exact: true });
```

## プレースホルダーベースロケーター

```typescript
page.getByPlaceholder('検索...');
page.getByPlaceholder('ユーザー名を入力');
```

## テキストベースロケーター

非インタラクティブ要素（div、span、p）に使用:

```typescript
// テキストでマッチング
page.getByText('ようこそ');
page.getByText('ログインに成功しました');

// 正規表現
page.getByText(/合計: \d+円/);

// 部分一致（デフォルト）
page.getByText('ようこそ'); // "ようこそ、山田さん"にもマッチ

// 完全一致
page.getByText('ようこそ', { exact: true });
```

## TestIDロケーター

最後の手段として使用。CSS/XPathよりは望ましい:

```typescript
// data-testid属性
page.getByTestId('submit-button');
page.getByTestId('user-list-item');
```

### TestID属性のカスタマイズ

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    testIdAttribute: 'data-pw'  // data-testidの代わりにdata-pwを使用
  }
});
```

```tsx
// React コンポーネント
<button data-pw="submit-button">送信</button>
```

## 高度なロケーターテクニック

### チェーンでスコープを絞り込む

```typescript
// リストアイテム内のボタンを取得
const product = page.getByRole('listitem').filter({ hasText: '商品A' });
await product.getByRole('button', { name: 'カートに追加' }).click();

// テーブル行内の特定セル
const row = page.getByRole('row').filter({ hasText: 'yamada@example.com' });
await row.getByRole('button', { name: '編集' }).click();

// カード内の要素
const card = page.getByTestId('user-card').filter({ hasText: '山田太郎' });
await card.getByRole('link', { name: '詳細' }).click();
```

### .and()で複数条件を組み合わせる

```typescript
// ボタンかつ特定のtitleを持つ
const button = page.getByRole('button').and(page.getByTitle('購読'));

// テキストを含みかつ特定のクラスを持つ
const element = page.getByText('重要').and(page.locator('.highlight'));
```

### .or()で代替マッチング

```typescript
// いずれかにマッチ
const element = page.getByRole('button', { name: '新規' })
  .or(page.getByRole('button', { name: '作成' }));

// エラーまたは成功メッセージ
const message = page.getByRole('alert')
  .or(page.getByText('成功しました'));
```

### 子要素でフィルタリング

```typescript
// 特定の見出しを含むリストアイテム
await page.getByRole('listitem')
  .filter({ has: page.getByRole('heading', { name: '商品B' }) })
  .getByRole('button', { name: 'カートに追加' })
  .click();

// 特定のアイコンを含むボタン
await page.getByRole('button')
  .filter({ has: page.locator('svg.icon-delete') })
  .click();
```

### hasNot / hasNotText でフィルタリング

```typescript
// 特定のテキストを含まない要素
await expect(page.getByRole('listitem')
  .filter({ hasNotText: '在庫切れ' })).toHaveCount(5);

// 特定の子要素を含まない要素
await page.getByRole('row')
  .filter({ hasNot: page.getByRole('button', { name: '削除' }) })
  .first()
  .click();
```

### nth / first / last

```typescript
// 最初の要素
await page.getByRole('button', { name: '削除' }).first().click();

// 最後の要素
await page.getByRole('listitem').last().click();

// n番目の要素（0始まり）
await page.getByRole('row').nth(2).click();
```

## 良い例と悪い例

### ボタン

```typescript
// ❌ 悪い例
page.locator('button.btn-primary');
page.locator('#submit-btn');
page.locator('button[type="submit"]');

// ✅ 良い例
page.getByRole('button', { name: '送信' });
page.getByRole('button', { name: '保存' });
```

### フォーム入力

```typescript
// ❌ 悪い例
page.locator('#email');
page.locator('input[name="email"]');
page.locator('.form-control.email-input');

// ✅ 良い例
page.getByLabel('メールアドレス');
page.getByPlaceholder('example@example.com');
```

### リンク

```typescript
// ❌ 悪い例
page.locator('a[href="/dashboard"]');
page.locator('.nav-link.active');

// ✅ 良い例
page.getByRole('link', { name: 'ダッシュボード' });
```

### テーブル

```typescript
// ❌ 悪い例
page.locator('table tbody tr:nth-child(2) td:nth-child(3)');
page.locator('.data-table .row .cell');

// ✅ 良い例
const row = page.getByRole('row').filter({ hasText: 'yamada@example.com' });
await row.getByRole('cell', { name: '管理者' }).click();
```

### 動的コンテンツ

```typescript
// ❌ 悪い例
page.locator(`#user-${userId}`);
page.locator(`[data-id="${productId}"]`);

// ✅ 良い例（TestIDを使用）
page.getByTestId(`user-${userId}`);

// ✅ より良い例（テキストでフィルタリング）
page.getByRole('row').filter({ hasText: userName });
```

## TestIDを使うべき場面

以下の場合のみTestIDを使用:

1. **視覚的に区別できない要素**
   ```typescript
   // 同じ「削除」ボタンが複数ある場合
   page.getByTestId(`delete-user-${userId}`);
   ```

2. **動的に生成されるコンテンツ**
   ```typescript
   // IDに基づいて特定する必要がある場合
   page.getByTestId(`product-card-${productId}`);
   ```

3. **コンポーネントライブラリの制約**
   ```typescript
   // aria属性を追加できない場合
   page.getByTestId('custom-date-picker');
   ```

## アクセシビリティの考慮

ロールベースロケーターを使用すると、自然とアクセシビリティが向上する:

```tsx
// React コンポーネント - アクセシビリティ対応
<button aria-label="ユーザーを削除">
  <TrashIcon />
</button>

<input
  type="email"
  id="email"
  aria-describedby="email-error"
/>
<label htmlFor="email">メールアドレス</label>
<span id="email-error" role="alert">無効なメールアドレスです</span>
```

```typescript
// テストでの使用
page.getByRole('button', { name: 'ユーザーを削除' });
page.getByLabel('メールアドレス');
page.getByRole('alert');
```
