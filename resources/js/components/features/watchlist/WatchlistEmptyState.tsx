import { Search } from 'lucide-react';
import { ActionLink } from '@/components/ui/ActionLink';
import { visitAction } from '@/lib/inertia-actions';
import { index as stocksIndex } from '@/routes/stocks';

export function WatchlistEmptyState() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gray-100">
        <Search aria-hidden="true" className="size-5 text-gray-500" />
      </div>
      <p className="mt-4 font-medium text-gray-900">監視銘柄がありません</p>
      <p className="mt-2 text-gray-500 text-sm">
        銘柄一覧から気になる銘柄をウォッチリストに追加してください。
      </p>
      <ActionLink
        href={stocksIndex.url()}
        action={visitAction(stocksIndex.url())}
        pendingClassName="opacity-70"
        className="mt-5 inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 font-medium text-sm text-white transition hover:bg-gray-700"
      >
        銘柄を探す
      </ActionLink>
    </div>
  );
}
