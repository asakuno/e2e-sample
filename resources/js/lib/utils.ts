import { type ClassValue, clsx } from 'clsx';

/**
 * クラス名を結合するユーティリティ関数
 *
 * clsxを使用して条件付きクラス名を効率的に結合します。
 *
 * @example
 * ```tsx
 * <button className={cn(
 *   'rounded-md px-4 py-2',
 *   variant === 'primary' && 'bg-blue-500 text-white',
 *   variant === 'secondary' && 'bg-gray-200 text-gray-800',
 *   disabled && 'cursor-not-allowed opacity-50',
 * )}>
 *   {children}
 * </button>
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs);
}
