/**
 * プライマリボタンコンポーネント
 *
 * フォーム送信用の青色ボタン。processing状態とdisabled状態に対応。
 */
import type React from 'react';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';

interface PrimaryButtonProps {
  type?: 'button' | 'submit';
  disabled?: boolean;
  processing?: boolean;
  processingLabel?: string;
  children: React.ReactNode;
  className?: string;
  action?: () => void | Promise<void>;
}

export function PrimaryButton({
  type = 'submit',
  disabled,
  processing,
  processingLabel = '処理中...',
  children,
  className,
  action,
}: PrimaryButtonProps) {
  const [isPending, startTransition] = useTransition();
  const isProcessing = Boolean(processing || isPending);

  const handleClick = () => {
    if (!action) return;

    startTransition(async () => {
      await action();
    });
  };

  return (
    <button
      type={action ? 'button' : type}
      disabled={disabled || isProcessing}
      aria-busy={isProcessing || undefined}
      onClick={handleClick}
      className={cn(
        'w-full cursor-pointer rounded bg-[#2767cf] px-4 py-3 font-bold text-white shadow-md transition duration-200 hover:bg-blue-700',
        (disabled || isProcessing) && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {isProcessing ? processingLabel : children}
    </button>
  );
}
