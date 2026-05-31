/**
 * 汎用テキスト入力フィールドコンポーネント
 *
 * ラベル、入力欄、エラーメッセージを一体化したプレゼンテーショナルコンポーネント。
 * アクセシビリティ対応（aria-invalid, aria-describedby）。
 */
import type React from 'react';
import { cn } from '@/lib/utils';

interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  placeholder?: string;
  error?: string | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  autoComplete?: string;
  required?: boolean;
}

export function InputField({
  id,
  label,
  type = 'text',
  value,
  placeholder,
  error,
  onChange,
  onBlur,
  autoComplete,
  required,
}: InputFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-medium text-gray-700 text-sm">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'w-full rounded border px-4 py-3 text-gray-600 placeholder-gray-400 shadow-sm focus:outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[#2767cf]',
          error ? 'border-red-500' : 'border-gray-300',
        )}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-red-600 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
