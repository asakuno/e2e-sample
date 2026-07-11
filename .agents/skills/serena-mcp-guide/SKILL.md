---
name: serena-mcp-guide
description: Serena MCPの使用ガイド。シンボルベースのコード編集、検索、リファクタリングのためのコマンドリファレンス。
---

# Serena MCP 使用ガイド

## 概要

Serena MCPはシンボルベースのコード編集を提供するMCPサーバー。関数、クラス、メソッド単位での精密な編集が可能。

## 基本原則

1. **シンボルレベルで編集**: ファイル全体ではなくシンボル単位で変更
2. **参照確認を先に**: 編集前に `find_referencing_symbols` で影響範囲を確認
3. **増分実装**: 大きな変更は小さなシンボル編集に分割

## コマンドリファレンス

### シンボル検索

#### find_symbol - シンボル検索

```
mcp__serena__find_symbol
name_path_pattern: 'SymbolName'      # 検索パターン
relative_path: 'src/path/'           # 検索範囲（省略可）
include_body: true                   # ソースコードを含める
depth: 1                             # 子要素の深さ
substring_matching: true             # 部分一致検索
```

**name_path_patternの指定方法**:
- 単純名: `"methodName"` - 任意の場所のシンボル
- 相対パス: `"ClassName/methodName"` - クラス内のメソッド
- 絶対パス: `"/ClassName/methodName"` - 完全一致

#### find_referencing_symbols - 参照検索

```
mcp__serena__find_referencing_symbols
name_path: 'targetSymbol'
relative_path: 'src/path/to/file.ts'  # 必須: ファイルパス
```

### シンボル編集

#### replace_symbol_body - シンボル置換

```
mcp__serena__replace_symbol_body
name_path: 'ComponentName/methodName'
relative_path: 'src/path/to/file.ts'
body: 'function methodName() {
  // 新しい実装
}'
```

**注意**: bodyにはシグネチャ行を含める。docstring/コメント/importsは含めない。

#### insert_after_symbol - シンボル後に挿入

```
mcp__serena__insert_after_symbol
name_path: 'ExistingSymbol'
relative_path: 'src/path/to/file.ts'
body: '
function newFunction() {
  // 新しいシンボル
}'
```

用途: 新しい関数、メソッド、クラスの追加

#### insert_before_symbol - シンボル前に挿入

```
mcp__serena__insert_before_symbol
name_path: 'FirstSymbol'
relative_path: 'src/path/to/file.ts'
body: 'import { something } from "somewhere"
'
```

用途: ファイル先頭へのimport追加など

#### rename_symbol - シンボル名変更

```
mcp__serena__rename_symbol
name_path: 'oldName'
relative_path: 'src/path/to/file.ts'
new_name: 'newName'
```

コードベース全体で自動的にリネーム。

### ファイル概要取得

#### get_symbols_overview - ファイル内シンボル一覧

```
mcp__serena__get_symbols_overview
relative_path: 'src/path/to/file.ts'
depth: 1  # 子要素の深さ
```

用途: ファイル構造の把握、編集対象の特定

### パターン検索

#### search_for_pattern - 正規表現検索

```
mcp__serena__search_for_pattern
substring_pattern: 'searchPattern'
relative_path: 'src/'                      # 検索範囲
restrict_search_to_code_files: true        # コードファイルのみ
context_lines_before: 2
context_lines_after: 2
```

用途: シンボル名が不明な場合の探索

## ワークフロー例

### 既存メソッドの修正

```
# 1. シンボルを検索して現状把握
mcp__serena__find_symbol
name_path_pattern: 'ClassName/methodName'
relative_path: 'src/'
include_body: true

# 2. 参照箇所を確認
mcp__serena__find_referencing_symbols
name_path: 'ClassName/methodName'
relative_path: 'src/path/to/file.ts'

# 3. シンボルを置換
mcp__serena__replace_symbol_body
name_path: 'ClassName/methodName'
relative_path: 'src/path/to/file.ts'
body: '...'
```

### 新しいメソッドの追加

```
# 1. ファイル構造を確認
mcp__serena__get_symbols_overview
relative_path: 'src/path/to/file.ts'
depth: 1

# 2. 既存メソッドの後に挿入
mcp__serena__insert_after_symbol
name_path: 'ClassName/existingMethod'
relative_path: 'src/path/to/file.ts'
body: '
  newMethod() {
    // 実装
  }'
```

## トラブルシューティング

### シンボルが見つからない

```
# substring_matchingで部分一致検索
mcp__serena__find_symbol
name_path_pattern: 'partialName'
relative_path: 'src/'
substring_matching: true

# または正規表現で検索
mcp__serena__search_for_pattern
substring_pattern: 'partialName'
relative_path: 'src/'
```

### 編集結果の確認

Serenaのシンボル編集ツールはエラーなく返れば成功。追加の確認は不要。
