import { ArrowRight, CircleCheck } from 'lucide-react';
import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import { StatusBadge } from '@/components/ui/status-badge';
import { Surface } from '@/components/ui/surface';
import { index as newsIndex } from '@/routes/news';
import { index as stocksIndex } from '@/routes/stocks';
import type { DashboardPriorityFeedItem } from './priority-feed-presentation';

interface DashboardPriorityFeedProps {
  items: DashboardPriorityFeedItem[];
}

interface DashboardPriorityFeedRowProps {
  item: DashboardPriorityFeedItem;
}

function DashboardPriorityFeedRow({ item }: DashboardPriorityFeedRowProps) {
  const content = (
    <span className="min-w-0">
      <StatusBadge variant={item.variant}>{item.label}</StatusBadge>
      <span className="mt-2 line-clamp-2 font-semibold text-sm sm:text-base">{item.title}</span>
      <span className="mt-1 line-clamp-2 text-muted-foreground text-sm leading-6">
        {item.description}
      </span>
      {item.meta != null && (
        <span className="mt-2 block text-muted-foreground text-xs tabular-nums">{item.meta}</span>
      )}
    </span>
  );

  if (item.href === undefined) {
    return (
      <div className="grid min-h-11 grid-cols-[minmax(0,1fr)] items-start rounded-lg border border-transparent p-3 text-card-foreground sm:p-4">
        {content}
      </div>
    );
  }

  return (
    <InertiaActionLink
      href={item.href}
      pendingClassName="opacity-70"
      className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-transparent p-3 text-card-foreground transition-[background-color,border-color,transform] duration-motion-fast ease-standard hover:border-border hover:bg-muted/60 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:active:translate-y-0 sm:p-4"
    >
      {content}
      <ArrowRight aria-hidden="true" className="mt-1 size-5 text-muted-foreground" />
    </InertiaActionLink>
  );
}

export function DashboardPriorityFeed({ items }: DashboardPriorityFeedProps) {
  return (
    <Surface asChild radius="xl">
      <section aria-labelledby="dashboard-priority-feed-heading">
        <header className="border-border border-b px-5 py-4 sm:px-6">
          <h2
            id="dashboard-priority-feed-heading"
            className="font-semibold text-card-foreground text-lg"
          >
            現在の確認候補
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            重要ニュース、シグナル、分析待ちから代表項目を合計最大3件表示しています。
          </p>
        </header>

        {items.length === 0 ? (
          <div className="px-5 py-8 sm:px-6">
            <div className="flex flex-col items-center rounded-lg bg-positive-muted/60 px-5 py-7 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-card text-positive ring-1 ring-positive/20">
                <CircleCheck aria-hidden="true" className="size-5" />
              </span>
              <p className="mt-4 font-medium text-card-foreground">
                現時点で確認する項目はありません
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                新しい確認項目があると、ここに表示されます。
              </p>
              <InertiaActionLink
                href={stocksIndex.url()}
                pendingClassName="opacity-70"
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 font-medium text-card-foreground text-sm transition-[background-color,color,transform] duration-motion-fast ease-standard hover:bg-accent hover:text-accent-foreground active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:active:translate-y-0"
              >
                銘柄を探す
                <ArrowRight aria-hidden="true" className="size-4" />
              </InertiaActionLink>
            </div>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-2 p-3 sm:p-4">
              {items.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <DashboardPriorityFeedRow item={item} />
                </li>
              ))}
            </ul>

            <footer className="flex flex-wrap justify-end gap-1 border-border border-t px-5 py-3 sm:px-6">
              <InertiaActionLink
                href={newsIndex.url()}
                pendingClassName="opacity-70"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 font-medium text-primary text-sm transition-[background-color,color,transform] duration-motion-fast ease-standard hover:bg-accent hover:text-accent-foreground active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:active:translate-y-0"
              >
                ニュース一覧
                <ArrowRight aria-hidden="true" className="size-4" />
              </InertiaActionLink>
              <InertiaActionLink
                href={stocksIndex.url()}
                pendingClassName="opacity-70"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 font-medium text-primary text-sm transition-[background-color,color,transform] duration-motion-fast ease-standard hover:bg-accent hover:text-accent-foreground active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:active:translate-y-0"
              >
                銘柄一覧
                <ArrowRight aria-hidden="true" className="size-4" />
              </InertiaActionLink>
            </footer>
          </>
        )}
      </section>
    </Surface>
  );
}
