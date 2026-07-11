/**
 * 汎用テキスト入力フィールドコンポーネント
 *
 * ラベル、入力欄、エラーメッセージを一体化したプレゼンテーショナルコンポーネント。
 * アクセシビリティ対応（aria-invalid, aria-describedby）。
 */
import type React from 'react';
import { FieldError, FieldLabel, fieldControlVariants } from '@/components/ui/field';
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
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        {...inputProps}
        id={id}
        aria-invalid={error ? true : ariaInvalid}
        aria-describedby={describedBy || undefined}
        className={cn(fieldControlVariants({ invalid: Boolean(error) }), 'px-4 py-3', className)}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
