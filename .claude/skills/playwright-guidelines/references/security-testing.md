# セキュリティテスト

E2EテストにおけるセキュリティテストパターンとXSS/CSRF脆弱性の検出方法。

## 目次

- [XSS脆弱性の検出](#xss脆弱性の検出)
- [CSRF対策の検証](#csrf対策の検証)
- [認証・認可テスト](#認証認可テスト)
- [セッション管理テスト](#セッション管理テスト)
- [テストデータのセキュリティ](#テストデータのセキュリティ)

## XSS脆弱性の検出

### 基本的なXSSテスト

```typescript
import { test, expect } from '@playwright/test';

test.describe('XSS対策', () => {
  test('スクリプトタグがエスケープされること', async ({ page }) => {
    // Arrange
    const maliciousInput = '<script>alert("XSS")</script>';

    // Act
    await page.goto('/comments/new');
    await page.getByLabel('コメント').fill(maliciousInput);
    await page.getByRole('button', { name: '投稿' }).click();

    // Assert: エスケープされた文字列として表示されることを確認
    await expect(page.getByText(maliciousInput)).toBeVisible();

    // スクリプトが実行されていないことを確認
    const alertFired = await page.evaluate(() => {
      return (window as any).__xssAlertFired || false;
    });
    expect(alertFired).toBe(false);
  });

  test('imgタグのonerrorがエスケープされること', async ({ page }) => {
    // Arrange
    const maliciousInput = '<img src="x" onerror="alert(\'XSS\')">';

    // Act
    await page.goto('/profile/edit');
    await page.getByLabel('自己紹介').fill(maliciousInput);
    await page.getByRole('button', { name: '保存' }).click();

    // Assert: 画像タグとして解釈されていないことを確認
    const images = await page.locator('img[onerror]').count();
    expect(images).toBe(0);
  });

  test('イベントハンドラインジェクションが防止されること', async ({ page }) => {
    // Arrange
    const maliciousInputs = [
      '" onclick="alert(1)" data-x="',
      "' onclick='alert(1)' data-x='",
      '" onfocus="alert(1)" autofocus="',
    ];

    for (const input of maliciousInputs) {
      // Act
      await page.goto('/search');
      await page.getByPlaceholder('検索').fill(input);
      await page.getByRole('button', { name: '検索' }).click();

      // Assert: イベントハンドラが実行されていないこと
      const hasEventHandlers = await page.evaluate(() => {
        return document.querySelectorAll('[onclick], [onfocus]').length;
      });
      expect(hasEventHandlers).toBe(0);
    }
  });
});
```

### URL経由のXSSテスト

```typescript
test.describe('URL XSS対策', () => {
  test('URLパラメータのXSSが防止されること', async ({ page }) => {
    // Arrange
    const maliciousParams = [
      '<script>alert(1)</script>',
      'javascript:alert(1)',
      '"><script>alert(1)</script>',
    ];

    for (const payload of maliciousParams) {
      // Act
      await page.goto(`/search?q=${encodeURIComponent(payload)}`);

      // Assert: スクリプトが実行されていないこと
      const pageContent = await page.content();
      expect(pageContent).not.toContain('<script>alert');
      expect(pageContent).not.toContain('javascript:alert');
    }
  });

  test('DOM-based XSSが防止されること', async ({ page }) => {
    // Arrange
    const maliciousHash = '#<script>alert(1)</script>';

    // Act
    await page.goto(`/page${maliciousHash}`);

    // Assert
    const hasScript = await page.evaluate(() => {
      return document.body.innerHTML.includes('<script>alert');
    });
    expect(hasScript).toBe(false);
  });
});
```

## CSRF対策の検証

### CSRFトークン検証

```typescript
import { test, expect } from '@playwright/test';

test.describe('CSRF対策', () => {
  test('CSRFトークンなしのPOSTリクエストが拒否されること', async ({ request }) => {
    // CSRFトークンなしでPOSTリクエスト
    const response = await request.post('/api/posts', {
      data: { title: 'テスト投稿' },
      headers: {
        'Content-Type': 'application/json',
        // X-XSRF-TOKEN を意図的に省略
      },
    });

    // 419: CSRF Token Mismatch
    expect(response.status()).toBe(419);
  });

  test('CSRFトークン付きリクエストが成功すること', async ({ page, request }) => {
    // ページにアクセスしてCSRFトークンを取得
    await page.goto('/login');

    const csrfToken = await page.evaluate(() => {
      return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    });

    expect(csrfToken).toBeTruthy();

    // CSRFトークン付きでリクエスト
    const cookies = await page.context().cookies();
    const xsrfCookie = cookies.find(c => c.name === 'XSRF-TOKEN');

    if (xsrfCookie) {
      const response = await request.post('/api/posts', {
        data: { title: 'テスト投稿' },
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': decodeURIComponent(xsrfCookie.value),
        },
      });

      // 419以外のステータスコード（成功または認証エラー）
      expect(response.status()).not.toBe(419);
    }
  });

  test('異なるオリジンからのリクエストが拒否されること', async ({ request }) => {
    const response = await request.post('/api/posts', {
      data: { title: 'テスト投稿' },
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://malicious-site.com',
        'Referer': 'https://malicious-site.com/attack',
      },
    });

    // CORSまたはCSRFで拒否されること
    expect([403, 419]).toContain(response.status());
  });
});
```

## 認証・認可テスト

### 認証バイパステスト

```typescript
test.describe('認証テスト', () => {
  test('未認証ユーザーが保護ページにアクセスできないこと', async ({ page }) => {
    // 新しいコンテキストで認証なしでアクセス
    const context = await page.context().browser()!.newContext();
    const unauthPage = await context.newPage();

    // 保護されたページにアクセス
    await unauthPage.goto('/dashboard');

    // ログインページにリダイレクトされること
    await expect(unauthPage).toHaveURL(/login/);

    await context.close();
  });

  test('ログアウト後にセッションが無効化されること', async ({ page, laravel }) => {
    // ログイン
    const user = await laravel.factory('User');
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(user.email);
    await page.getByLabel('パスワード').fill('password');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page).toHaveURL(/dashboard/);

    // ログアウト
    await page.getByRole('button', { name: 'ログアウト' }).click();

    // 保護ページに再アクセス
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });
});
```

### 認可テスト（IDOR防止）

```typescript
test.describe('認可テスト', () => {
  test('他ユーザーのデータにアクセスできないこと', async ({ page, laravel }) => {
    // 2人のユーザーを作成
    const userA = await laravel.factory('User');
    const userB = await laravel.factory('User');
    const postB = await laravel.factory('Post', { user_id: userB.id });

    // ユーザーAでログイン
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(userA.email);
    await page.getByLabel('パスワード').fill('password');
    await page.getByRole('button', { name: 'ログイン' }).click();

    // ユーザーBの投稿を編集しようとする
    await page.goto(`/posts/${postB.id}/edit`);

    // 403 Forbiddenまたはリダイレクト
    await expect(page).toHaveURL(/forbidden|403|posts$/);
  });

  test('IDパラメータ改ざんが防止されること', async ({ page, laravel, request }) => {
    const user = await laravel.factory('User');
    const otherUser = await laravel.factory('User');

    // ログイン
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(user.email);
    await page.getByLabel('パスワード').fill('password');
    await page.getByRole('button', { name: 'ログイン' }).click();

    // 他ユーザーのプロフィールを更新しようとする
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session'));

    const response = await request.put(`/api/users/${otherUser.id}`, {
      data: { name: '改ざん名' },
      headers: {
        Cookie: `${sessionCookie?.name}=${sessionCookie?.value}`,
      },
    });

    expect([403, 404]).toContain(response.status());
  });
});
```

## セッション管理テスト

```typescript
test.describe('セッション管理', () => {
  test('ログイン成功時にセッションIDが再生成されること', async ({ page, laravel }) => {
    const user = await laravel.factory('User');

    // ログイン前のセッションID取得
    await page.goto('/login');
    const cookiesBefore = await page.context().cookies();
    const sessionBefore = cookiesBefore.find(c => c.name.includes('session'))?.value;

    // ログイン
    await page.getByLabel('メールアドレス').fill(user.email);
    await page.getByLabel('パスワード').fill('password');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page).toHaveURL(/dashboard/);

    // ログイン後のセッションID取得
    const cookiesAfter = await page.context().cookies();
    const sessionAfter = cookiesAfter.find(c => c.name.includes('session'))?.value;

    // セッションIDが変更されていること（セッション固定攻撃対策）
    expect(sessionAfter).not.toBe(sessionBefore);
  });

  test('セッションCookieにHttpOnly属性があること', async ({ page }) => {
    await page.goto('/login');

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session'));

    expect(sessionCookie?.httpOnly).toBe(true);
  });

  test('セッションCookieにSecure属性があること（本番環境）', async ({ page }) => {
    // 本番環境の場合のみテスト
    if (process.env.APP_ENV === 'production') {
      await page.goto('/login');

      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session'));

      expect(sessionCookie?.secure).toBe(true);
    }
  });
});
```

## テストデータのセキュリティ

### 機密データの取り扱い

```typescript
// ❌ 禁止: 本番データや実際のクレデンシャルを使用
const realApiKey = 'sk-live-xxx...';
const productionEmail = 'admin@production.com';

// ✅ 推奨: ファクトリーとフェイクデータを使用
test('ユーザー登録', async ({ laravel, page }) => {
  // ファクトリーが生成するランダムなデータを使用
  const uniqueEmail = `test-${Date.now()}@example.com`;

  await page.goto('/register');
  await page.getByLabel('メールアドレス').fill(uniqueEmail);
  await page.getByLabel('パスワード').fill('testpassword123');
  // ...
});

// ✅ 推奨: 環境変数でテスト用クレデンシャルを管理
const testConfig = {
  apiKey: process.env.TEST_API_KEY,
  adminEmail: process.env.TEST_ADMIN_EMAIL,
};
```

### テスト後のクリーンアップ

```typescript
test.afterEach(async ({ laravel }) => {
  // テストで作成したデータをクリーンアップ
  await laravel.query('DELETE FROM users WHERE email LIKE ?', ['test-%@example.com']);
});
```

## チェックリスト

### XSS対策確認項目

- [ ] ユーザー入力がHTMLエスケープされている
- [ ] URLパラメータがエスケープされている
- [ ] JavaScriptコンテキストで適切にエスケープされている
- [ ] `dangerouslySetInnerHTML`（React）にDOMPurifyが適用されている
- [ ] `{!! !!}`（Blade）にHTMLPurifierが適用されている

### CSRF対策確認項目

- [ ] 全てのPOST/PUT/PATCH/DELETEにCSRFトークンが必要
- [ ] CSRFトークンなしのリクエストが419エラーを返す
- [ ] 異なるオリジンからのリクエストが拒否される

### 認証・認可確認項目

- [ ] 未認証ユーザーが保護リソースにアクセスできない
- [ ] 他ユーザーのリソースにアクセスできない（IDOR防止）
- [ ] ログアウト後にセッションが無効化される
- [ ] セッションIDがログイン時に再生成される
