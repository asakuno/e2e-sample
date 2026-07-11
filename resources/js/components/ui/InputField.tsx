/**
 * 汎用テキスト入力フィールドコンポーネント
 *
 * ラベル、入力欄、エラーメッセージを一体化したプレゼンテーショナルコンポーネント。
 * アクセシビリティ対応（aria-invalid, aria-describedby）。
 */
import type React from 'react';
import { cn } from '@/lib/utils';

type InputFieldProps = Omit<React.ComponentPropsWithoutRef<'input'>, 'id'> & {
  id: string;
  label: React.ReactNode;
  error?: string | undefined;
};

export function InputField({
  id,
  label,
  error,
  className,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...inputProps
}: InputFieldProps) {
  const errorId = `${id}-error`;
  const describedBy = [ariaDescribedBy, error ? errorId : undefined].filter(Boolean).join(' ');

  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-medium text-gray-700 text-sm">
        {label}
      </label>
      <input
        {...inputProps}
        id={id}
        aria-invalid={error ? true : ariaInvalid}
        aria-describedby={describedBy || undefined}
        className={cn(
          'w-full rounded border px-4 py-3 text-gray-600 placeholder-gray-400 shadow-sm focus:outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[#2767cf]',
          error ? 'border-red-500' : 'border-gray-300',
          className,
        )}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-red-600 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
