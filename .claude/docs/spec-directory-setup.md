# 仕様書ディレクトリのセットアップとファイル名生成

## ディレクトリ作成

`.claude/specs/` ディレクトリを作成（存在しない場合）:

```bash
mkdir -p .claude/specs
```

## ファイル名の生成

以下の形式でファイル名を生成してください：

- **タイムスタンプ**: `$(date +%Y%m%d-%H%M%S)`（Bashで実行）
- **スラグ**: $ARGUMENTSから生成（小文字、ハイフン区切り）
- **パス**: `.claude/specs/{タイムスタンプ}-{slug}.md`

実行例:
```bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SLUG="user-management-feature"
FILENAME=".claude/specs/${TIMESTAMP}-${SLUG}.md"
```
