/**
 * プライマリボタンコンポーネント
 *
 * フォーム送信用の主要ボタン。processing状態とdisabled状態に対応。
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
        'min-h-12 w-full px-4 py-3 font-semibold text-base',
        (disabled || isProcessing) && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {isProcessing ? processingLabel : children}
    </Button>
  );
}
