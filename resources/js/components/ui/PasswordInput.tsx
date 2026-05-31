/**
 * パスワード入力コンポーネント
 *
 * 目アイコンによる表示/非表示トグル付きのパスワード入力フィールド。
 * アクセシビリティ対応（aria-label, aria-invalid, aria-describedby）。
 */
import type React from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  error?: string | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  autoComplete?: string;
  required?: boolean;
}

export function PasswordInput({
  id,
  label,
  value,
  placeholder,
  error,
  onChange,
  onBlur,
  autoComplete,
  required,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-medium text-gray-700 text-sm">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'w-full rounded border px-4 py-3 pr-12 text-gray-600 shadow-sm focus:outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[#2767cf]',
            error ? 'border-red-500' : 'border-gray-300',
          )}
        />
        <button
          type="button"
          aria-label={visible ? 'パスワードを非表示' : 'パスワードを表示'}
          onClick={() => setVisible(!visible)}
          className="absolute top-1/2 right-2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
        >
          {/* 目アイコン SVG */}
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {visible ? (
              <>
                {/* 目を閉じるアイコン */}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </>
            ) : (
              <>
                {/* 目を開くアイコン */}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </>
            )}
          </svg>
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-red-600 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
