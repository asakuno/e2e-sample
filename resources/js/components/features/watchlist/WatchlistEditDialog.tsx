import { useForm } from '@inertiajs/react';
import { useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { update } from '@/routes/watchlist';
import type { WatchlistItem, WatchlistPriorityOption } from '@/types/watchlist';
import { WatchlistMemoForm } from './WatchlistMemoForm';

interface WatchlistEditDialogProps {
  item: WatchlistItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WatchlistUpdateFormData {
  memo: string;
  priority: number;
}

interface WatchlistEditDialogFormProps {
  item: WatchlistItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const priorityOptions: WatchlistPriorityOption[] = [
  { value: 1, label: '低' },
  { value: 2, label: '中' },
  { value: 3, label: '高' },
];

export function WatchlistEditDialog({ item, open, onOpenChange }: WatchlistEditDialogProps) {
  if (item == null) {
    return null;
  }

  return (
    <WatchlistEditDialogForm key={item.id} item={item} open={open} onOpenChange={onOpenChange} />
  );
}

function WatchlistEditDialogForm({ item, open, onOpenChange }: WatchlistEditDialogFormProps) {
  const action = update(item.id);
  const [isPending, startTransition] = useTransition();
  const form = useForm<WatchlistUpdateFormData>({
    memo: item.memo ?? '',
    priority: item.priority,
  }).withPrecognition(action.method, action.url);

  const handleSubmit = () => {
    startTransition(async () => {
      await new Promise<void>((resolve) => {
        form.submit(action, {
          preserveScroll: true,
          onSuccess: () => onOpenChange(false),
          onFinish: () => resolve(),
        });
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{item.stock.symbol} のメモ編集</DialogTitle>
          <DialogDescription>ウォッチリストのメモと優先度を更新します。</DialogDescription>
        </DialogHeader>

        <WatchlistMemoForm
          memo={form.data.memo}
          priority={form.data.priority}
          priorityOptions={priorityOptions}
          processing={form.processing || isPending}
          memoError={form.errors.memo}
          priorityError={form.errors.priority}
          onMemoChange={(memo) => form.setData('memo', memo)}
          onPriorityChange={(priority) => form.setData('priority', priority)}
          onMemoBlur={() => form.validate('memo')}
          onPriorityBlur={() => form.validate('priority')}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
