# TypeScript型生成

## 概要

PHP側で定義したDTO、Model、Enumの型をTypeScriptに自動生成し、フロントエンド/バックエンド間の型安全性を確保する。

---

## 必要なパッケージ

```bash
# Laravel Data（DTO + バリデーション + TypeScript型生成）
composer require spatie/laravel-data
composer require spatie/laravel-typescript-transformer

# Model型生成
composer require --dev fumeapp/modeltyper
```

---

## 1. Laravel Data による DTO 型生成

### DTO定義

DTOに `#[TypeScript()]` アトリビュートを付与すると、TypeScriptの型として生成される。

```php
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
class PostData extends Data
{
    public function __construct(
        public int $userId,
        #[Max(255)]
        public string $title,
        #[Max(1000)]
        public ?string $body,
        /** @var array<PostTagData> */
        #[DataCollectionOf(PostTagData::class)]
        public array $tags,
    ) {}
}
```

### 生成されるTypeScript型

```typescript
// resources/js/types/generated.d.ts
declare namespace App.Data {
  export type PostData = {
    user_id: number;
    title: string;
    body?: string;
    tags: Array<App.Data.PostTagData>;
  };
}
```

---

## 2. modeltyper による Model 型生成

### インストール

```bash
composer require --dev fumeapp/modeltyper
```

### 型生成コマンド

```bash
php artisan model:typer ./resources/js/types/model.d.ts
```

### 生成結果

```typescript
// resources/js/types/model.d.ts
export interface Post {
  // columns
  id: number
  user_id: number
  title: string
  body: string
  created_at: string | null
  updated_at: string | null
  // relations
  user: User
  tags: PostTag[]
  // counts
  tags_count: number
  // exists
  user_exists: boolean
  tags_exists: boolean
}
```

### Model側での型の上書き

Model側で `$interfaces` プロパティを定義することで、TypeScript型を上書きできる。

```php
class PostTag extends Model
{
    protected $fillable = ['name', 'color'];

    // TypeScript型の上書き
    public array $interfaces = [
        'color' => [
            'type' => "'red' | 'blue' | 'green'",
        ],
    ];
}
```

---

## 3. 統合された型生成（ModelTransformer）

### なぜカスタムトランスフォーマーが必要か

標準の `spatie/laravel-typescript-transformer` と `fumeapp/modeltyper` を個別に使用する場合、以下の問題が発生する：

| 問題 | 詳細 |
|------|------|
| **別々のコマンド実行が必要** | `php artisan typescript:transform` と `php artisan model:typer` を個別に実行 |
| **出力ファイルの分離** | `generated.d.ts` と `model.d.ts` が別ファイルになり、インポート管理が煩雑 |
| **名前空間の不整合** | DTO は `App.Data.*`、Model は `export interface` とフォーマットが異なる |
| **リレーション型の不一致** | Model 型でリレーション先の型参照が正しく解決されない |

### カスタムトランスフォーマーのメリット

| メリット | 詳細 |
|---------|------|
| **単一コマンド** | `php artisan typescript:transform` で全型（DTO + Model + Enum）を一括生成 |
| **統一された出力** | `generated.d.ts` に全ての型が `declare namespace` 形式で出力 |
| **名前空間の統一** | `App.Models.*`, `App.Data.*`, `App.Enums.*` で一貫した参照 |
| **リレーション型の正確な解決** | Model 間のリレーション型が正しい名前空間で参照される |

### 代替手段との比較

| 方法 | 長所 | 短所 |
|------|------|------|
| **カスタムTransformer（採用）** | 単一コマンド、統一フォーマット | メンテナンスが必要 |
| **個別ツール使用** | 標準機能のみ | 複数コマンド、フォーマット不整合 |
| **手動型定義** | 完全な制御 | 型の同期が手動、ミスの温床 |

**結論**: 開発効率と型安全性のバランスから、カスタムトランスフォーマーを採用。ただし、将来的に公式ツールが統合機能を提供した場合は移行を検討する。

### カスタムトランスフォーマーの作成

TypeScript Transformerとmodeltyperを統合し、単一のコマンドで全ての型を生成する。

**app/Utils/ModelTransformer.php**

```php
<?php

namespace App\Utils;

use FumeApp\ModelTyper\Actions\Generator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use ReflectionClass;
use Spatie\TypeScriptTransformer\Structures\TransformedType;
use Spatie\TypeScriptTransformer\Transformers\Transformer;
use Spatie\TypeScriptTransformer\TypeScriptTransformerConfig;
use FumeApp\ModelTyper\Overrides\ModelInspector;

class ModelTransformer implements Transformer
{
    public function __construct(protected TypeScriptTransformerConfig $config)
    {
    }

    public function transform(ReflectionClass $class, string $name): ?TransformedType
    {
        if (! $class->isSubclassOf(Model::class)) {
            return null;
        }

        // (1) 利用 Class を集める
        $inspector = app(ModelInspector::class);
        $inspect = $inspector->inspect($class->getName());

        $modelMaps = collect()
            ->merge(collect(data_get($inspect, 'attributes'))->pluck('cast'))
            ->merge(collect(data_get($inspect, 'relations'))->pluck('related'))
            ->filter(fn ($attr) => Str::of($attr)->test('/^[A-Z]/'))
            ->unique()
            ->mapWithKeys(fn ($attr) => [
                Str::of($attr)->afterLast('\\')->toString() =>
                Str::of($attr)->replace('\\', '.')->toString()
            ]);

        // (2) Model to Type
        $modelTyper = app(Generator::class)(
            specificModel: $class->getName(),
        );

        // type を成型する
        $format = Str::of($modelTyper)
            ->replaceMatches('/export interface \w+ /s', '')
            ->replaceMatches('/.const.*/s', '')
            ->replaceMatches('/(\n|\r\n|\r)$/s', '')
            ->replaceMatches('/ ([A-Z]\w*)/', fn ($match) =>
                ' '.$modelMaps->get(data_get($match, 1), data_get($match, 1),)
            );

        return TransformedType::create(
            $class,
            $name,
            $format,
        );
    }
}
```

### Modelへの #[TypeScript()] 付与

```php
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
class Post extends Model
{
    // ...
}
```

---

## 4. TypeScript Transformer設定

### config/typescript-transformer.php

```php
return [
    'transformers' => [
        App\Utils\ModelTransformer::class,
        Spatie\LaravelTypeScriptTransformer\Transformers\SpatieStateTransformer::class,
        Spatie\TypeScriptTransformer\Transformers\EnumTransformer::class,
        Spatie\LaravelTypeScriptTransformer\Transformers\DtoTransformer::class,
    ],

    'output_file' => resource_path('js/types/generated.d.ts'),

    'writer' => Spatie\TypeScriptTransformer\Writers\TypeDefinitionWriter::class,

    'transform_to_native_enums' => false,

    'transform_null_to_optional' => true,
];
```

---

## 5. Enum型生成

### PHP Enum定義

```php
enum PostStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';

    public function label(): string
    {
        return match($this) {
            self::Draft => 'Draft',
            self::Submitted => 'Submitted',
        };
    }
}
```

### 生成されるTypeScript型

```typescript
declare namespace App.Enums {
  export type PostStatus = 'draft' | 'submitted';
}
```

---

## 型生成コマンド

### 統合型生成

```bash
# DTO + Model + Enum を一括生成
php artisan typescript:transform
```

**生成結果（resources/js/types/generated.d.ts）**

```typescript
declare namespace App.Data {
  export type PostData = {
    user_id: number;
    title: string;
    body?: string;
    tags: Array<App.Data.PostTagData>;
  };
}

declare namespace App.Models {
  export type Post = {
    id: number
    user_id: number
    title: string
    body: string
    created_at: string | null
    updated_at: string | null
    user: App.Models.User
    tags: App.Models.PostTag[]
    tags_count: number
    user_exists: boolean
    tags_exists: boolean
  };
}

declare namespace App.Enums {
  export type PostStatus = 'draft' | 'submitted';
}
```

---

## React側での使用

### 型のインポート

```tsx
import { FC } from 'react';

interface Props {
  post: App.Models.Post;
  statuses: App.Enums.PostStatus[];
}

const PostDetail: FC<Props> = ({ post, statuses }) => {
  return (
    <div>
      <h1>{post.title}</h1>
      <p>Status: {post.status}</p>
      <p>Owner: {post.user.name}</p>
    </div>
  );
};

export default PostDetail;
```

### フォームでの使用

```tsx
import { useForm } from 'laravel-precognition-react';
import { store } from '@/routes/weekly-reports';

const PostCreate = () => {
  const form = useForm<App.Data.CreatePostData>(
    'post',
    store().url,
    {
      userId: 0,
      weekStartDate: '',
      title: '',
      memo: undefined,
      status: 'draft',
      tagValues: [],
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.submit();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={form.data.title}
        onChange={(e) => form.setData('title', e.target.value)}
        onBlur={() => form.validate('title')}
      />
      {form.errors.title && <p>{form.errors.title}</p>}

      <button type="submit" disabled={form.processing}>
        {form.processing ? '処理中...' : '作成'}
      </button>
    </form>
  );
};

export default PostCreate;
```

---

## 開発ワークフロー

### 型生成のタイミング

```bash
# 1. マイグレーション実行後、Model型を生成
php artisan migrate

# 2. 統合型生成（DTO + Model + Enum）
php artisan typescript:transform

# 3. Wayfinderルート生成
php artisan wayfinder:generate

# 4. フロントエンドビルド
npm run build
```

### ウォッチモード（開発時）

**package.json**に追加:

```json
{
  "scripts": {
    "type:watch": "watch 'php artisan typescript:transform' app/"
  }
}
```

```bash
npm run type:watch
```

---

## ベストプラクティス

### 1. 型定義の一貫性

PHP側で型を明示的に定義すれば、TypeScript側も正確に生成される。

```php
// ✅ Good: 明示的な型定義
public function __construct(
    public readonly int $userId,
    public readonly ?string $memo,
) {}

// ❌ Bad: 型定義なし
public function __construct(
    public $userId,
    public $memo,
) {}
```

### 2. Nullableの統一

PHP側の `?` と TypeScript側の `?` を一致させる。

```php
// PHP
public readonly ?string $memo,

// TypeScript（自動生成）
memo?: string;
```

### 3. 配列型の明示

PHPDoc で配列の型を明示する。

```php
/** @var array<TagValueData> */
#[DataCollectionOf(TagValueData::class)]
public readonly array $tagValues,

// TypeScript
tag_values: Array<App.Data.TagValueData>;
```

### 4. Enum型の使用

文字列リテラルの代わりに Enum を使用する。

```php
// ✅ Good: Enum使用
public readonly PostStatus $status,

// ❌ Bad: 文字列
public readonly string $status,
```

### 5. 型生成の自動化

CI/CDパイプラインに組み込む。

```yaml
# .github/workflows/ci.yml
- name: Generate TypeScript types
  run: |
    php artisan typescript:transform
    git diff --exit-code resources/js/types/generated.d.ts
```

---

## トラブルシューティング

### 型が生成されない場合

1. **#[TypeScript()] を確認**

```php
#[TypeScript()]  // 必須
class Post extends Model
```

2. **Transformerの順序を確認**

```php
// config/typescript-transformer.php
'transformers' => [
    App\Utils\ModelTransformer::class,  // 最初に配置
    // ...
],
```

3. **キャッシュクリア**

```bash
php artisan config:clear
php artisan typescript:transform
```

### 型が正しくない場合

**型の上書き**を使用:

```php
class Post extends Model
{
    public array $interfaces = [
        'status' => [
            'type' => "App.Enums.PostStatus",
        ],
    ];
}
```

### ビルドエラー

```bash
# TypeScript型エラーの確認
npm run typecheck

# 型定義ファイルの再生成
php artisan typescript:transform
```
