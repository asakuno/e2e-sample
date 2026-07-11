import type React from 'react';
import { useActionRunner, type ActionCallback } from '@/components/ui/ActionScope';
import { Button } from '@/components/ui/button';

type ActionButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'asChild' | 'onClick' | 'type'
> & {
  action: ActionCallback;
  pendingLabel?: React.ReactNode;
  disableWhilePending?: boolean;
};

export function ActionButton({
  action,
  pendingLabel,
  children,
  disabled,
  disableWhilePending = true,
  'aria-busy': ariaBusy,
  ...props
}: ActionButtonProps) {
  const { isPending, runAction } = useActionRunner();
  const isDisabled = Boolean(disabled || (disableWhilePending && isPending));

  return (
    <Button
      {...props}
      type="button"
      disabled={isDisabled}
      aria-busy={ariaBusy ?? (isPending || undefined)}
      data-pending={isPending ? 'true' : undefined}
      onClick={() => {
        runAction(action);
      }}
    >
      {isPending && pendingLabel != null ? pendingLabel : children}
    </Button>
  );
}
