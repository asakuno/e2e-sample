/**
 * ログアウト確認モーダルコンポーネント
 *
 * shadcn/ui Dialog を利用し、操作前に確認を求める。
 */
import { useActionRunner, type ActionCallback } from '@/components/ui/ActionScope';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AppIcon } from '@/components/ui/AppIcon';

type LogoutModalProps = {
  open: boolean;
  onClose: () => void;
  action: ActionCallback;
  processing?: boolean;
};

export function LogoutModal({ open, onClose, action, processing }: LogoutModalProps) {
  const { isPending, runAction } = useActionRunner();
  const isProcessing = Boolean(processing || isPending);

  const handleLogout = () => {
    runAction(action);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-overlay motion-reduce:animate-none"
        className="max-w-sm gap-6 border-border bg-popover p-6 text-popover-foreground shadow-xl motion-reduce:animate-none sm:p-7"
      >
        <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <AppIcon name="logout" className="size-5" />
        </div>

        <div className="grid gap-2">
          <DialogTitle>ログアウトしますか？</DialogTitle>
          <DialogDescription className="leading-6">
            現在のセッションを終了し、ログイン画面へ戻ります。
          </DialogDescription>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="min-h-11 rounded-lg border border-border bg-background px-4 font-medium text-foreground text-sm transition-[background-color,color,transform] duration-motion-fast hover:bg-accent hover:text-accent-foreground active:translate-y-px motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isProcessing}
            aria-busy={isProcessing || undefined}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-destructive px-4 font-medium text-destructive-foreground text-sm transition-[background-color,box-shadow,transform,opacity] duration-motion-fast hover:bg-destructive/90 hover:shadow-md active:translate-y-px motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-destructive-foreground border-t-transparent motion-reduce:animate-none"
                />
                <span>ログアウト中...</span>
              </>
            ) : (
              'ログアウト'
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
