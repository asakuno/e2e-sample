import { usePage } from '@inertiajs/react';
import type React from 'react';
import { cn } from '@/lib/utils';
import type { AppPageProps, Flash } from '@/types/index.d.ts';

type FeedbackMessageProps = {
  message?: string | null | undefined;
  tone: 'success' | 'error';
  className?: string | undefined;
};

const toneClasses = {
  success: 'border-positive/30 bg-positive-muted text-positive',
  error: 'border-negative/30 bg-negative-muted text-negative',
} as const;

export function FeedbackMessage({ message, tone, className }: FeedbackMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-md border px-4 py-3 text-sm leading-6', toneClasses[tone], className)}
    >
      {message}
    </div>
  );
}

type FlashMessagesProps = {
  flash?: Flash | undefined;
  className?: string | undefined;
};

export function FlashMessages({ flash, className }: FlashMessagesProps) {
  if (!flash?.success && !flash?.error) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <FeedbackMessage message={flash.success} tone="success" />
      <FeedbackMessage message={flash.error} tone="error" />
    </div>
  );
}

type SharedFlashMessagesProps = Pick<React.ComponentProps<'div'>, 'className'>;

export function SharedFlashMessages({ className }: SharedFlashMessagesProps) {
  const { props } = usePage<AppPageProps>();

  return <FlashMessages flash={props.flash} className={className} />;
}
