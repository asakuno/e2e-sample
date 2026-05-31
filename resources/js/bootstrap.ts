/**
 * アプリケーション初期化処理
 *
 * Axiosの設定、CSRF対策、その他の初期化処理を行います。
 */
import axios from 'axios';

// グローバルオブジェクトにaxiosを設定（レガシーサポート用）
declare global {
  interface Window {
    axios: typeof axios;
  }
}

window.axios = axios;

// Axios デフォルト設定
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.headers.common.Accept = 'application/json';

// CSRF対策: withCredentialsを有効化してCookieを送信
window.axios.defaults.withCredentials = true;

// XSRFトークン設定（Laravel Sanctum対応）
window.axios.defaults.withXSRFToken = true;
