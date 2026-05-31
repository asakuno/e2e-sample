#!/bin/bash
# スキル構造の検証スクリプト
# 全スキルのSKILL.mdとreferencesファイルの整合性を検証する
set -e

SKILLS_DIR=".claude/skills"
errors=0
warnings=0

echo "🔍 スキル構造を検証中..."

for skill_dir in "$SKILLS_DIR"/*/; do
  skill_name=$(basename "$skill_dir")
  skill_md="${skill_dir}SKILL.md"

  # SKILL.mdの存在確認
  if [ ! -f "$skill_md" ]; then
    echo "❌ ERROR: SKILL.md が見つかりません: $skill_dir"
    ((errors++))
    continue
  fi

  # Required Referencesセクションの存在確認
  if ! grep -q "## Required References" "$skill_md"; then
    echo "⚠️  WARNING: 'Required References' セクションがありません: $skill_md"
    ((warnings++))
  fi

  # 参照ファイルの存在確認（一時ファイルを使用）
  grep -oP '`references/[^`*]+\.md`' "$skill_md" 2>/dev/null | sed 's/`//g' | sort -u > /tmp/refs_$$.txt || true
  while read -r ref; do
    [ -z "$ref" ] && continue
    ref_path="${skill_dir}${ref}"
    if [ ! -f "$ref_path" ]; then
      echo "❌ ERROR: 参照ファイルが見つかりません: $ref_path (参照元: $skill_md)"
      ((errors++))
    fi
  done < /tmp/refs_$$.txt
  rm -f /tmp/refs_$$.txt
done

echo ""
echo "📊 検証結果: エラー $errors 件、警告 $warnings 件"

if [ "$errors" -gt 0 ]; then
  echo "❌ 検証失敗: $errors 件のエラーが見つかりました"
  exit 1
else
  echo "✅ すべてのスキルの検証に成功しました"
  [ "$warnings" -gt 0 ] && echo "⚠️  $warnings 件の警告があります（無視可能）"
  exit 0
fi
