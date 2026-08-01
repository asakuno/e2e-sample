import { Search } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { index as stocksIndex } from '@/routes/stocks';

export function WatchlistEmptyState() {
  return (
    <div className="rounded-lg border border-border bg-card p-10 text-center text-card-foreground shadow-sm">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
        <Search aria-hidden="true" className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-4 font-medium">監視銘柄がありません</p>
      <p className="mt-2 text-muted-foreground text-sm">
        銘柄一覧から気になる銘柄をウォッチリストに追加してください。
      </p>
      <Link
        href={stocksIndex.url()}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-[background-color,transform] duration-motion-fast ease-standard hover:bg-primary/90 active:translate-y-px focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 motion-reduce:active:translate-y-0 data-[loading]:opacity-70"
      >
        銘柄を探す
      </Link>
    </div>
  );
}
