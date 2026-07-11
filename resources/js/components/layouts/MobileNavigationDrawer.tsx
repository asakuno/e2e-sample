import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type MobileNavigationDrawerProps = {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * モバイル用ナビゲーションの制御可能な表示コンポーネント。
 * フォーカス管理と Escape キー処理だけを担当し、ナビゲーション内容は children で受け取る。
 */
export function MobileNavigationDrawer({
  children,
  open,
  onOpenChange,
}: MobileNavigationDrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    const desktopMediaQuery = window.matchMedia?.('(min-width: 64rem)');

    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const closeAtDesktop = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) {
        onOpenChange(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    desktopMediaQuery?.addEventListener('change', closeAtDesktop);
    if (desktopMediaQuery) {
      closeAtDesktop(desktopMediaQuery);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      desktopMediaQuery?.removeEventListener('change', closeAtDesktop);
      document.body.style.overflow = previousBodyOverflow;

      if (previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus();
      }
    };
  }, [open, onOpenChange]);

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={cn(
        'fixed inset-0 z-40 lg:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="ナビゲーションの背景を閉じる"
        onClick={() => onOpenChange(false)}
        className={cn(
          'absolute inset-0 min-h-11 min-w-11 bg-overlay transition-opacity duration-motion-normal motion-reduce:transition-none',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        id="mobile-navigation"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="メインメニュー"
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 left-0 w-[min(20rem,calc(100%-3rem))] border-sidebar-border border-r bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-motion-normal motion-reduce:transition-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {children}
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="メニューを閉じる"
          onClick={() => onOpenChange(false)}
          className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-lg text-sidebar-foreground transition-[background-color,color,transform] duration-motion-fast hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:translate-y-px motion-reduce:active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
    </div>
  );
}
