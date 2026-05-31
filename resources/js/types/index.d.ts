/**
 * グローバル型定義
 *
 * Inertia.jsページコンポーネントで使用する共通の型を定義します。
 * 自動生成される型はgenerated.d.tsとmodel.d.tsで定義されます。
 */

/**
 * 認証情報
 */
export interface Auth {
  user: App.Models.User | null;
}

/**
 * フラッシュメッセージ
 */
export interface Flash {
  success?: string;
  error?: string;
  warning?: string;
  info?: string;
}

/**
 * ページコンポーネント共通Props
 *
 * すべてのInertia.jsページコンポーネントで利用可能な共有データを定義します。
 *
 * @example
 * interface IndexPageProps extends AppPageProps<{ users: User[] }> {}
 */
export interface AppPageProps<T extends Record<string, unknown> = Record<string, unknown>>
  extends T {
  app: {
    name: string;
    env: string;
    locale: string;
  };
  auth: Auth;
  flash: Flash;
  errors: Record<string, string[]>;
}

/**
 * ページネーション情報
 */
export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

/**
 * ページネーション付きデータ
 */
export interface PaginatedData<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

/**
 * API エラーレスポンス
 */
export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

/**
 * API 成功レスポンス
 */
export interface ApiSuccessResponse<T = unknown> {
  data: T;
  message?: string;
}

/**
 * フォームバリデーションエラー
 *
 * Laravelのバリデーションエラーは配列形式で返されるため、
 * 各フィールドに対して複数のエラーメッセージを保持できる配列型を使用します。
 */
export interface ValidationErrors {
  [field: string]: string[];
}
