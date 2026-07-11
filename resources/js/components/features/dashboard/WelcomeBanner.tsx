/**
 * ウェルカムバナーコンポーネント
 *
 * ログイン後のユーザーへの挨拶メッセージを表示する。
 */

interface WelcomeBannerProps {
  userName: string;
}

export function WelcomeBanner({ userName }: WelcomeBannerProps) {
  return (
    <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
      <h2 className="font-bold text-xl">マーケットダッシュボード</h2>
      <p className="mt-1 text-primary-foreground/80">
        {userName}さんのウォッチ銘柄、主要指数、最新ニュースを確認できます。
      </p>
    </div>
  );
}
