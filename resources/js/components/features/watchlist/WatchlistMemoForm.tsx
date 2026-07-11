import type React from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, FieldLabel, fieldControlVariants } from '@/components/ui/field';
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
  const memoErrorId = 'watchlist-memo-error';
  const priorityErrorId = 'watchlist-priority-error';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div>
        <FieldLabel htmlFor="watchlist-memo">メモ</FieldLabel>
        <textarea
          id="watchlist-memo"
          value={memo}
          onChange={(event) => onMemoChange(event.target.value)}
          onBlur={onMemoBlur}
          disabled={processing}
          aria-invalid={memoError != null}
          aria-describedby={memoError != null ? memoErrorId : undefined}
          rows={4}
          className={fieldControlVariants({ invalid: memoError != null, kind: 'textarea' })}
        />
        {memoError != null && <FieldError id={memoErrorId}>{memoError}</FieldError>}
      </div>

      <div>
        <FieldLabel htmlFor="watchlist-priority">優先度</FieldLabel>
        <select
          id="watchlist-priority"
          value={priority}
          onChange={(event) => onPriorityChange(Number(event.target.value))}
          onBlur={onPriorityBlur}
          disabled={processing}
          aria-invalid={priorityError != null}
          aria-describedby={priorityError != null ? priorityErrorId : undefined}
          className={fieldControlVariants({ invalid: priorityError != null })}
        >
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {priorityError != null && <FieldError id={priorityErrorId}>{priorityError}</FieldError>}
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
