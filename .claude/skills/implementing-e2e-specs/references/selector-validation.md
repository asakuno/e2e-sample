# セレクタ検証（自動チェック対応）

品質ゲートチェック時に、計画書のロケーター一覧テーブルを解析し、以下の違反パターンを自動検出する。

## 違反パターン

| # | 違反パターン | 検出条件 | 修正提案 |
|---|-------------|---------|---------|
| 1 | **TestID優先使用** | `getByTestId` がロケーター一覧の50%以上を占める | 「{要素名}は `getByRole('button', { name: '...' })` または `getByLabel('...')` で特定可能です。ロールベースセレクタを優先してください。」 |
| 2 | **CSSセレクタ使用** | `locator('.class')` または `locator('#id')` の使用 | 「{要素名}は CSS セレクタではなく `getByLabel('{ラベル}')` または `getByRole('{role}')` で特定してください。」 |
| 3 | **XPathセレクタ使用** | `locator('//xpath')` の使用 | 「XPath セレクタは DOM 構造に依存するため使用禁止です。ロールベースセレクタに変更してください。」 |
| 4 | **具体性不足** | セレクタ値が空、`TODO`、`{placeholder}` | 「{要素名}のセレクタ値を具体的に記載してください。セレクタ調査 [2/6] を再実行することを推奨します。」 |
| 5 | **代替セレクタ未検討** | 入力要素で代替セレクタが「-」または空 | 「{要素名}の代替セレクタを検討してください。例: 主セレクタ `getByLabel` → 代替 `getByRole('textbox')`」 |
| 6 | **代替セレクタにCSS/XPath使用** | 代替セレクタ列に `locator('.class')`, `locator('#id')`, `locator('[attr]')`, `locator('//xpath')` の使用 | 「{要素名}の代替セレクタにCSS/XPathが使用されています。`getByRole`/`getByLabel`/`getByPlaceholder`/`getByText`/`getByTestId` に変更してください。」 |

## 検出結果の報告形式

```markdown
### セレクタ検証結果

**検出された違反: N件**

#### 違反1: TestID優先使用
- **該当要素**: submitButton, cancelButton, searchInput
- **現状**: 5要素中3要素（60%）が getByTestId を使用
- **修正提案**: 以下の要素はロールベースセレクタで特定可能です
  - `submitButton`: `getByRole('button', { name: '送信' })` を使用
  - `cancelButton`: `getByRole('button', { name: 'キャンセル' })` を使用
  - `searchInput`: `getByLabel('検索')` または `getByPlaceholder('検索...')` を使用

#### 違反2: 具体性不足
- **該当要素**: userAvatar
- **現状**: セレクタ値が `TODO` になっている
- **修正提案**: セレクタ調査 [2/6] を再実行し、DOM構造を確認してください
```
