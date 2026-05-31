# Unit テスト設計技法

## 目次

1. [同値分割（Equivalence Partitioning）](#1-同値分割equivalence-partitioning)
2. [境界値分析（Boundary Value Analysis）](#2-境界値分析boundary-value-analysis)
3. [デシジョンテーブル（Decision Table Testing）](#3-デシジョンテーブルdecision-table-testing)
4. [ペアワイズテスト（Pairwise Testing）](#4-ペアワイズテストpairwise-testing)
5. [プロパティベーステスト（Property-Based Testing）](#5-プロパティベーステストproperty-based-testing)
6. [スナップショットテスト設計指針](#6-スナップショットテスト設計指針)
7. [ブランチカバレッジ（Branch Coverage）](#7-ブランチカバレッジbranch-coverage)
8. [AAA パターン（Arrange-Act-Assert）](#8-aaa-パターンarrange-act-assert)
9. [テストダブルの選択フローチャート](#9-テストダブルの選択フローチャート)
10. [エラー推測（Error Guessing）](#10-エラー推測error-guessing)

---

## 1. 同値分割（Equivalence Partitioning）

入力値を「同じ処理をされる」グループ（同値クラス）に分割し、各クラスから代表値をテストする。

### 適用例: メールアドレスのバリデーション

```
同値クラス:
├─ 有効クラス
│   ├─ 通常のメールアドレス: user@example.com
│   └─ サブドメイン付き: user@mail.example.com
│
└─ 無効クラス
    ├─ @なし: userexample.com
    ├─ ドメインなし: user@
    ├─ ユーザー名なし: @example.com
    └─ 空文字: ""
```

### 実装例（Vitest）

```typescript
describe('validateEmail', () => {
  // 有効クラス
  it.each([
    ['user@example.com', '通常のメールアドレス'],
    ['user@mail.example.com', 'サブドメイン付き'],
  ])('%s は有効 (%s)', (email) => {
    expect(validateEmail(email)).toBe(true);
  });

  // 無効クラス
  it.each([
    ['userexample.com', '@なし'],
    ['user@', 'ドメインなし'],
    ['@example.com', 'ユーザー名なし'],
    ['', '空文字'],
  ])('%s は無効 (%s)', (email) => {
    expect(validateEmail(email)).toBe(false);
  });
});
```

### 実装例（PHPUnit）

```php
/**
 * @dataProvider validEmailProvider
 */
public function test_有効なメールアドレスを検証できる(string $email): void
{
    $this->assertTrue($this->validator->validate($email));
}

public static function validEmailProvider(): array
{
    return [
        '通常のメールアドレス' => ['user@example.com'],
        'サブドメイン付き' => ['user@mail.example.com'],
    ];
}

/**
 * @dataProvider invalidEmailProvider
 */
public function test_無効なメールアドレスを検証できる(string $email): void
{
    $this->assertFalse($this->validator->validate($email));
}

public static function invalidEmailProvider(): array
{
    return [
        '@なし' => ['userexample.com'],
        'ドメインなし' => ['user@'],
        'ユーザー名なし' => ['@example.com'],
        '空文字' => [''],
    ];
}
```

---

## 2. 境界値分析（Boundary Value Analysis）

同値クラスの境界にある値をテストする。バグは境界で発生しやすい。

### 適用例: パスワードの長さ検証（8〜32文字）

```
境界値:
├─ 最小値 - 1: 7文字 → 無効
├─ 最小値: 8文字 → 有効
├─ 最小値 + 1: 9文字 → 有効
├─ 最大値 - 1: 31文字 → 有効
├─ 最大値: 32文字 → 有効
└─ 最大値 + 1: 33文字 → 無効
```

### 実装例（Vitest）

```typescript
describe('validatePasswordLength', () => {
  const MIN_LENGTH = 8;
  const MAX_LENGTH = 32;

  it.each([
    [MIN_LENGTH - 1, false, '最小値-1'],
    [MIN_LENGTH, true, '最小値'],
    [MIN_LENGTH + 1, true, '最小値+1'],
    [MAX_LENGTH - 1, true, '最大値-1'],
    [MAX_LENGTH, true, '最大値'],
    [MAX_LENGTH + 1, false, '最大値+1'],
  ])('%d文字は%s (%s)', (length, expected) => {
    const password = 'a'.repeat(length);
    expect(validatePasswordLength(password)).toBe(expected);
  });
});
```

### 実装例（PHPUnit）

```php
/**
 * @dataProvider passwordLengthBoundaryProvider
 */
public function test_パスワードの長さ境界値を検証できる(
    int $length,
    bool $expected,
    string $description
): void {
    $password = str_repeat('a', $length);
    $this->assertSame($expected, $this->validator->validateLength($password), $description);
}

public static function passwordLengthBoundaryProvider(): array
{
    return [
        '最小値-1' => [7, false, '7文字は無効'],
        '最小値' => [8, true, '8文字は有効'],
        '最小値+1' => [9, true, '9文字は有効'],
        '最大値-1' => [31, true, '31文字は有効'],
        '最大値' => [32, true, '32文字は有効'],
        '最大値+1' => [33, false, '33文字は無効'],
    ];
}
```

---

## 3. デシジョンテーブル（Decision Table Testing）

複数条件の組み合わせをテーブル化して網羅的にテストする。

### 適用例: ユーザー登録の可否判定

| 条件 | R1 | R2 | R3 | R4 |
|------|:--:|:--:|:--:|:--:|
| メールが有効 | Y | Y | N | N |
| パスワードが有効 | Y | N | Y | N |
| **結果: 登録可** | Y | N | N | N |

### 実装例（Vitest）

```typescript
describe('canRegister', () => {
  it.each([
    [true, true, true, 'メール有効・パスワード有効'],
    [true, false, false, 'メール有効・パスワード無効'],
    [false, true, false, 'メール無効・パスワード有効'],
    [false, false, false, 'メール無効・パスワード無効'],
  ])('メール:%s パスワード:%s → 登録:%s (%s)', (validEmail, validPassword, expected) => {
    const result = canRegister({
      email: validEmail ? 'user@example.com' : 'invalid',
      password: validPassword ? 'ValidPass123!' : 'short',
    });
    expect(result).toBe(expected);
  });
});
```

---

## 4. ペアワイズテスト（Pairwise Testing）

3つ以上のパラメータの組み合わせテストで、全組み合わせ（直積）だとテストケースが爆発する場合に有効。すべての2因子の組み合わせを網羅することで、テストケース数を大幅に削減しつつ、多くのバグを検出できる。

### 問題: 組み合わせ爆発

```
例: ブラウザ × OS × 画面サイズ × 言語
- ブラウザ: Chrome, Firefox, Safari, Edge (4種)
- OS: Windows, macOS, Linux (3種)
- 画面サイズ: mobile, tablet, desktop (3種)
- 言語: ja, en, zh (3種)

全組み合わせ: 4 × 3 × 3 × 3 = 108ケース
ペアワイズ: 約15ケースで全2因子組み合わせを網羅
```

### ペアワイズテストの原理

```
「ほとんどのバグは1つまたは2つのパラメータの相互作用で発生する」

全2因子組み合わせを網羅すれば、約70-90%のバグを検出可能。
3因子以上の相互作用によるバグは稀。
```

### 実装例（Vitest）

```typescript
// pairwise ツールで生成したテストケースを使用
// オンラインツール: https://pairwise.teremokgames.com/

const pairwiseTestCases = [
  { browser: 'Chrome', os: 'Windows', size: 'desktop', lang: 'ja' },
  { browser: 'Chrome', os: 'macOS', size: 'tablet', lang: 'en' },
  { browser: 'Chrome', os: 'Linux', size: 'mobile', lang: 'zh' },
  { browser: 'Firefox', os: 'Windows', size: 'tablet', lang: 'zh' },
  { browser: 'Firefox', os: 'macOS', size: 'mobile', lang: 'ja' },
  { browser: 'Firefox', os: 'Linux', size: 'desktop', lang: 'en' },
  { browser: 'Safari', os: 'Windows', size: 'mobile', lang: 'en' },
  { browser: 'Safari', os: 'macOS', size: 'desktop', lang: 'zh' },
  { browser: 'Safari', os: 'Linux', size: 'tablet', lang: 'ja' },
  { browser: 'Edge', os: 'Windows', size: 'mobile', lang: 'ja' },
  { browser: 'Edge', os: 'macOS', size: 'tablet', lang: 'zh' },
  { browser: 'Edge', os: 'Linux', size: 'desktop', lang: 'en' },
  // ... 計15ケース程度で全2因子組み合わせを網羅
];

describe('クロスブラウザ互換性', () => {
  it.each(pairwiseTestCases)(
    '$browser/$os/$size/$lang でレンダリングできる',
    async ({ browser, os, size, lang }) => {
      const result = await renderPage({ browser, os, size, lang });
      expect(result.status).toBe('success');
    }
  );
});
```

### 実装例（PHPUnit）

```php
/**
 * @dataProvider pairwiseTestCaseProvider
 */
public function test_クロスプラットフォーム互換性(
    string $browser,
    string $os,
    string $size,
    string $lang
): void {
    $result = $this->renderer->render(
        browser: $browser,
        os: $os,
        size: $size,
        lang: $lang
    );

    $this->assertTrue($result->isSuccess());
}

public static function pairwiseTestCaseProvider(): array
{
    return [
        ['Chrome', 'Windows', 'desktop', 'ja'],
        ['Chrome', 'macOS', 'tablet', 'en'],
        ['Chrome', 'Linux', 'mobile', 'zh'],
        ['Firefox', 'Windows', 'tablet', 'zh'],
        ['Firefox', 'macOS', 'mobile', 'ja'],
        // ... ペアワイズツールで生成
    ];
}
```

### ペアワイズを使うべき場面

| 場面 | 推奨度 | 理由 |
|------|:------:|------|
| 3因子以上のパラメータ組み合わせ | ◎ | 組み合わせ爆発を防ぐ |
| 設定のバリエーションテスト | ◎ | 設定オプションが多い場合に有効 |
| 2因子のみ | × | デシジョンテーブルで十分 |
| 因子間に強い依存関係がある | △ | 依存関係を考慮した設計が必要 |

---

## 5. プロパティベーステスト（Property-Based Testing）

具体的な入出力のペアではなく、「常に成り立つべき性質（プロパティ）」を定義し、ランダムな入力で検証する。エッジケースを自動的に発見できる。

### Example-Based vs Property-Based

```
Example-Based テスト:
  入力: [3, 1, 4] → 出力: [1, 3, 4]  ✓
  入力: [5, 2] → 出力: [2, 5]  ✓

Property-Based テスト:
  任意の配列 arr に対して:
    - sort(arr).length === arr.length （長さが保存される）
    - sort(arr) の各要素は arr に含まれる （要素が保存される）
    - sort(arr)[i] <= sort(arr)[i+1] （ソート順）
```

### 実装例（Vitest + fast-check）

```typescript
import * as fc from 'fast-check';

describe('sort関数のプロパティ', () => {
  it('配列の長さが保存される', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = sort(arr);
        return sorted.length === arr.length;
      })
    );
  });

  it('すべての要素が保存される', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = sort(arr);
        const originalSet = new Set(arr);
        return sorted.every(x => originalSet.has(x));
      })
    );
  });

  it('結果は昇順にソートされている', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = sort(arr);
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i] > sorted[i + 1]) return false;
        }
        return true;
      })
    );
  });
});
```

### よく使われるプロパティパターン

| パターン | 説明 | 例 |
|----------|------|-----|
| **往復（Round-trip）** | encode → decode で元に戻る | JSON.parse(JSON.stringify(x)) === x |
| **等価性（Equivalence）** | 異なる実装が同じ結果を返す | fastSort(arr) === standardSort(arr) |
| **不変条件（Invariant）** | 操作後も性質が保たれる | sort後も長さが同じ |
| **冪等性（Idempotent）** | 2回適用しても結果が同じ | format(format(x)) === format(x) |
| **可換性（Commutative）** | 順序を変えても結果が同じ | add(a, b) === add(b, a) |

### 実装例: JSON シリアライズの往復テスト

```typescript
import * as fc from 'fast-check';

describe('JSONシリアライズ', () => {
  it('serialize → deserialize で元のデータに戻る', () => {
    // 任意のユーザーオブジェクトを生成
    const userArbitrary = fc.record({
      id: fc.integer({ min: 1 }),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      email: fc.emailAddress(),
      age: fc.integer({ min: 0, max: 150 }),
      active: fc.boolean(),
    });

    fc.assert(
      fc.property(userArbitrary, (user) => {
        const serialized = serialize(user);
        const deserialized = deserialize(serialized);

        return (
          deserialized.id === user.id &&
          deserialized.name === user.name &&
          deserialized.email === user.email &&
          deserialized.age === user.age &&
          deserialized.active === user.active
        );
      })
    );
  });
});
```

### プロパティベーステストを使うべき場面

| 場面 | 推奨度 | 理由 |
|------|:------:|------|
| データ変換・シリアライズ | ◎ | 往復テストで網羅的に検証 |
| 数学的関数（ソート、集合演算） | ◎ | 数学的性質を直接検証 |
| パーサー・バリデータ | ◎ | 境界値を自動発見 |
| UIコンポーネント | △ | 状態遷移が複雑で適用しにくい |
| 外部API連携 | × | レスポンスが制御できない |

---

## 6. スナップショットテスト設計指針

スナップショットテストは出力の変更を検知するが、**使い方を誤ると保守性が低下する**。

### スナップショットテストを使うべき場面

| 場面 | 推奨度 | 理由 |
|------|:------:|------|
| UI コンポーネントの構造 | ○ | HTML構造の意図しない変更を検知 |
| 設定ファイルの生成 | ○ | 出力形式が安定している |
| APIレスポンスの形式 | ○ | 契約の変更を検知 |
| エラーメッセージ | △ | 頻繁に変更される可能性 |
| ログ出力 | × | タイムスタンプ等で常に変化 |
| データベースクエリ | × | 実行環境で変化しやすい |

### スナップショットテストを避けるべき場面

```typescript
// NG: 動的な値を含む
it('ユーザー情報を表示', () => {
  const user = { id: 1, name: 'Test', createdAt: new Date() };
  expect(renderUser(user)).toMatchSnapshot();
  // createdAt が毎回変わるため常に失敗
});

// OK: 動的な値を固定
it('ユーザー情報を表示', () => {
  const user = {
    id: 1,
    name: 'Test',
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };
  expect(renderUser(user)).toMatchSnapshot();
});
```

### インラインスナップショット vs 外部スナップショット

```typescript
// インラインスナップショット（推奨: 小さな出力）
it('ボタンをレンダリング', () => {
  const { container } = render(<Button>Click</Button>);
  expect(container.innerHTML).toMatchInlineSnapshot(
    `"<button class=\"btn\">Click</button>"`
  );
});

// 外部スナップショット（大きな出力）
it('ページ全体をレンダリング', () => {
  const { container } = render(<Dashboard />);
  expect(container).toMatchSnapshot();
  // → __snapshots__/Dashboard.test.tsx.snap に保存
});
```

### スナップショット更新のルール

```
スナップショット更新時のチェックリスト:
1. [ ] 変更が意図的か確認した
2. [ ] 変更の差分をレビューした
3. [ ] 関連するテストも確認した
4. [ ] コミットメッセージに変更理由を記載した

NG: 「テストが通らないので -u で更新した」
OK: 「ボタンのスタイル変更に伴いスナップショットを更新」
```

---

## 7. ブランチカバレッジ（Branch Coverage）

すべての条件分岐の両方のパス（true/false）を通過させる。

### 対象コード

```typescript
function calculateDiscount(user: User, amount: number): number {
  let discount = 0;

  if (user.isPremium) {           // 分岐1
    discount += 10;
  }

  if (amount >= 10000) {          // 分岐2
    discount += 5;
  }

  return discount;
}
```

### 必要なテストケース

| テスト | isPremium | amount | 期待値 | カバー分岐 |
|--------|:---------:|:------:|:------:|------------|
| 1 | true | 10000 | 15 | 分岐1-true, 分岐2-true |
| 2 | true | 9999 | 10 | 分岐1-true, 分岐2-false |
| 3 | false | 10000 | 5 | 分岐1-false, 分岐2-true |
| 4 | false | 9999 | 0 | 分岐1-false, 分岐2-false |

---

## 8. AAA パターン（Arrange-Act-Assert）

テストを3つのセクションに分割して可読性を高める。

### 良い例

```typescript
it('プレミアムユーザーは10%の割引を受ける', () => {
  // Arrange - テストの準備
  const user = createUser({ isPremium: true });
  const amount = 1000;

  // Act - テスト対象の実行
  const discount = calculateDiscount(user, amount);

  // Assert - 結果の検証
  expect(discount).toBe(10);
});
```

### 悪い例

```typescript
// NG: 準備・実行・検証が混在している
it('プレミアムユーザーは10%の割引を受ける', () => {
  const user = createUser({ isPremium: true });
  expect(calculateDiscount(user, 1000)).toBe(10);
  user.isPremium = false;
  expect(calculateDiscount(user, 1000)).toBe(0);
});
```

---

## 9. テストダブルの選択フローチャート

テストダブル（Mock, Stub, Spy, Fake）の選択は、**何を検証したいか**によって決まる。

### 選択フローチャート

```
テストダブルの選択
    │
    ├── 外部依存の「戻り値」を制御したい？
    │       └── YES → Stub を使用
    │
    ├── 外部依存が「呼び出されたか」を検証したい？
    │       └── YES → Mock を使用
    │
    ├── 実装を維持しつつ「呼び出し」を記録したい？
    │       └── YES → Spy を使用
    │
    └── 外部依存の「軽量な代替実装」が欲しい？
            └── YES → Fake を使用
```

### 各テストダブルの詳細

| 種類 | 目的 | 使用場面 | 注意点 |
|------|------|----------|--------|
| **Stub** | 固定値を返す | 外部APIの戻り値を固定したい | 実装が呼ばれないので振る舞いテストには不向き |
| **Mock** | 呼び出しを検証する | メソッドが呼ばれたか確認したい | 過度な使用は実装詳細への依存を招く |
| **Spy** | 実装を維持しつつ監視 | 実際の動作を追跡したい | 実装が動くのでテストが遅くなる可能性 |
| **Fake** | 軽量な代替実装 | インメモリDBなど | 実装コストがかかる |

### 判断基準の詳細

```
質問1: 依存先の「戻り値」が重要か、「呼び出し」が重要か？

戻り値が重要 → Stub
  例: ユーザー取得処理のテストで、リポジトリが特定のユーザーを返すことを前提にしたい

呼び出しが重要 → Mock
  例: メール送信処理のテストで、メールサービスが正しい引数で呼ばれたか検証したい

両方重要 → Stub + Mock の組み合わせ
  例: ユーザー取得後にメール送信するフローで、両方を検証したい

質問2: 実際の実装を動かしたいか？

動かしたい → Spy（部分的なモック）
  例: ロギング処理は実際に動かしつつ、呼び出し回数を検証したい

動かしたくない → Mock/Stub
  例: 外部APIは呼び出したくないので完全に置き換えたい

質問3: 複雑な状態を持つ依存か？

複雑な状態が必要 → Fake
  例: インメモリDBを使ってリポジトリの統合テストを高速化したい
```

### 実装例（Vitest）

```typescript
// Stub: 固定値を返す
const userRepository = {
  findById: vi.fn().mockResolvedValue({ id: 1, name: 'Test User' }),
};

// Mock: 呼び出しを検証
const emailService = {
  send: vi.fn(),
};
await useCase.execute(data);
expect(emailService.send).toHaveBeenCalledWith(
  expect.objectContaining({ to: 'user@example.com' })
);

// Spy: 実装を維持しつつ監視
const consoleSpy = vi.spyOn(console, 'log');
execute();
expect(consoleSpy).toHaveBeenCalledWith('処理完了');
```

### 実装例（PHPUnit）

```php
// Stub: 固定値を返す
$repository = $this->createMock(UserRepositoryInterface::class);
$repository->method('findById')->willReturn(new User(id: 1, name: 'Test User'));

// Mock: 呼び出しを検証
$emailService = $this->createMock(EmailServiceInterface::class);
$emailService->expects($this->once())
    ->method('send')
    ->with($this->callback(fn($mail) => $mail->to === 'user@example.com'));

// Spy: 実装を維持しつつ部分的にモック
$service = $this->getMockBuilder(UserService::class)
    ->onlyMethods(['sendNotification'])
    ->getMock();
```

---

## 10. エラー推測（Error Guessing）

経験に基づいてバグが発生しやすい箇所をテストする。

### よくあるエラーパターン

| カテゴリ | テストすべき値 |
|----------|---------------|
| **数値** | 0, 負数, 小数, 最大値, NaN, Infinity |
| **文字列** | 空文字, 空白のみ, 非常に長い文字列, 特殊文字 |
| **配列** | 空配列, 1要素, 大量要素, null |
| **日付** | 閏年, 月末, 年末, タイムゾーン |
| **null/undefined** | null, undefined, 空オブジェクト |

### 実装例

```typescript
describe('divideNumbers - エラー推測', () => {
  it('0で割るとInfinityを返す', () => {
    expect(divide(10, 0)).toBe(Infinity);
  });

  it('負数同士の割り算は正数を返す', () => {
    expect(divide(-10, -2)).toBe(5);
  });

  it('NaNを含む計算はNaNを返す', () => {
    expect(divide(NaN, 5)).toBeNaN();
  });
});
```
