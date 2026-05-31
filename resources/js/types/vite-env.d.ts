/// <reference types="vite/client" />

/**
 * Vite環境変数の型定義
 */
interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  // 他の環境変数を追加する場合はここに定義
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
