/**
 * ログアウト確認モーダルコンポーネント
 *
 * Glassmorphismデザインの確認モーダル。
 * shadcn/ui Dialog をベースにカスタムスタイルを適用。
 */
import { useTransition } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AppIcon } from '@/components/ui/AppIcon';

type LogoutModalProps = {
  open: boolean;
  onClose: () => void;
  action: () => void | Promise<void>;
  processing?: boolean;
};

export function LogoutModal({ open, onClose, action, processing }: LogoutModalProps) {
  const [isPending, startTransition] = useTransition();
  const isProcessing = Boolean(processing || isPending);

  const handleLogout = () => {
    startTransition(async () => {
      await action();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-slate-300/30 backdrop-blur-md"
        className="max-w-[360px] overflow-hidden rounded-[2rem] border-white/60 bg-white/70 p-10 text-center shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1),0_10px_20px_-5px_rgba(0,0,0,0.04),inset_0_0_0_1px_rgba(255,255,255,0.2)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/60 md:p-12"
      >
        {/* トップハイライト線 */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-50" />

        {/* アイコン */}
        <div className="mb-8 flex justify-center text-slate-700 dark:text-slate-200">
          <AppIcon name="logout" className="size-10 opacity-90" />
        </div>

        <DialogTitle className="sr-only">ログアウト確認</DialogTitle>

        {/* 説明文 */}
        <DialogDescription className="mb-10 text-xs font-light leading-7 tracking-wide text-slate-500 dark:text-slate-400">
          ログアウトしてもよろしいですか？
          <br />
          作業内容は自動的に保存されます。
        </DialogDescription>

        {/* ボタン */}
        <div className="flex w-full flex-col items-center gap-5">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isProcessing}
            aria-busy={isProcessing || undefined}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-6 py-3 text-xs font-medium tracking-widest text-white shadow-lg shadow-[#0F172A]/20 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#1E1B4B] dark:shadow-black/40"
          >
            {isProcessing ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>ログアウト中...</span>
              </>
            ) : (
              'ログアウト'
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="border-b border-transparent px-4 py-2 text-xs font-light text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-800 dark:text-slate-500 dark:hover:border-slate-500 dark:hover:text-slate-200"
          >
            キャンセル
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
