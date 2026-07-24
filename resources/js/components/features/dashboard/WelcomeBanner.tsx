/** ダッシュボードのページヘッダー。 */

import { formatJstDateTime } from '@/lib/formatters';

interface WelcomeBannerProps {
  userName: string;
  latestAnalysisAt?: string | null;
}

export function WelcomeBanner({ userName, latestAnalysisAt }: WelcomeBannerProps) {
  const userContext = userName.trim() === '' ? '' : `${userName}さんの`;

  return (
    <header className="flex flex-col gap-3 border-border border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
          マーケットダッシュボード
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground text-sm sm:text-base">
          {userContext}ウォッチ銘柄と最新ニュースから、現在の確認候補をまとめています。
        </p>
      </div>

      {latestAnalysisAt != null && (
        <p className="shrink-0 text-muted-foreground text-sm tabular-nums">
          最新分析日時:{' '}
          <time className="text-foreground" dateTime={latestAnalysisAt}>
            {formatJstDateTime(latestAnalysisAt)}
          </time>
        </p>
      )}
    </header>
  );
}
