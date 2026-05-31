/**
 * Vitest セットアップファイル
 *
 * テスト実行前に読み込まれる設定ファイルです。
 * グローバルなテストユーティリティやモック設定を行います。
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * 各テスト後にクリーンアップを実行
 * DOMの状態をリセットし、テスト間の影響を防ぎます
 */
afterEach(() => {
  cleanup();
});

/**
 * グローバルなテストユーティリティやモックをここに追加
 */
