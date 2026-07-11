import type React from 'react';
import { Button } from '@/components/ui/button';
import type { WatchlistPriorityOption } from '@/types/watchlist';

interface WatchlistMemoFormProps {
  memo: string;
  priority: number;
  priorityOptions: WatchlistPriorityOption[];
  processing?: boolean | undefined;
  memoError?: string | undefined;
  priorityError?: string | undefined;
  onMemoChange: (memo: string) => void;
  onPriorityChange: (priority: number) => void;
  onMemoBlur?: (() => void) | undefined;
  onPriorityBlur?: (() => void) | undefined;
  onSubmit: () => void;
  onCancel: () => void;
}

export function WatchlistMemoForm({
  memo,
  priority,
  priorityOptions,
  processing = false,
  memoError,
  priorityError,
  onMemoChange,
  onPriorityChange,
  onMemoBlur,
  onPriorityBlur,
  onSubmit,
  onCancel,
}: WatchlistMemoFormProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div>
        <label htmlFor="watchlist-memo" className="mb-2 block font-medium text-gray-700 text-sm">
          メモ
        </label>
        <textarea
          id="watchlist-memo"
          value={memo}
          onChange={(event) => onMemoChange(event.target.value)}
          onBlur={onMemoBlur}
          rows={4}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm shadow-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
        />
        {memoError != null && <p className="mt-1 text-red-600 text-sm">{memoError}</p>}
      </div>

      <div>
        <label
          htmlFor="watchlist-priority"
          className="mb-2 block font-medium text-gray-700 text-sm"
        >
          優先度
        </label>
        <select
          id="watchlist-priority"
          value={priority}
          onChange={(event) => onPriorityChange(Number(event.target.value))}
          onBlur={onPriorityBlur}
          className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 text-sm shadow-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
        >
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {priorityError != null && <p className="mt-1 text-red-600 text-sm">{priorityError}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" disabled={processing} aria-busy={processing || undefined}>
          {processing ? '保存中...' : '保存'}
        </Button>
      </div>
    </form>
  );
}
