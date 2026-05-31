/**
 * プライマリボタンコンポーネント
 *
 * フォーム送信用の青色ボタン。processing状態とdisabled状態に対応。
 */
import type React from 'react';
import { cn } from '@/lib/utils';

interface PrimaryButtonProps {
  type?: 'button' | 'submit';
  disabled?: boolean;
  processing?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function PrimaryButton({
  type = 'submit',
  disabled,
  processing,
  children,
  className,
  onClick,
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || processing}
      aria-busy={processing || undefined}
      onClick={onClick}
      className={cn(
        'w-full cursor-pointer rounded bg-[#2767cf] px-4 py-3 font-bold text-white shadow-md transition duration-200 hover:bg-blue-700',
        (disabled || processing) && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {processing ? '処理中...' : children}
    </button>
  );
}
