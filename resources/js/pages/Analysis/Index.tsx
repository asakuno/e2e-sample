import { Head } from '@inertiajs/react';
import { ArrowRight, Plus } from 'lucide-react';
import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import { StatusBadge } from '@/components/ui/status-badge';
import { Surface } from '@/components/ui/surface';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { create, show } from '@/routes/analysis';
import type { AnalysisIndexPageProps } from '@/types/analysis';

export default function AnalysisIndex({ batches, pagination }: AnalysisIndexPageProps) {
  return (
    <>
      <Head title="Analysis" />
      <AuthenticatedLayout>
        <div className="flex flex-col gap-6">
          <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-bold text-2xl text-foreground">期間ニュース分析</h1>
              <p className="mt-1 max-w-3xl text-muted-foreground text-sm">
                取得済みニュースを期間単位で固定し、ChatGPTで検討した最終CSVをrevisionとして管理します。
              </p>
            </div>
            <InertiaActionLink
              href={create.url()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
            >
              <Plus aria-hidden="true" className="size-4" />
              新しい分析
            </InertiaActionLink>
          </header>

          {batches.length === 0 ? (
            <Surface tone="dashed" padding="lg" className="py-14 text-center">
              <h2 className="font-semibold text-lg">分析バッチはまだありません</h2>
              <p className="mt-2 text-muted-foreground text-sm">
                ウォッチリスト銘柄と期間を選び、最初の分析材料を準備してください。
              </p>
            </Surface>
          ) : (
            <div className="grid gap-3">
              {batches.map((batch) => (
                <InertiaActionLink
                  key={batch.public_id}
                  href={show.url(batch.public_id)}
                  className="group grid min-h-11 gap-4 rounded-lg border border-border bg-card p-4 shadow-xs transition-colors hover:border-ring/50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-card-foreground">
                        {batch.stock.symbol} {batch.stock.name}
                      </span>
                      <StatusBadge variant={batch.status === 3 ? 'positive' : 'info'}>
                        {batch.status_label}
                      </StatusBadge>
                      {batch.current_revision != null && (
                        <span className="text-muted-foreground text-xs">
                          revision {batch.current_revision}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-muted-foreground text-sm tabular-nums">
                      {batch.period_start}〜{batch.period_end} ・ {batch.news_count}件 ・{' '}
                      {batch.source_char_count.toLocaleString()}文字
                    </p>
                    <p className="mt-1 truncate font-mono text-muted-foreground text-xs">
                      {batch.public_id} / {batch.prompt_version}
                    </p>
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1"
                  />
                </InertiaActionLink>
              ))}
            </div>
          )}

          {pagination.last_page > 1 && (
            <nav className="flex items-center justify-between" aria-label="分析一覧ページ">
              <InertiaActionLink
                href={pagination.prev ?? '#'}
                aria-disabled={pagination.prev == null}
                className="rounded-md border border-border px-4 py-2 text-sm aria-disabled:pointer-events-none aria-disabled:opacity-40"
              >
                前へ
              </InertiaActionLink>
              <span className="text-muted-foreground text-sm tabular-nums">
                {pagination.current_page} / {pagination.last_page}
              </span>
              <InertiaActionLink
                href={pagination.next ?? '#'}
                aria-disabled={pagination.next == null}
                className="rounded-md border border-border px-4 py-2 text-sm aria-disabled:pointer-events-none aria-disabled:opacity-40"
              >
                次へ
              </InertiaActionLink>
            </nav>
          )}
        </div>
      </AuthenticatedLayout>
    </>
  );
}
