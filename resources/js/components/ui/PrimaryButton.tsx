/**
 * プライマリボタンコンポーネント
 *
 * フォーム送信用の青色ボタン。processing状態とdisabled状態に対応。
 */
import type React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PrimaryButtonProps = Omit<React.ComponentProps<typeof Button>, 'asChild'> & {
  processing?: boolean;
  processingLabel?: React.ReactNode;
};

export function PrimaryButton({
  type = 'submit',
  disabled,
  processing,
  processingLabel = '処理中...',
  children,
  className,
  'aria-busy': ariaBusy,
  ...props
}: PrimaryButtonProps) {
  const isProcessing = Boolean(processing);

  return (
    <Button
      {...props}
      type={type}
      disabled={disabled || isProcessing}
      aria-busy={ariaBusy ?? (isProcessing || undefined)}
      className={cn(
        'h-auto w-full cursor-pointer rounded bg-[#2767cf] px-4 py-3 font-bold text-base text-white shadow-md transition duration-200 hover:bg-blue-700',
        (disabled || isProcessing) && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {isProcessing ? processingLabel : children}
    </Button>
  );
}
